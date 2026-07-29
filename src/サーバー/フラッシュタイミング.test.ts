import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

import { app } from './ウェブサーバー.js';

// バトル中の割り込みの窓（フラッシュタイミング）の決まりごとを固定する。
//   8-1-2 アタック宣言のあと、防御側から順に割り込める
//   8-1-4 ブロック宣言のあと、もう一度割り込める
// どちらも2回続けてパスしたら閉じ、バトルの解決へ進む。

let サーバー: Server;
let 基準URL: string;

async function 起動(): Promise<void> {
  await new Promise<void>(解決 => {
    サーバー = app.listen(0, () => 解決());
  });
  const アドレス = サーバー.address();
  if (!アドレス || typeof アドレス === 'string') {
    throw new Error('ポートを取得できませんでした');
  }
  基準URL = `http://127.0.0.1:${アドレス.port}`;
}

async function 停止(): Promise<void> {
  await new Promise<void>(解決 => サーバー.close(() => 解決()));
}

async function 叩く(メソッド: 'GET' | 'POST', パス: string, 本文?: unknown): Promise<any> {
  const 応答 = await fetch(`${基準URL}${パス}`, {
    method: メソッド,
    headers: 本文 ? { 'Content-Type': 'application/json' } : undefined,
    body: 本文 ? JSON.stringify(本文) : undefined,
  });
  return 応答.json();
}

async function 状態(視点: string): Promise<any> {
  return (await 叩く('GET', `/api/game/state?as=${視点}`)).state;
}

// 2人対戦で開始し、誰かがアタックできる場面まで進める。
//
// 先攻の第1ターンはアタックステップが飛ばされる（正しいルール）ので、
// 単純にステップを送るだけでは到達しない。実行者を追いながら、
// 召喚とステップ送りを繰り返してアタックステップまで進む。
interface アタック直前 {
  攻撃側: string;
  防御側: string;
  アタッカー識別子: string;
}

async function アタックまで進める(): Promise<アタック直前> {
  await 叩く('POST', '/api/game/start', { mode: 'vsHuman', deck: 'effect' });

  let 視点 = 'p1';
  for (let 安全 = 0; 安全 < 60; 安全++) {
    const s = await 状態(視点);

    // 実行者が変わったら視点を移す（画面の受け渡しと同じ）
    if (!s.自分が実行者か) {
      視点 = s.実行者識別子;
      continue;
    }

    // 効果の選択待ちなら答えて先へ進む
    if (s.保留中の効果) {
      const { 対象候補一覧, 最小 } = s.保留中の効果;
      await 叩く('POST', '/api/action/select-effect-target', {
        as: 視点,
        targetCardIds: 対象候補一覧.slice(0, 最小).map((c: any) => c.識別子),
      });
      continue;
    }

    if (s.ステップ === 'アタックステップ') {
      const 攻撃できる = s.自分.フィールド.filter(
        (c: any) => c.種別 === 'スピリット' && c.表示形式 === '回復' && !c.待機状態
      );
      if (攻撃できる.length > 0) {
        return {
          攻撃側: 視点,
          防御側: 視点 === 'p1' ? 'p2' : 'p1',
          アタッカー識別子: 攻撃できる[0].識別子,
        };
      }
      await 叩く('POST', '/api/action/end-step', { as: 視点 });
      continue;
    }

    if (s.ステップ === 'メインステップ' || s.ステップ === '第2メインステップ') {
      const 出せる = (s.自分.手札 ?? []).filter(
        (c: any) => c.支払可能 && c.種別 === 'スピリット'
      );
      if (出せる.length > 0) {
        await 叩く('POST', '/api/action/summon', { as: 視点, cardId: 出せる[0].識別子 });
        continue;
      }
    }

    await 叩く('POST', '/api/action/end-step', { as: 視点 });
  }
  throw new Error('アタックできる場面まで進めなかった');
}

