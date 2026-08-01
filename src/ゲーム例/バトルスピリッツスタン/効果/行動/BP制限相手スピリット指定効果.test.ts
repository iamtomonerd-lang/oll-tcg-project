import { test } from 'node:test';
import assert from 'node:assert';
import { BP制限相手スピリット指定効果 } from './BP制限相手スピリット指定効果.js';
import { ゲームエンジン } from '../../../../ゲームエンジン.js';
import { プレイヤー } from '../../../../データ/プレイヤー/プレイヤー.js';
import { グンガタを作成 } from '../../カードデータ/グンガタ.js';
import { ムーシャッコを作成 } from '../../カードデータ/ムーシャッコ.js';
import { ゾーン管理 as ゾーン管理クラス } from '../../管理/ゾーン管理.js';
import { BP管理 as BP管理クラス } from '../../管理/BP管理.js';
import { Lv管理 as Lv管理クラス } from '../../管理/Lv管理.js';

function 試合環境を準備() {
  const ゲーム = new ゲームエンジン();
  const ゾーン管理 = new ゾーン管理クラス();
  const p1 = new プレイヤー('player-1', 'プレイヤー1');
  ゲーム.プレイヤーを追加(p1);
  ゾーン管理.プレイヤーの領域を生成(ゲーム, 'player-1', 5);
  return { ゲーム, ゾーン管理 };
}

test('BP制限相手スピリット指定効果', async (t) => {
  await t.test('効果識別子が正しく設定される', () => {
    const 効果 = new BP制限相手スピリット指定効果(5000);
    assert.equal(効果.識別子, 'target-bp-limit-5000');
  });

  await t.test('効果名が正しく生成される', () => {
    const 効果 = new BP制限相手スピリット指定効果(3000);
    assert.ok(効果.名前.includes('3000'));
  });

  await t.test('対象が選択されていない場合は失敗', async () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const 効果 = new BP制限相手スピリット指定効果(5000);

    const カード = グンガタを作成('test-1');

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード);
    }

    // 対象を指定しない
    const 文脈 = {
      ゲーム,
      追加データ: { 対象プレイヤー識別子: 'player-1' },
    };

    const 結果 = await 効果.実行(文脈);
    assert.equal(結果.成功, false);
  });

  await t.test('対象プレイヤー識別子がない場合は失敗', async () => {
    const { ゲーム } = 試合環境を準備();
    const 効果 = new BP制限相手スピリット指定効果(5000);

    const カード = グンガタを作成('test-1');
    const 文脈 = {
      ゲーム,
      対象: カード,
    };

    const 結果 = await 効果.実行(文脈);
    assert.equal(結果.成功, false);
  });
});
