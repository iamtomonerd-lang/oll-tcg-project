import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

  // ブロック後の割り込みの窓は、ブロックした場合にだけ発生する（8-1-4）。
  //
  // ブロックしなくても窓を開けていたため、
  // 「ブロックしていないのにブロック後のフラッシュタイミングがある」状態になっていた。
  // ブロッカーがいない「ブロック後」の窓は、そもそも起きてはいけない場面。
  if (状態.保留中のフラッシュ) {
    assert.ok(
      状態.保留中のフラッシュ.段階 !== 'ブロック後' || 状態.保留中のフラッシュ.ブロッカー名,
      `${場所} ブロックしていないのに「ブロック後」の割り込みの窓が開いている`
    );
  }

  // 【起動】効果は、そのタイミングの場面でしか勧めない。
  //
  // ここを見ずに全部の起動効果を出していたため、
  // アタックステップに入っただけで【起動：フラッシュ】が撃ててしまっていた。
  // 最奥：風牙岩Lv1は「アタックしている自分のスピリット」を対象にとるので、
  // 宣言前に撃たせても対象がおらず、撃てるのに何も起きない形にもなっていた。
  for (const 効果 of 状態.発動できる起動効果 ?? []) {
    if (効果.タイミング === 'フラッシュ') {
      assert.ok(
        状態.保留中のフラッシュ,
        `${場所} 割り込みの窓が開いていないのに【起動：フラッシュ】(${効果.カード名})を勧めている`
      );
    }
    if (効果.タイミング === 'メイン') {
      assert.ok(
        ['メインステップ', '第2メインステップ'].includes(状態.ステップ),
        `${場所} メインステップでないのに【起動：メイン】(${効果.カード名})を勧めている（${状態.ステップ}）`
      );
    }
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
  //
  // 待ち方は2種類ある。カードを選ぶ判断（対象候補一覧）と、
  // カード以外の判断（選択肢。「置くコアは相手が選ぶ」など）。
  // どちらでもないのに待っているなら、画面には何も押せるものが出ない。
  if (状態.保留中の効果) {
    const 候補数 = 状態.保留中の効果.対象候補一覧.length;
    const 選択肢数 = 状態.保留中の効果.選択肢 ? 状態.保留中の効果.選択肢.length : 0;
    assert.ok(
      候補数 > 0 || 選択肢数 > 0,
      `${場所} 候補も選択肢も空なのに選択待ちになっている`
    );
    // 2種類が混ざると、画面はどちらを出せばよいか決められない
    assert.ok(
      候補数 === 0 || 選択肢数 === 0,
      `${場所} カードの候補と選択肢が同時に出ている`
    );
    if (選択肢数 > 0) {
      assert.ok(状態.保留中の効果.問い, `${場所} 選択肢があるのに何を聞かれているか分からない`);
    }

    const { 最小, 最大 } = 状態.保留中の効果;
    assert.ok(最小 >= 0, `${場所} 最小選択数が負`);
    assert.ok(最小 <= 最大, `${場所} 最小選択数が最大を超えている`);
    // 個数は「カードを何枚選ぶか」の話。選択肢の判断は必ず1つ選ぶので数は見ない。
    if (選択肢数 === 0) {
      assert.ok(最大 <= 候補数, `${場所} 最大選択数が候補数を超えている`);
    } else {
      assert.equal(最大, 1, `${場所} 選択肢の判断なのに複数選ばせようとしている`);
    }
  }

  // 破壊されたカードが場に残っていないこと。
  //
  // 破壊は「待機状態にする → トラッシュへ置く」の2段階で、
  // 第2段階を効果からの経路で誰も呼んでいなかったため、
  // 「対象は選べるのに破壊されない」という不具合が実機で出た。
  // カード側のテストは第1段階（待機状態になったか）しか見ておらず、素通りしていた。
  //
  // 対象選択で止まっている間は、『破壊時』を知らせている最中なので場に残っていてよい。
  // 選択待ちでないのに残っていたら、それは片付け忘れ。
  if (!状態.保留中の効果) {
    for (const 側 of ['自分', '相手'] as const) {
      const 残骸 = (状態[側]?.フィールド ?? []).filter(
        (c: any) => c.待機理由 === '破壊'
      );
      assert.deepEqual(
        残骸.map((c: any) => c.名前),
        [],
        `${場所} ${側}の場に、破壊されたはずのカードが残っている`
      );
    }
  }

  // 消滅（コアがLv1コスト未満になった）カードも場に残っていないこと。
  //
  // 破壊と同じ2段階の穴。こちらは画面が待機理由「消滅」のカードを描かないため、
  // 「消えたように見えるのに軽減シンボルが1つ満たされたまま」という形で表に出ていた。
  // 見えていないだけで場に残り、アタックもブロックもできてしまう。
  //
  // 消滅はコアが動いた時点のルール処理で片付くので、選択待ちの最中でも残らない。
  for (const 側 of ['自分', '相手'] as const) {
    const 残骸 = (状態[側]?.フィールド ?? []).filter((c: any) => c.待機理由 === '消滅');
    assert.deepEqual(
      残骸.map((c: any) => c.名前),
      [],
      `${場所} ${側}の場に、消滅したはずのカードが残っている`
    );
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
  相手が判断した回数: number;
  操作の内訳: Record<string, number>;
}

// 画面がやっていることと同じ判断で、次の1手を選んで送る
// 最大手数は「決着しない＝壊れている」と判断するための打ち切り線。
// 1手＝1回のAPI呼び出しなので、パスや視点の受け渡しも1手に数える。
// 効果でコアを剥がし合うデッキは決着まで長くなりやすく、400では
// 正しく動いていても引きの綾で届かないことがあったため、余裕をとる。
async function 自動で対戦する(
  モード: 'vsAI' | 'vsHuman',
  デッキ: string,
  種: number,
  最大手数 = 1200
): Promise<対戦結果> {
  const 乱数 = 乱数を作る(種);
  let 視点 = 'p1';

  // 種はデッキのシャッフルにも渡す。ここを渡さないと、選ぶ手だけが再現されて
  // 引きは毎回変わるため、同じ種でも試合が別物になってしまう。
  let 状態 = (await 叩く('POST', '/api/game/start', { mode: モード, deck: デッキ, seed: 種 }))
    .state;
  不変条件を検査する(状態, `開始 種=${種}`);

  let 選択待ち回数 = 0;
  let 相手の判断回数 = 0;
  let 起動回数 = 0;
  let 手数 = 0;
  const 操作の内訳: Record<string, number> = {};

  for (; 手数 < 最大手数; 手数++) {
    if (状態.試合終了か) {
      return {
        手数,
        決着した: true,
        選択待ちに遭遇した回数: 選択待ち回数,
        相手が判断した回数: 相手の判断回数,
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
    if (応答.種別 === '相手の判断') 相手の判断回数++;
    if (応答.種別 === '起動') 起動回数++;

    assert.ok(応答.結果.ok, `手${手数} 種=${種}: ${応答.種別} が拒否された（${応答.結果.error}）`);
    状態 = 応答.結果.state;
    不変条件を検査する(状態, `手${手数} 種=${種} 直後の操作=${応答.種別}`);
  }

  return {
    手数,
    決着した: false,
    選択待ちに遭遇した回数: 選択待ち回数,
    相手が判断した回数: 相手の判断回数,
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
  if (状態.保留中の効果 && 状態.保留中の効果.選択肢) {
    // カード以外の判断（「置くコアは相手が選ぶ」など）。選択肢から1つ返す。
    const 選択肢 = 状態.保留中の効果.選択肢;
    return {
      種別: '相手の判断',
      結果: await 叩く('POST', '/api/action/select-effect-target', {
        as: 視点,
        targetCardIds: [ひとつ選ぶ<any>(選択肢, 乱数).識別子],
      }),
    };
  }

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

  // 3.5. ときどき{ソウルコア}を自分のスピリットに乗せる。
  //      これをしないと、盤上のスピリットが{ソウルコア}を持つ場面に一度も入らず、
  //      「置くコアは相手が選ぶ」（＝ソウルコアを置くか残すかの判断）を通れない。
  if (
    (状態.ステップ === 'メインステップ' || 状態.ステップ === '第2メインステップ') &&
    状態.自分.リザーブ.ソウルコア === true &&
    乱数() < 0.5
  ) {
    const 乗せられる = 状態.自分.フィールド.filter((c: any) => c.種別 === 'スピリット');
    if (乗せられる.length > 0) {
      const カード = ひとつ選ぶ<any>(乗せられる, 乱数);
      return {
        種別: 'ソウルコア配置',
        結果: await 叩く('POST', '/api/action/place-soul-core', {
          as: 視点,
          cardId: カード.識別子,
        }),
      };
    }
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
    for (const デッキ of ['gungata', 'rowamique', 'genbo', 'mushaako', 'harria', 'cupel', 'greifer', 'seltarius', 'leufalus', 'fuugagan', 'ganiki', 'breakclaw', 'offering', 'flame', 'rensis', 'akurai', 'effect', 'purple', 'mixed']) {
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

    // 「置くコアは相手が選ぶ」（＝相手の判断）はここでは必須にしない。
    // 起きるには「相手のスピリットが{ソウルコア}を持ち、かつコアが2個以上」という
    // 条件が要り、デッキのシャッフルは種で固定できないため、30試合で3回程度しか出ない。
    // 必須にすると、実装が正しくても半分くらい落ちるテストになってしまう。
    // この仕組みは 紫血醒カード群.test.ts の方で盤面を組んで確かめている。
    for (const 操作 of ['召喚', '配置', '使用', 'アタック', '選択', 'ソウルコア配置']) {
      assert.ok(
        (合計[操作] ?? 0) > 0,
        `紫デッキで ${操作} を一度も通らなかった／内訳: ${JSON.stringify(合計)}`
      );
    }
  });

  await サーバーを止める();
});

// === 選んだデッキで始まるか ===
//
// 型の宣言と入口の許可リストを別々に手で書いていたため、
// 名簿に足しても許可リストに書き忘れると、知らない名前として黙って
// グン＝ガタに差し替わっていた。実際にロワミークがこれで漏れていて、
// ロワミークを選んでもグン＝ガタの試合が始まっていた。
//
// 画面が押せるデッキのボタンを起点に、そのデッキらしい中身で始まるかを見る。
test('画面のデッキボタンは、すべてそのデッキで試合が始まる', async () => {
  await サーバーを起動する();
  try {
    const HTML = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/index.html'),
      'utf-8'
    );
    const ボタン一覧 = [...HTML.matchAll(/data-deck="([^"]+)"/g)].map(m => m[1]);
    assert.ok(ボタン一覧.length > 0, 'デッキのボタンが1つも見つからない（抽出が壊れている）');

    // グン＝ガタだけのデッキと見分けるため、それ以外のデッキは
    // 「グン＝ガタ以外のカードが1枚は入っている」ことを見る。
    const 中身を見る = async (デッキ: string) => {
      const 応答 = await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: デッキ, seed: 5 });
      assert.equal(応答.ok, true, `${デッキ}: 開始が拒否された（${応答.error}）`);
      const 名前 = new Set<string>(
        (応答.state.自分.手札 ?? []).map((c: any) => c.名前 as string)
      );
      return 名前;
    };

    const グンガタの中身 = await 中身を見る('gungata');
    assert.deepEqual([...グンガタの中身], ['グン＝ガタ'], '前提：gungata はグン＝ガタだけのはず');

    for (const デッキ of ボタン一覧) {
      const 名前 = await 中身を見る(デッキ);
      if (デッキ === 'gungata') continue;
      assert.ok(
        [...名前].some(n => n !== 'グン＝ガタ'),
        `${デッキ}: グン＝ガタしか出てこない（許可リストから漏れて差し替わっている可能性）`
      );
    }

    // 名簿に無い名前は、黙って別のデッキに差し替えず断る
    const 知らないデッキ = await 叩く('POST', '/api/game/start', {
      mode: 'vsAI',
      deck: 'ありもしないデッキ',
    });
    assert.equal(知らないデッキ.ok, false);
    assert.match(知らないデッキ.error, /知らないデッキ/);
  } finally {
    await サーバーを止める();
  }
});

