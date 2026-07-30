import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

import { app } from './ウェブサーバー.js';

// UIの代わりにAPIを叩いて対戦を最後まで自動で進める。
//
// 手でクリックして確かめていたことを、機械に何百手も繰り返させるのが目的。
// これまで実際に出たバグ（実行者が違う相手になる／選択待ちで進行が止まる）は
// すべて画面ではなく「状態の中身」の問題だったので、状態が満たすべき約束事を
// 1手ごとに検査する。約束が破れた瞬間に、どの手で壊れたかが分かる。

// === サーバーを立てる ===

let サーバー: Server;
let 基準URL: string;

async function サーバーを起動する(): Promise<void> {
  await new Promise<void>(解決 => {
    サーバー = app.listen(0, () => 解決());
  });
  const アドレス = サーバー.address();
  if (!アドレス || typeof アドレス === 'string') {
    throw new Error('ポートを取得できませんでした');
  }
  基準URL = `http://127.0.0.1:${アドレス.port}`;
}

async function サーバーを止める(): Promise<void> {
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

// === 状態が常に満たすべき約束事 ===

function 不変条件を検査する(状態: any, 手順: string): void {
  const 場所 = `[${手順}]`;

  // 入力待ちは同時に2つ発生しない。両方出ると画面がどちらを出すか決められない。
  if (状態.保留中の効果 && 状態.保留中のブロック) {
    assert.fail(`${場所} 効果の対象選択とブロック判断が同時に発生している`);
  }

  // 待っている本人が実行者として報告されること。
  // ここが崩れると、2人対戦で画面が違うプレイヤーに渡る。
  if (状態.保留中の効果) {
    assert.equal(
      状態.自分が実行者か,
      true,
      `${場所} 効果の選択を待っているのに、この視点が実行者になっていない`
    );
  }
  if (状態.保留中のブロック) {
    assert.equal(
      状態.自分が実行者か,
      true,
      `${場所} ブロック判断を待っているのに、この視点が実行者になっていない`
    );
  }
  if (状態.保留中のフラッシュ) {
    assert.equal(
      状態.自分が実行者か,
      true,
      `${場所} 割り込みの判断を待っているのに、この視点が実行者になっていない`
    );
  }

  // 選択待ちの最中に別の行動を勧めない
  if (状態.保留中の効果) {
    assert.deepEqual(
      状態.発動できる起動効果,
      [],
      `${場所} 対象選択の最中に起動効果を撃たせようとしている`
    );
  }

  // 選べるものが無いのに待つのは不正。画面に空の選択肢が出てしまう。
  if (状態.保留中の効果) {
    const 候補数 = 状態.保留中の効果.対象候補一覧.length;
    assert.ok(候補数 > 0, `${場所} 候補が空なのに選択待ちになっている`);

    const { 最小, 最大 } = 状態.保留中の効果;
    assert.ok(最小 >= 0, `${場所} 最小選択数が負`);
    assert.ok(最小 <= 最大, `${場所} 最小選択数が最大を超えている`);
    assert.ok(最大 <= 候補数, `${場所} 最大選択数が候補数を超えている`);
  }

  // 決着後に入力待ちが残っていると、決着画面から先に進めなくなる
  if (状態.試合終了か) {
    assert.equal(状態.保留中の効果, null, `${場所} 試合終了後に選択待ちが残っている`);
    assert.equal(状態.保留中のブロック, null, `${場所} 試合終了後にブロック待ちが残っている`);
    assert.equal(状態.保留中のフラッシュ, null, `${場所} 試合終了後に割り込み待ちが残っている`);
  }

  // 画面が必ず読む項目が欠けていないこと
  for (const 項目 of ['自分', '相手', 'ステップ', '発動できる起動効果']) {
    assert.ok(項目 in 状態, `${場所} 状態に ${項目} が無い`);
  }
}

// === 疑似乱数（失敗を再現できるよう種を固定する） ===

function 乱数を作る(種: number): () => number {
  let 状態 = 種 >>> 0;
  return () => {
    状態 = (状態 * 1664525 + 1013904223) >>> 0;
    return 状態 / 0x100000000;
  };
}

function ひとつ選ぶ<T = any>(一覧: T[], 乱数: () => number): T {
  return 一覧[Math.floor(乱数() * 一覧.length)];
}

// === 対戦を自動で進める ===

interface 対戦結果 {
  手数: number;
  決着した: boolean;
  選択待ちに遭遇した回数: number;
  起動効果を撃った回数: number;
  操作の内訳: Record<string, number>;
}

// 画面がやっていることと同じ判断で、次の1手を選んで送る
async function 自動で対戦する(
  モード: 'vsAI' | 'vsHuman',
  デッキ: string,
  種: number,
  最大手数 = 400
): Promise<対戦結果> {
  const 乱数 = 乱数を作る(種);
  let 視点 = 'p1';

  let 状態 = (await 叩く('POST', '/api/game/start', { mode: モード, deck: デッキ })).state;
  不変条件を検査する(状態, `開始 種=${種}`);

  let 選択待ち回数 = 0;
  let 起動回数 = 0;
  let 手数 = 0;
  const 操作の内訳: Record<string, number> = {};

  for (; 手数 < 最大手数; 手数++) {
    if (状態.試合終了か) {
      return {
        手数,
        決着した: true,
        選択待ちに遭遇した回数: 選択待ち回数,
        起動効果を撃った回数: 起動回数,
        操作の内訳,
      };
    }

    // 2人対戦では、実行者が変わったら画面を渡す（game.js と同じ挙動）
    if (モード === 'vsHuman' && !状態.自分が実行者か) {
      視点 = 状態.実行者識別子;
      状態 = (await 叩く('GET', `/api/game/state?as=${視点}`)).state;
      不変条件を検査する(状態, `視点切替 手${手数}`);
      continue;
    }

    const 応答 = await 次の1手を送る(状態, 視点, 乱数);
    if (!応答) {
      // 送れる手が無い＝進行が詰まっている
      assert.fail(`手${手数} 種=${種}: 送れる操作が無い（ステップ=${状態.ステップ}）`);
    }
    操作の内訳[応答.種別] = (操作の内訳[応答.種別] ?? 0) + 1;
    if (応答.種別 === '選択') 選択待ち回数++;
    if (応答.種別 === '起動') 起動回数++;

    assert.ok(応答.結果.ok, `手${手数} 種=${種}: ${応答.種別} が拒否された（${応答.結果.error}）`);
    状態 = 応答.結果.state;
    不変条件を検査する(状態, `手${手数} 種=${種} 直後の操作=${応答.種別}`);
  }

  return {
    手数,
    決着した: false,
    選択待ちに遭遇した回数: 選択待ち回数,
    起動効果を撃った回数: 起動回数,
    操作の内訳,
  };
}

async function 次の1手を送る(
  状態: any,
  視点: string,
  乱数: () => number
): Promise<{ 種別: string; 結果: any } | null> {
  // 1. 効果の対象選択が最優先
  if (状態.保留中の効果) {
    const { 対象候補一覧, 最小, 最大 } = 状態.保留中の効果;
    const 選ぶ数 = 最小 + Math.floor(乱数() * (最大 - 最小 + 1));
    const 選択 = [...対象候補一覧]
      .sort(() => 乱数() - 0.5)
      .slice(0, 選ぶ数)
      .map((c: any) => c.識別子);
    return {
      種別: '選択',
      結果: await 叩く('POST', '/api/action/select-effect-target', {
        as: 視点,
        targetCardIds: 選択,
      }),
    };
  }

  // 2. ブロック判断
  if (状態.保留中のブロック) {
    // ブロックもスピリットだけ
    const 候補 = 状態.自分.フィールド.filter(
      (c: any) => c.種別 === 'スピリット' && c.表示形式 === '回復'
    );
    const ブロッカー =
      候補.length > 0 && 乱数() < 0.5 ? ひとつ選ぶ<any>(候補, 乱数).識別子 : null;
    return {
      種別: 'ブロック',
      結果: await 叩く('POST', '/api/action/block', { as: 視点, cardId: ブロッカー }),
    };
  }

  // 3. 起動効果はときどき撃つ
  if (状態.発動できる起動効果.length > 0 && 乱数() < 0.6) {
    const 効果 = ひとつ選ぶ<any>(状態.発動できる起動効果, 乱数);
    return {
      種別: '起動',
      結果: await 叩く('POST', '/api/action/activate-effect', {
        as: 視点,
        effectId: 効果.効果識別子,
      }),
    };
  }

  // 4. 割り込みの窓。撃つものが無ければパスする。
  if (状態.保留中のフラッシュ) {
    return {
      種別: 'フラッシュパス',
      結果: await 叩く('POST', '/api/action/flash-pass', { as: 視点 }),
    };
  }

  // 4. メインステップなら召喚を試す。
  //    メイン1で全部出してしまうと、アタックで自分のスピリットが疲労した状態を
  //    前提とする効果（ロワミークなど）の場面に入らないため、
  //    メイン1では控えめに、第2メインでは積極的に出す。
  const 召喚する確率 =
    状態.ステップ === 'メインステップ' ? 0.25 : 状態.ステップ === '第2メインステップ' ? 0.9 : 0;
  if (召喚する確率 > 0) {
    const 出せる手札 = (状態.自分.手札 ?? []).filter((c: any) => c.支払可能);
    if (出せる手札.length > 0 && 乱数() < 召喚する確率) {
      const カード = ひとつ選ぶ<any>(出せる手札, 乱数);
      // 画面と同じく、カード種別で送り先を変える
      const 送り先 =
        カード.種別 === 'ネクサス'
          ? '/api/action/place'
          : カード.種別 === 'マジック'
            ? '/api/action/use'
            : '/api/action/summon';
      const 種別名 =
        カード.種別 === 'ネクサス' ? '配置' : カード.種別 === 'マジック' ? '使用' : '召喚';
      return {
        種別: 種別名,
        結果: await 叩く('POST', 送り先, { as: 視点, cardId: カード.識別子 }),
      };
    }
  }

  // 5. アタックステップなら攻撃を試す
  if (状態.ステップ === 'アタックステップ') {
    // ネクサスは攻撃できないのでスピリットに限る
    const 攻撃できる = 状態.自分.フィールド.filter(
      (c: any) => c.種別 === 'スピリット' && c.表示形式 === '回復' && !c.待機状態
    );
    if (攻撃できる.length > 0 && 乱数() < 0.8) {
      const カード = ひとつ選ぶ<any>(攻撃できる, 乱数);
      return {
        種別: 'アタック',
        結果: await 叩く('POST', '/api/action/attack', { as: 視点, cardId: カード.識別子 }),
      };
    }
  }

  // 6. それ以外はステップを終える
  return {
    種別: 'ステップ終了',
    結果: await 叩く('POST', '/api/action/end-step', { as: 視点 }),
  };
}

// === テスト本体 ===

test('APIを通した自動対戦', async t => {
  await サーバーを起動する();

  await t.test('AI戦：種を変えて何度対戦しても、約束事が破れず決着する', async () => {
    for (const 種 of [1, 7, 42, 1234, 99999]) {
      const 結果 = await 自動で対戦する('vsAI', 'gungata', 種);
      assert.equal(結果.決着した, true, `種=${種} で決着しなかった（${結果.手数}手で打ち切り）`);
    }
  });

  await t.test('2人対戦：画面の受け渡しを繰り返しても、約束事が破れず決着する', async () => {
    for (const 種 of [3, 21, 555]) {
      const 結果 = await 自動で対戦する('vsHuman', 'gungata', 種);
      assert.equal(結果.決着した, true, `種=${種} で決着しなかった（${結果.手数}手で打ち切り）`);
    }
  });

  await t.test('どのデッキでも成立する', async () => {
    for (const デッキ of ['gungata', 'genbo', 'mushaako', 'effect', 'purple']) {
      const 結果 = await 自動で対戦する('vsAI', デッキ, 2024);
      assert.equal(結果.決着した, true, `デッキ=${デッキ} で決着しなかった`);
    }
  });

  await t.test('自動対戦が主要な操作を実際に通っている', async () => {
    // 約束事を検査していても、その場面を一度も通らなければ意味がない。
    // カード3種類（召喚・配置・使用）と効果の道を実際に踏んでいることを確かめる。
    const 合計: Record<string, number> = {};
    for (const 種 of [11, 22, 33, 44, 55, 66]) {
      const 結果 = await 自動で対戦する('vsHuman', 'effect', 種);
      for (const [名前, 回数] of Object.entries(結果.操作の内訳)) {
        合計[名前] = (合計[名前] ?? 0) + 回数;
      }
    }

    for (const 操作 of ['召喚', '配置', '使用', 'アタック', 'ブロック', '選択', '起動']) {
      assert.ok(
        (合計[操作] ?? 0) > 0,
        `${操作} を一度も通らなかった（テストが素通りしている）／内訳: ${JSON.stringify(合計)}`
      );
    }
  });

  // 新しく足したカード群も、実際の対戦で効果の道を通ることを確かめる。
  // 「型が通った」「単体テストが通った」だけでは、盤面で本当に動いた証拠にならない。
  await t.test('紫デッキでも効果の道を実際に通る', async () => {
    const 合計: Record<string, number> = {};
    let 決着数 = 0;
    for (const 種 of [11, 22, 33, 44, 55, 66]) {
      const 結果 = await 自動で対戦する('vsHuman', 'purple', 種);
      if (結果.決着した) {
        決着数++;
      }
      for (const [名前, 回数] of Object.entries(結果.操作の内訳)) {
        合計[名前] = (合計[名前] ?? 0) + 回数;
      }
    }

    assert.equal(決着数, 6, `紫デッキで決着しない対戦があった／内訳: ${JSON.stringify(合計)}`);
    for (const 操作 of ['召喚', '配置', '使用', 'アタック', '選択']) {
      assert.ok(
        (合計[操作] ?? 0) > 0,
        `紫デッキで ${操作} を一度も通らなかった／内訳: ${JSON.stringify(合計)}`
      );
    }
  });

  await サーバーを止める();
});

// === 不正な入力を弾くか ===

test('APIは不正な操作を拒否する', async t => {
  await サーバーを起動する();

  await t.test('選択待ちでないのに答えようとしたら拒否する', async () => {
    await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata' });
    const 結果 = await 叩く('POST', '/api/action/select-effect-target', {
      as: 'p1',
      targetCardIds: ['なにか'],
    });
    assert.equal(結果.ok, false);
  });

  await t.test('相手のターンに召喚しようとしたら拒否する', async () => {
    await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata' });
    const 結果 = await 叩く('POST', '/api/action/summon', { as: 'p2', cardId: 'なにか' });
    assert.equal(結果.ok, false);
  });

  await t.test('存在しない起動効果を撃とうとしたら拒否する', async () => {
    await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata' });
    const 結果 = await 叩く('POST', '/api/action/activate-effect', {
      as: 'p1',
      effectId: '存在しない#0',
    });
    assert.equal(結果.ok, false);
  });

  await サーバーを止める();
});
