import { test } from 'node:test';
import assert from 'node:assert';
import { 破壊効果 } from './破壊効果.js';
import { ゲームエンジン } from '../../../../ゲームエンジン.js';
import { プレイヤー } from '../../../../データ/プレイヤー/プレイヤー.js';
import { グンガタを作成 } from '../../カードデータ/グンガタ.js';
import { ゾーン管理 as ゾーン管理クラス } from '../../管理/ゾーン管理.js';

function 試合環境を準備() {
  const ゲーム = new ゲームエンジン();
  const ゾーン管理 = new ゾーン管理クラス();
  const p1 = new プレイヤー('player-1', 'プレイヤー1');
  ゲーム.プレイヤーを追加(p1);
  ゾーン管理.プレイヤーの領域を生成(ゲーム, 'player-1', 5);
  return { ゲーム, ゾーン管理 };
}

test('破壊効果', async (t) => {
  await t.test('指定されたカードを破壊する', async () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const 効果 = new 破壊効果();

    const カード = グンガタを作成('test-1');

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード);
    }

    const 文脈 = {
      ゲーム,
      対象: カード,
    };

    const 結果 = await 効果.実行(文脈);
    assert.equal(結果.成功, true);
    assert.ok(結果.メッセージ?.includes('破壊しました'));
  });

  await t.test('対象カードが指定されない場合は失敗', async () => {
    const { ゲーム } = 試合環境を準備();
    const 効果 = new 破壊効果();

    const 文脈 = {
      ゲーム,
    };

    const 結果 = await 効果.実行(文脈);
    assert.equal(結果.成功, false);
  });

  await t.test('効果識別子が正しく設定される', () => {
    const 効果 = new 破壊効果();
    assert.equal(効果.識別子, 'destroy');
  });
});