// === 出せない札は、なぜ出せないのかを言う ===
//
// 押せる札しか押せないので、「なぜ出せないのか」を尋ねる手立てが画面に無かった。
// 特に《ソウルマジック》は撃てない理由が3通りあって外から見分けられず、
// 「《ソウルマジック》が発動できない」という報告になった
// （中身はソウルコアがトラッシュにあり、規則どおり撃てない場面だった）。
test('出せない札には、出せない理由が付いてくる', async () => {
  await サーバーを起動する();
  try {
    // 開始直後はコアが乏しく、たいていの札は出せない
    const 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'flame', seed: 11 }))
      .state;

    const 出せない札 = (状態.自分.手札 ?? []).filter(
      (c: any) => !c.支払可能 && !c.場のコアも使えば支払えるか && !c.ソウルマジックで使えるか
    );
    assert.ok(出せない札.length > 0, '前提：出せない札が1枚も無い');
    for (const c of 出せない札) {
      assert.ok(
        typeof c.出せない理由 === 'string' && c.出せない理由.length > 0,
        `${c.名前}: 出せないのに理由が無い`
      );
    }

    // 出せる札に理由は付かない（付くと画面が誤って理由を出す）
    for (const c of (状態.自分.手札 ?? []).filter((x: any) => x.支払可能)) {
      assert.equal(c.出せない理由, null, `${c.名前}: 出せるのに理由が付いている`);
    }

    // 《ソウルマジック》持ちは、撃てないとき必ずその理由になる
    const 嵐 = (状態.自分.手札 ?? []).find((c: any) => c.名前 === 'フレイムハリケーン');
    if (嵐 && !嵐.ソウルマジックで使えるか) {
      assert.match(嵐.出せない理由, /ソウルマジック/);
    }
  } finally {
    await サーバーを止める();
  }
});

