import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';

import { app } from './ウェブサーバー.js';

// 画面が前提にしているものと、実際に用意されているものがずれていないかを、
// ブラウザを開かずに確かめる。
//
// 手で確認していて漏れやすいのは次の2つ。
//   - HTMLから要素を消した／id名を変えたのに、game.js が古いidを掴んでいる
//   - サーバーが送る項目名を変えたのに、game.js が古い名前を読んでいる
// どちらも実行時まで気づけず、しかも「その画面を開いたときだけ」壊れる。

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 公開ディレクトリ = path.resolve(ここ, '../../public');

function 読む(ファイル名: string): string {
  return readFileSync(path.join(公開ディレクトリ, ファイル名), 'utf-8');
}

// === 要素idの照合 ===

test('game.js が掴む要素idが、すべて index.html に存在する', () => {
  const スクリプト = 読む('game.js');
  const HTML = 読む('index.html');

  // el('xxx') と getElementById('xxx') の両方を拾う
  const 参照されたid = new Set<string>();
  for (const 一致 of スクリプト.matchAll(/\bel\(\s*'([^']+)'\s*\)/g)) {
    参照されたid.add(一致[1]);
  }
  for (const 一致 of スクリプト.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
    参照されたid.add(一致[1]);
  }

  assert.ok(参照されたid.size > 0, '要素の参照が1つも見つからない（抽出が壊れている）');

  const 存在するid = new Set<string>();
  for (const 一致 of HTML.matchAll(/\bid="([^"]+)"/g)) {
    存在するid.add(一致[1]);
  }

  const 見つからないid = [...参照されたid].filter(id => !存在するid.has(id));
  assert.deepEqual(
    見つからないid,
    [],
    `game.js が参照しているが index.html に無いid: ${見つからないid.join(', ')}`
  );
});

test('game.js と index.html が使うCSSクラスが、game.css に定義されている', () => {
  const スクリプト = 読む('game.js');
  const HTML = 読む('index.html');
  const スタイル = 読む('game.css');

  const 使うクラス = new Set<string>();

  // classList.add(...) の中に直接書かれた文字列（三項演算子の両辺も拾える）
  for (const 呼び出し of スクリプト.matchAll(/classList\.add\(([^)]*)\)/g)) {
    for (const 文字列 of 呼び出し[1].matchAll(/'([^'${}]+)'/g)) {
      文字列[1].split(/\s+/).filter(Boolean).forEach(名 => 使うクラス.add(名));
    }
  }
  // className = '...' の代入
  for (const 一致 of スクリプト.matchAll(/className\s*=\s*'([^'${}]+)'/g)) {
    一致[1].split(/\s+/).filter(Boolean).forEach(名 => 使うクラス.add(名));
  }
  // 生成するHTML片・index.html の class 属性（${} を含む動的なものは除く）
  for (const 本文 of [スクリプト, HTML]) {
    for (const 一致 of 本文.matchAll(/class="([^"${}]+)"/g)) {
      一致[1].split(/\s+/).filter(Boolean).forEach(名 => 使うクラス.add(名));
    }
  }

  assert.ok(使うクラス.size > 0, 'クラスの指定が1つも見つからない（抽出が壊れている）');

  // querySelector で掴むためだけのクラス（deck-btn など）は見た目を持たなくてよい。
  // これを除かないと「スタイルの無いクラス＝間違い」と誤判定してしまう。
  const 選択用フック = new Set<string>();
  for (const 一致 of スクリプト.matchAll(/querySelector(?:All)?\(\s*'([^']+)'/g)) {
    for (const クラス of 一致[1].matchAll(/\.([\w-]+)/g)) {
      選択用フック.add(クラス[1]);
    }
  }

  const 見つからないクラス = [...使うクラス].filter(
    クラス => !選択用フック.has(クラス) && !スタイル.includes(`.${クラス}`)
  );
  assert.deepEqual(
    見つからないクラス,
    [],
    `画面が付けるが game.css にもJSの選択にも無いクラス: ${見つからないクラス.join(', ')}`
  );
});

// === 状態の項目名の照合 ===

test('game.js が読む状態の項目を、サーバーがすべて送っている', async () => {
  const サーバー: Server = await new Promise(解決 => {
    const s = app.listen(0, () => 解決(s));
  });
  const アドレス = サーバー.address();
  if (!アドレス || typeof アドレス === 'string') {
    throw new Error('ポートを取得できませんでした');
  }
  const 基準URL = `http://127.0.0.1:${アドレス.port}`;

  try {
    const 応答 = await fetch(`${基準URL}/api/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vsAI', deck: 'effect' }),
    });
    const 本文 = (await 応答.json()) as any;
    const 状態 = 本文.state;

    const スクリプト = 読む('game.js');

    // state.項目 / lastState.項目 の形で読んでいる最上位の項目名を拾う
    const 読む項目 = new Set<string>();
    for (const 一致 of スクリプト.matchAll(
      /\b(?:state|lastState)\.([A-Za-z_$぀-ヿ一-鿿][\w$぀-ヿ一-鿿]*)/g
    )) {
      読む項目.add(一致[1]);
    }

    assert.ok(読む項目.size > 0, '状態の参照が1つも見つからない（抽出が壊れている）');

    const 無い項目 = [...読む項目].filter(項目 => !(項目 in 状態));
    assert.deepEqual(
      無い項目,
      [],
      `game.js が読むが状態に無い項目: ${無い項目.join(', ')}`
    );
  } finally {
    await new Promise<void>(解決 => サーバー.close(() => 解決()));
  }
});

test('画面が送るAPIのパスが、すべてサーバーに存在する', async () => {
  const サーバー: Server = await new Promise(解決 => {
    const s = app.listen(0, () => 解決(s));
  });
  const アドレス = サーバー.address();
  if (!アドレス || typeof アドレス === 'string') {
    throw new Error('ポートを取得できませんでした');
  }
  const 基準URL = `http://127.0.0.1:${アドレス.port}`;

  try {
    const スクリプト = 読む('game.js');

    // api('POST', '/api/...') の呼び出しからパスを拾う
    const 送るパス = new Set<string>();
    for (const 一致 of スクリプト.matchAll(/api\(\s*'(GET|POST)'\s*,\s*[`']([^`'?]+)/g)) {
      送るパス.add(`${一致[1]} ${一致[2]}`);
    }

    assert.ok(送るパス.size > 0, 'API呼び出しが1つも見つからない（抽出が壊れている）');

    // 未知のパスなら404、既知なら（引数が不正でも）400などが返る。
    // 404かどうかだけを見て、経路の有無を判定する。
    const 存在しないパス: string[] = [];
    for (const 項目 of 送るパス) {
      const [メソッド, パス] = 項目.split(' ');
      const 応答 = await fetch(`${基準URL}${パス}`, {
        method: メソッド,
        headers: { 'Content-Type': 'application/json' },
        body: メソッド === 'POST' ? JSON.stringify({}) : undefined,
      });
      if (応答.status === 404) {
        存在しないパス.push(項目);
      }
    }

    assert.deepEqual(
      存在しないパス,
      [],
      `画面が叩くがサーバーに無い経路: ${存在しないパス.join(', ')}`
    );
  } finally {
    await new Promise<void>(解決 => サーバー.close(() => 解決()));
  }
});
