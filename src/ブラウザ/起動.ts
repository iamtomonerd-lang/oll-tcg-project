// ブラウザの入り口
//
// サーバーを立てずに、ページの中だけでゲームを動かすための差し込み。
//
// 画面（public/game.js・public/layout.js）は fetch('/api/...') で
// サーバーと話す書き方のままにしてある。ここで fetch を包んで、
// /api/ 宛てだけを アプリ/ゲームAPI.ts に横流しする。
// そうすると画面側は1行も変えずに、通信ありでもなしでも同じように動く。
//
// このファイルは古い書き方（IIFE）で1枚にまとめてから読み込む。
// module にすると読み込みが後回しになり、game.js のほうが先に走ってしまうため。

import { 処理する, 配置保管庫, 配置保管庫を設定する } from '../アプリ/ゲームAPI.js';

// === 版の印 ===
//
// ビルド時に scripts/ブラウザ用にまとめる.mjs が中身を差し込む。
// 「今動いているコードがどれか」を、動いているコード自身が名乗れるようにするためのもの。
// 画面はこれと public/版.json を見比べて、新しい版が出ていれば知らせる。
declare const __版__: { 印: string; 日時: string; 件名: string };

// === 配置の保管先 ===
//
// サーバーが無いので、ファイルの代わりに localStorage に残す。
// ゲーム本体とは別の場所なので、更新しても調整が消えない
// （ファイルに残していたときと同じ狙い）。
const 保存キー = 'oll-tcg:レイアウト';

const ブラウザ配置保管庫: 配置保管庫 = {
  読み込む() {
    try {
      const 中身 = localStorage.getItem(保存キー);
      return 中身 ? JSON.parse(中身) : null;
    } catch {
      return null;
    }
  },
  保存する(配置: unknown) {
    localStorage.setItem(保存キー, JSON.stringify(配置));
  },
  消す() {
    localStorage.removeItem(保存キー);
  },
};

// === fetch を包む ===

const 元のfetch = window.fetch.bind(window);

function APIへの呼び出しか(入力: RequestInfo | URL): string | null {
  const 文字列 =
    typeof 入力 === 'string' ? 入力 : 入力 instanceof URL ? 入力.href : (入力 as Request).url;
  if (!文字列) return null;
  // 絶対URLでも相対URLでも、道が /api/ で始まるものだけを受け持つ
  const 道 = 文字列.startsWith('http') ? new URL(文字列).pathname + new URL(文字列).search : 文字列;
  return 道.startsWith('/api/') ? 道 : null;
}

async function 本体を読む(入力: RequestInfo | URL, 設定?: RequestInit): Promise<unknown> {
  const 生 = 設定?.body ?? (入力 instanceof Request ? await 入力.clone().text() : undefined);
  if (typeof 生 !== 'string' || 生 === '') return undefined;
  try {
    return JSON.parse(生);
  } catch {
    return undefined;
  }
}

window.fetch = async function 包んだfetch(
  入力: RequestInfo | URL,
  設定?: RequestInit
): Promise<Response> {
  const 道 = APIへの呼び出しか(入力);
  if (道 === null) {
    return 元のfetch(入力 as RequestInfo, 設定);
  }

  const メソッド = 設定?.method ?? (入力 instanceof Request ? 入力.method : 'GET');
  const 本体 = await 本体を読む(入力, 設定);

  let 応答;
  try {
    応答 = 処理する(メソッド, 道, 本体);
  } catch (e) {
    // ゲーム側で予期しない失敗が出ても、画面が固まらないようにする
    console.error('ゲームAPIで例外が出ました', e);
    応答 = {
      状態番号: 500,
      本体: { ok: false, error: '内部でエラーが起きました（再読み込みしてください）' },
    };
  }

  return new Response(JSON.stringify(応答.本体), {
    status: 応答.状態番号,
    headers: { 'Content-Type': 'application/json' },
  });
};

配置保管庫を設定する(ブラウザ配置保管庫);

// 今動いているコードの版。画面（版表示.js）がこれを読む。
(window as any).この版 = typeof __版__ === 'undefined' ? null : __版__;

// 開発時に様子を見られるようにしておく
(window as any).ゲームAPI = { 処理する };