// === ［フラッシュ］のマジックはメインステップでも使える ===
//
// 「フラッシュ効果はメインフェイズに使うことができます」（利用者の指摘）。
// わたしは一度これを取り違えて、［フラッシュ］しか持たないマジックを
// メインステップで押せないようにしてしまい、フレイムハリケーンが
// メインステップから使えなくなっていた。
//
// 見るのは「押せるか」ではなく盤面。メインステップで使って、
// 相手のスピリットが場から消えるところまで確かめる。
test('［フラッシュ］しか持たないマジックも、メインステップで使えて効果が起きる', async () => {
  await サーバーを起動する();
  try {
    // 手札に載っている「メインで使えるか」の札そのものも確かめる（画面はここを見て押させる）
    let 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'flame', seed: 11 }))
      .state;
    const 最初の嵐 = (状態.自分.手札 ?? []).find((c: any) => c.名前 === 'フレイムハリケーン');
    assert.ok(最初の嵐, '前提：フレイムハリケーンが初手に無い');
    assert.equal(最初の嵐.フラッシュで使えるか, true, '前提：［フラッシュ］のマジックである');
    assert.equal(最初の嵐.メインで使えるか, true, 'メインステップで使えると伝えていない');

    // メインステップで、嵐が払えて、相手にBP7000以下のスピリットがいる場面まで進める
    let 撃った = false;
    for (let 手 = 0; 手 < 400 && !撃った; 手++) {
      if (状態.試合終了か) break;
      const 視点 = 状態.自分.識別子;

      if (状態.保留中のブロック) {
        状態 = (await 叩く('POST', '/api/action/block', { as: 視点, cardId: null })).state;
      } else if (状態.保留中の効果) {
        状態 = (
          await 叩く('POST', '/api/action/select-effect-target', {
            as: 状態.保留中の効果.答える人 ?? 視点,
            targetCardIds: (状態.保留中の効果.対象候補一覧 ?? [])
              .slice(0, 状態.保留中の効果.最小)
              .map((c: any) => c.識別子),
          })
        ).state;
      } else if (状態.保留中のフラッシュ) {
        // ここでは撃たない。狙いは「メインステップで撃てること」
        状態 = (await 叩く('POST', '/api/action/flash-pass', { as: 視点 })).state;
      } else {
        const メイン中 =
          状態.ステップ === 'メインステップ' || 状態.ステップ === '第2メインステップ';
        const 嵐 = (状態.自分.手札 ?? []).find((c: any) => c.名前 === 'フレイムハリケーン');
        const 的 = (状態.相手.フィールド ?? []).find(
          (c: any) => c.種別 === 'スピリット' && c.BP <= 7000
        );

        if (メイン中 && 嵐 && 嵐.支払可能 && 的) {
          const 使った = await 叩く('POST', '/api/action/use', { as: 視点, cardId: 嵐.識別子 });
          assert.equal(使った.ok, true, `メインステップで使えなかった: ${使った.error}`);
          状態 = 使った.state;

          // ［フラッシュ］の効果が動く。候補が複数あれば選択待ちに入るので答える。
          // 1体しかいなければ選ぶまでもなく解決するので、そのときは待ちにならない。
          if (状態.保留中の効果) {
            const 候補 = 状態.保留中の効果.対象候補一覧 ?? [];
            assert.ok(
              候補.some((c: any) => c.識別子 === 的.識別子),
              '相手のBP7000以下のスピリットが破壊の候補に出ていない'
            );
            状態 = (
              await 叩く('POST', '/api/action/select-effect-target', {
                as: 状態.保留中の効果.答える人 ?? 視点,
                targetCardIds: [的.識別子],
              })
            ).state;
          }

          // 見るのは待機状態ではなく盤面。場から消えてトラッシュにあること。
          assert.ok(
            !(状態.相手.フィールド ?? []).some((c: any) => c.識別子 === 的.識別子),
            '選んだのに相手の場から消えていない'
          );
          assert.ok(
            (状態.相手.トラッシュ ?? []).some((c: any) => c.識別子 === 的.識別子),
            '破壊したのにトラッシュに無い'
          );
          撃った = true;
        } else {
          const 出せる = (状態.自分.手札 ?? []).find(
            (c: any) => c.支払可能 && c.種別 === 'スピリット'
          );
          const 攻める =
            状態.ステップ === 'アタックステップ' &&
            (状態.自分.フィールド ?? []).find(
              (c: any) => c.種別 === 'スピリット' && c.表示形式 === '回復' && !c.待機状態
            );
          状態 = 攻める
            ? (await 叩く('POST', '/api/action/attack', { as: 視点, cardId: 攻める.識別子 })).state
            : 出せる
              ? (await 叩く('POST', '/api/action/summon', { as: 視点, cardId: 出せる.識別子 }))
                  .state
              : (await 叩く('POST', '/api/action/end-step', { as: 視点 })).state;
        }
      }

      if (!状態) break;
      if (!状態.試合終了か && !状態.自分が実行者か) {
        状態 = (await 叩く('GET', `/api/game/state?as=${状態.実行者識別子}`)).state;
      }
    }

    assert.equal(撃った, true, 'メインステップでフレイムハリケーンを撃てる場面に入れなかった');
  } finally {
    await サーバーを止める();
  }
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

  // 支払いの内訳は、コアを1個も動かす前に確かめる。
  // 通してしまうと、失敗したのにトラッシュのカードだけ《継召》で消える、といった
  // 中途半端な状態になる。
  await t.test('コストにちょうどの数を指定しなければ拒否する', async () => {
    const 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata', seed: 5 }))
      .state;
    const 手札 = 状態.自分.手札[0];
    const 結果 = await 叩く('POST', '/api/action/summon', {
      as: 'p1',
      cardId: 手札.識別子,
      支払い: { コスト: [{ 場所: 'リザーブ', 通常: 99 }], 初期コア: [{ 場所: 'リザーブ', 通常: 1 }] },
    });
    assert.equal(結果.ok, false);
    assert.match(結果.error, /ちょうど|そのコアがありません/);
  });

  await t.test('自分の場に無いカードを支払い元に指定したら拒否する', async () => {
    const 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata', seed: 5 }))
      .state;
    const 結果 = await 叩く('POST', '/api/action/summon', {
      as: 'p1',
      cardId: 状態.自分.手札[0].識別子,
      支払い: { コスト: [{ 場所: 'カード', カードID: 'ありもしない', 通常: 1 }] },
    });
    assert.equal(結果.ok, false);
  });

  // 「0個をここから払う」と「どこから払うか決めていない」は別物。
  // 空配列を「指定あり」と読んでいたため、支払い元0件で組み立ててしまい、
  // 《ソウルマジック》がソウルコアを1個も出せずに失敗していた（実機で発動しなかった）。
  await t.test('空の支払い指定は「指定なし」として扱い、これまで通り自動で払う', async () => {
    await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata', seed: 5 });

    // 開始直後のリザーブでは何も出せない。自分の手番で出せる手札が現れるまでステップを送る。
    let 状態: any = null;
    let 出せる手札: any = undefined;
    for (let 安全 = 0; 安全 < 40 && !出せる手札; 安全++) {
      状態 = (await 叩く('GET', '/api/game/state?as=p1')).state;
      if (状態.試合終了か) break;
      // ネクサスは /api/action/place、マジックは /api/action/use なので、
      // 召喚で試すならスピリットに限る
      出せる手札 = 状態.自分が実行者か
        ? 状態.自分.手札.find((c: any) => c.支払可能 && c.種別 === 'スピリット')
        : undefined;
      if (!出せる手札) await 叩く('POST', '/api/action/end-step', { as: 'p1' });
    }
    assert.ok(出せる手札, 'リザーブだけで出せる手札が1枚も現れなかった（前提が崩れている）');

    const 結果 = await 叩く('POST', '/api/action/summon', {
      as: 'p1',
      cardId: 出せる手札.識別子,
      支払い: { コスト: [], 初期コア: [], 継召除外: [] },
    });

    assert.equal(結果.ok, true, `空配列で拒否された: ${結果.error}`);
    assert.ok(
      結果.state.自分.フィールド.some((c: any) => c.識別子 === 出せる手札.識別子),
      '場に出ている'
    );
  });

  await t.test('トラッシュに無いカードを《継召》で食べようとしたら拒否する', async () => {
    const 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata', seed: 5 }))
      .state;
    const 結果 = await 叩く('POST', '/api/action/summon', {
      as: 'p1',
      cardId: 状態.自分.手札[0].識別子,
      支払い: { 継召除外: ['ありもしない'] },
    });
    assert.equal(結果.ok, false);
  });

  await サーバーを止める();
});