test('割り込みの窓', async t => {
  await 起動();

  await t.test('アタック宣言のあとに窓が開き、防御側から判断する', async () => {
    const { 攻撃側, 防御側, アタッカー識別子 } = await アタックまで進める();
    const 後 = (
      await 叩く('POST', '/api/action/attack', { as: 攻撃側, cardId: アタッカー識別子 })
    ).state;

    // 攻撃した側から見ると、まだ自分の番ではない（防御側から始まる）
    assert.equal(後.保留中のフラッシュ, null, '攻撃側にはまだ権利が無い');
    assert.equal(後.実行者識別子, 防御側, '防御側から判断する');

    const 防御側の状態 = await 状態(防御側);
    assert.ok(防御側の状態.保留中のフラッシュ, '防御側に窓が開いている');
    assert.equal(防御側の状態.保留中のフラッシュ.段階, 'アタック後');
    assert.equal(防御側の状態.自分が実行者か, true);
  });

  await t.test('パスすると権利が相手へ移る', async () => {
    const { 攻撃側, 防御側, アタッカー識別子 } = await アタックまで進める();
    await 叩く('POST', '/api/action/attack', { as: 攻撃側, cardId: アタッカー識別子 });

    const 一度目 = (await 叩く('POST', '/api/action/flash-pass', { as: 防御側 })).state;
    assert.equal(一度目.実行者識別子, 攻撃側, 'パスで攻撃側に権利が移る');

    const 攻撃側の状態 = await 状態(攻撃側);
    assert.ok(攻撃側の状態.保留中のフラッシュ, '攻撃側にも窓が回ってくる');
  });

  await t.test('2回続けてパスすると窓が閉じ、次へ進む', async () => {
    const { 攻撃側, 防御側, アタッカー識別子 } = await アタックまで進める();
    await 叩く('POST', '/api/action/attack', { as: 攻撃側, cardId: アタッカー識別子 });
    await 叩く('POST', '/api/action/flash-pass', { as: 防御側 });
    const 後 = (await 叩く('POST', '/api/action/flash-pass', { as: 攻撃側 })).state;

    assert.equal(後.保留中のフラッシュ, null, 'この視点の窓は閉じている');

    // ブロックできる相手がいればブロック判断、いなければバトルが解決している
    const 防御側の状態 = await 状態(防御側);
    const ブロック待ちか = 防御側の状態.保留中のブロック !== null;
    const 窓が残っていないか =
      防御側の状態.保留中のフラッシュ === null && 後.保留中のフラッシュ === null;
    assert.ok(
      ブロック待ちか || 窓が残っていないか,
      'ブロック判断かバトル解決のどちらかへ進む'
    );
  });

  await t.test('権利の無い側はパスできない', async () => {
    const { 攻撃側, アタッカー識別子 } = await アタックまで進める();
    await 叩く('POST', '/api/action/attack', { as: 攻撃側, cardId: アタッカー識別子 });

    // 最初の権利は防御側にある
    const 結果 = await 叩く('POST', '/api/action/flash-pass', { as: 攻撃側 });
    assert.equal(結果.ok, false, '攻撃側は先にパスできない');
  });

  await t.test('割り込みの場面でないならパスできない', async () => {
    await 叩く('POST', '/api/game/start', { mode: 'vsHuman', deck: 'effect' });
    const 結果 = await 叩く('POST', '/api/action/flash-pass', { as: 'p1' });
    assert.equal(結果.ok, false);
  });

  await 停止();
});

test('割り込みの窓で【起動】効果が撃てる', async () => {
  await 起動();

  try {
    const { 攻撃側, 防御側, アタッカー識別子 } = await アタックまで進める();
    await 叩く('POST', '/api/action/attack', { as: 攻撃側, cardId: アタッカー識別子 });

    // 防御側がパスすると、アタックしている側に権利が回る
    await 叩く('POST', '/api/action/flash-pass', { as: 防御側 });
    const 攻撃側の状態 = await 状態(攻撃側);

    assert.ok(攻撃側の状態.保留中のフラッシュ, '攻撃側に窓が開いている');

    const アタッカー = 攻撃側の状態.自分.フィールド.find(
      (c: any) => c.識別子 === アタッカー識別子
    );
    assert.ok(アタッカー, 'アタッカーが場にいる');

    // 【起動：フラッシュ】が候補に出るのは、アタック中のこの瞬間だけ。
    // 窓が無かった頃はここに到達できなかった。
    if (攻撃側の状態.発動できる起動効果.length > 0) {
      const 効果 = 攻撃側の状態.発動できる起動効果[0];
      const 結果 = await 叩く('POST', '/api/action/activate-effect', {
        as: 攻撃側,
        effectId: 効果.効果識別子,
      });
      assert.equal(結果.ok, true, '割り込み中に起動効果を撃てる');
    }
  } finally {
    await 停止();
  }
});