// === リタイア ===
//
// 手元で試すときに「この試合はもういい」と切り上げる手段。
// ルール上の勝利条件ではないので、勝敗結果に理由を残す。
test('リタイアすると試合が終わり、相手の勝ちになる', async () => {
  await サーバーを起動する();
  try {
    await 叩く('POST', '/api/game/start', { mode: 'vsAI', deck: 'gungata', seed: 9 });
    const 結果 = await 叩く('POST', '/api/action/retire', { as: 'p1' });

    assert.equal(結果.ok, true);
    assert.equal(結果.state.試合終了か, true);
    assert.equal(結果.state.勝敗結果.勝者.識別子, 'p2');
    assert.equal(結果.state.勝敗結果.敗者.識別子, 'p1');
    assert.match(結果.state.勝敗結果.理由, /リタイア/);

    // 終わったあとは行動できない
    const あとから = await 叩く('POST', '/api/action/end-step', { as: 'p1' });
    assert.equal(あとから.ok, false);
  } finally {
    await サーバーを止める();
  }
});

// === カードからカードへコアを移す ===
//
// 元はカード↔リザーブしか無く、別々のスピリットの上のコアを入れ替えるには
// いったんリザーブへ戻すしかなかった。
test('コアはカードからカードへ直に移せる', async () => {
  await サーバーを起動する();
  // アサーションが落ちてもサーバーを必ず閉じる。
  // 閉じ忘れると node:test がプロセスを終われず、テスト全体が固まって見える。
  try {
    // 自分の場にスピリットが2体そろうまで、ふつうに召喚して進める
    let 状態 = (
      await 叩く('POST', '/api/game/start', { mode: 'vsHuman', deck: 'gungata', seed: 4 })
    ).state;
    for (let 手 = 0; 手 < 300 && 状態.自分.フィールド.length < 2; 手++) {
      if (状態.試合終了か) break;
      const 視点 = 状態.自分.識別子;
      let 応答;
      if (状態.保留中のブロック) {
        応答 = await 叩く('POST', '/api/action/block', { as: 視点, cardId: null });
      } else if (状態.保留中のフラッシュ) {
        応答 = await 叩く('POST', '/api/action/flash-pass', { as: 視点 });
      } else if (状態.保留中の効果) {
        応答 = await 叩く('POST', '/api/action/select-effect-target', {
          as: 状態.保留中の効果.答える人 ?? 視点,
          targetCardIds: (状態.保留中の効果.対象候補一覧 ?? [])
            .slice(0, 状態.保留中の効果.最小)
            .map((c: any) => c.識別子),
        });
      } else {
        const 出せる = (状態.自分.手札 ?? []).find(
          (c: any) => c.支払可能 && c.種別 === 'スピリット'
        );
        応答 = 出せる
          ? await 叩く('POST', '/api/action/summon', { as: 視点, cardId: 出せる.識別子 })
          : await 叩く('POST', '/api/action/end-step', { as: 視点 });
      }
      if (!応答?.ok) break;
      状態 = 応答.state;
      if (!状態.試合終了か && !状態.自分が実行者か) {
        状態 = (await 叩く('GET', `/api/game/state?as=${状態.実行者識別子}`)).state;
      }
    }

    assert.ok(状態.自分.フィールド.length >= 2, '前提：自分の場に2体そろえられなかった');

    // 出せるのは通常コアだけなので、通常コアを持っているカードを元にする
    const 通常コア数 = (c: any) => c.コア数 - (c.ソウルコア ? 1 : 0);
    const 元 = 状態.自分.フィールド.find((c: any) => 通常コア数(c) >= 1);
    assert.ok(元, '前提：通常コアを持つカードが場に無い');
    const 先 = 状態.自分.フィールド.find((c: any) => c.識別子 !== 元.識別子);
    const 元の前 = 元.コア数;
    const 先の前 = 先.コア数;

    const 結果 = await 叩く('POST', '/api/action/move-core', {
      as: 状態.自分.識別子,
      cardId: 元.識別子,
      移動先カードID: 先.識別子,
      数: 1,
    });

    assert.equal(結果.ok, true, 結果.error);
    const 後の元 = 結果.state.自分.フィールド.find((c: any) => c.識別子 === 元.識別子);
    const 後の先 = 結果.state.自分.フィールド.find((c: any) => c.識別子 === 先.識別子);
    // 元がコア不足で消滅していたら場から消える。その場合も「移った」ことは先で確かめられる。
    assert.equal(後の先.コア数, 先の前 + 1, '移し先のコアが1個増える');
    if (後の元) {
      assert.equal(後の元.コア数, 元の前 - 1, '元のコアが1個減る');
    }
  } finally {
    await サーバーを止める();
  }
});

// === ソウルコアと通常コアの入れ替え ===
//
// コア管理.ソウルコアと通常コアを交換 は前からあったのに、呼び出す者が誰もいなかった。
// そのため実機では「ソウルコアを外す」→「通常コアを乗せる」の2手に分けるしかなく、
// 途中でLv1のコストを割ったスピリットが消滅してしまうため、
// 別々のスピリットの上でコアを入れ替えることが事実上できなかった。
test('ソウルコアと通常コアは1回の操作で入れ替わる', async () => {
  await サーバーを起動する();
  try {
    let 状態 = (await 叩く('POST', '/api/game/start', { mode: 'vsHuman', deck: 'gungata', seed: 4 }))
      .state;
    for (let 手 = 0; 手 < 300 && 状態.自分.フィールド.length < 2; 手++) {
      if (状態.試合終了か) break;
      const 視点 = 状態.自分.識別子;
      let 応答;
      if (状態.保留中のブロック) {
        応答 = await 叩く('POST', '/api/action/block', { as: 視点, cardId: null });
      } else if (状態.保留中のフラッシュ) {
        応答 = await 叩く('POST', '/api/action/flash-pass', { as: 視点 });
      } else if (状態.保留中の効果) {
        応答 = await 叩く('POST', '/api/action/select-effect-target', {
          as: 状態.保留中の効果.答える人 ?? 視点,
          targetCardIds: (状態.保留中の効果.対象候補一覧 ?? [])
            .slice(0, 状態.保留中の効果.最小)
            .map((c: any) => c.識別子),
        });
      } else {
        const 出せる = (状態.自分.手札 ?? []).find((c: any) => c.支払可能 && c.種別 === 'スピリット');
        応答 = 出せる
          ? await 叩く('POST', '/api/action/summon', { as: 視点, cardId: 出せる.識別子 })
          : await 叩く('POST', '/api/action/end-step', { as: 視点 });
      }
      if (!応答?.ok) break;
      状態 = 応答.state;
      if (!状態.試合終了か && !状態.自分が実行者か) {
        状態 = (await 叩く('GET', `/api/game/state?as=${状態.実行者識別子}`)).state;
      }
    }

    assert.ok(状態.自分.フィールド.length >= 2, '前提：自分の場に2体そろえられなかった');
    const 視点 = 状態.自分.識別子;

    // ソウルコアはコストとして払われてトラッシュにいることがある。
    // リフレッシュステップでリザーブへ戻るので、戻るまでステップを送る。
    for (let 手 = 0; 手 < 40 && !状態.自分.リザーブ.ソウルコア; 手++) {
      if (状態.試合終了か) break;
      if (状態.自分.フィールド.some((c: any) => c.ソウルコア)) break;
      const 応答 = 状態.保留中のブロック
        ? await 叩く('POST', '/api/action/block', { as: 状態.自分.識別子, cardId: null })
        : 状態.保留中のフラッシュ
          ? await 叩く('POST', '/api/action/flash-pass', { as: 状態.自分.識別子 })
          : await 叩く('POST', '/api/action/end-step', { as: 状態.自分.識別子 });
      if (!応答?.ok) break;
      状態 = 応答.state;
      if (!状態.試合終了か && !状態.自分が実行者か) {
        状態 = (await 叩く('GET', `/api/game/state?as=${状態.実行者識別子}`)).state;
      }
    }
    assert.ok(状態.自分.フィールド.length >= 2, '前提：場の2体が途中で減った');

    // 片方にソウルコアを乗せる（ここが入れ替えの「ソウル側」になる）。
    // 既に場のカードが持っているなら、そのカードをソウル側として使う。
    const 既に持っている = 状態.自分.フィールド.find((c: any) => c.ソウルコア);
    let ソウル側 = 既に持っている ?? 状態.自分.フィールド[0];
    let 乗せた: any = { ok: true, state: 状態 };
    if (!既に持っている) {
      assert.ok(状態.自分.リザーブ.ソウルコア, '前提：ソウルコアがリザーブに戻ってこなかった');
      乗せた = await 叩く('POST', '/api/action/place-soul-core', {
        as: 視点,
        cardId: ソウル側.識別子,
      });
      assert.equal(乗せた.ok, true, 乗せた.error);
    }

    const 通常コア数 = (c: any) => c.コア数 - (c.ソウルコア ? 1 : 0);
    const 場を引く = (s: any, id: string) => s.自分.フィールド.find((c: any) => c.識別子 === id);
    const 通常側 = 乗せた.state.自分.フィールド.find(
      (c: any) => c.識別子 !== ソウル側.識別子 && 通常コア数(c) >= 1
    );
    assert.ok(通常側, '前提：通常コアを持つ相手が場に無い');

    const ソウル側の前 = 場を引く(乗せた.state, ソウル側.識別子).コア数;
    const 通常側の前 = 通常側.コア数;

    const 結果 = await 叩く('POST', '/api/action/swap-core', {
      as: 視点,
      ソウル側カードID: ソウル側.識別子,
      通常側カードID: 通常側.識別子,
    });

    assert.equal(結果.ok, true, 結果.error);
    const 後のソウル側 = 場を引く(結果.state, ソウル側.識別子);
    const 後の通常側 = 場を引く(結果.state, 通常側.識別子);

    // 入れ替えなので、どちらも場に残り、総数は変わらず、ソウルコアの位置だけ入れ替わる。
    // 2手に分けていたころは、ここでソウル側が消滅して場から消えていた。
    assert.ok(後のソウル側, 'ソウル側が場に残っている（途中で消滅しない）');
    assert.ok(後の通常側, '通常側が場に残っている');
    assert.equal(後のソウル側.コア数, ソウル側の前, 'ソウル側の総数は変わらない');
    assert.equal(後の通常側.コア数, 通常側の前, '通常側の総数は変わらない');
    assert.equal(後のソウル側.ソウルコア, false, 'ソウルコアは出て行った');
    assert.equal(後の通常側.ソウルコア, true, 'ソウルコアは相手側へ移った');
  } finally {
    await サーバーを止める();
  }
});

// 判断は「聞かれている人」だけが答えられる。
// 「置くコアは相手が選ぶ」のように効果の持ち主でない側が答える場面があるため、
// ターンプレイヤーかどうかで判定してはいけない。
test('効果の判断は、聞かれている人以外は答えられない', async () => {
  await サーバーを起動する();

  try {
    // 選択待ちが起きるまで進める（相手の判断でも自分の判断でもよい）
    let 状態 = (
      await 叩く('POST', '/api/game/start', { mode: 'vsHuman', deck: 'purple', seed: 4649 })
    ).state;
    let 視点 = 'p1';
    let 待ちに入った = false;

    // 選択待ちに入るまで進める。紫デッキは1試合が長く、乱数の引き次第で
    // 400手では選択の場面に届かないことがあるため、上限を広くとる。
    for (let 手 = 0; 手 < 1200 && !状態.試合終了か; 手++) {
      if (!状態.自分が実行者か) {
        視点 = 状態.実行者識別子;
        状態 = (await 叩く('GET', `/api/game/state?as=${視点}`)).state;
        continue;
      }
      if (状態.保留中の効果) {
        待ちに入った = true;
        break;
      }
      const 応答 = await 次の1手を送る(状態, 視点, 乱数を作る(手 + 1));
      if (!応答 || !応答.結果.ok) {
        状態 = (await 叩く('GET', `/api/game/state?as=${視点}`)).state;
        continue;
      }
      状態 = 応答.結果.state;
    }

    assert.ok(待ちに入った, '前提：選択待ちの場面まで進めた');

    const 聞かれている人 = 視点;
    const もう一方 = 聞かれている人 === 'p1' ? 'p2' : 'p1';

    const 拒否 = await 叩く('POST', '/api/action/select-effect-target', {
      as: もう一方,
      targetCardIds: [],
    });
    assert.equal(拒否.ok, false, '聞かれていない側は答えられない');

    const 許可 = await 叩く('POST', '/api/action/select-effect-target', {
      as: 聞かれている人,
      targetCardIds: [],
    });
    assert.ok('ok' in 許可, '聞かれている側は答えられる（内容の妥当性は別の話）');
  } finally {
    await サーバーを止める();
  }
});
