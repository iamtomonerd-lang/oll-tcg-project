import { test } from 'node:test';
import assert from 'node:assert';
import { フィールド存在条件 } from './フィールド存在条件.js';
import { ゲームエンジン } from '../../../../ゲームエンジン.js';
import { プレイヤー } from '../../../../データ/プレイヤー/プレイヤー.js';
import { グンガタを作成 } from '../../カードデータ/グンガタ.js';
import { ムーシャッコを作成 } from '../../カードデータ/ムーシャッコ.js';
import { ゾーン管理 as ゾーン管理クラス } from '../../管理/ゾーン管理.js';

function 試合環境を準備() {
  const ゲーム = new ゲームエンジン();
  const ゾーン管理 = new ゾーン管理クラス();
  const p1 = new プレイヤー('player-1', 'プレイヤー1');
  ゲーム.プレイヤーを追加(p1);
  ゾーン管理.プレイヤーの領域を生成(ゲーム, 'player-1', 5);
  return { ゲーム, ゾーン管理 };
}

test('フィールド存在条件', async (t) => {
  await t.test('フィールドにカードが存在しない場合はfalse', () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const 条件 = new フィールド存在条件('テスト', () => true);
    assert.equal(条件.フィールドに存在するか(ゲーム, 'player-1'), false);
  });

  await t.test('条件を満たすカードが存在する場合はtrue', () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const カード1 = グンガタを作成('test-1');
    const 条件 = new フィールド存在条件('テスト', () => true);

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード1);
    }

    assert.equal(条件.フィールドに存在するか(ゲーム, 'player-1'), true);
  });

  await t.test('複数の条件をすべて満たすカードが存在する場合はtrue', () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const カード1 = グンガタを作成('test-1');
    const 条件 = new フィールド存在条件(
      'テスト',
      () => true,
      () => true,
      () => true
    );

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード1);
    }

    assert.equal(条件.フィールドに存在するか(ゲーム, 'player-1'), true);
  });

  await t.test('1つでも条件を満たさないカードのみの場合はfalse', () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const カード1 = グンガタを作成('test-1');
    const 条件 = new フィールド存在条件(
      'テスト',
      () => true,
      () => false
    );

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード1);
    }

    assert.equal(条件.フィールドに存在するか(ゲーム, 'player-1'), false);
  });

  await t.test('複数のカードがあり、1つが条件を満たす場合はtrue', () => {
    const { ゲーム, ゾーン管理 } = 試合環境を準備();
    const カード1 = グンガタを作成('test-1');
    const カード2 = ムーシャッコを作成('test-2');
    const 条件 = new フィールド存在条件(
      'テスト',
      (カード) => カード.識別子 === 'test-2'
    );

    const フィールド = ゾーン管理.フィールドを取得(ゲーム, 'player-1');
    if (フィールド) {
      フィールド.カードを追加(カード1);
      フィールド.カードを追加(カード2);
    }

    assert.equal(条件.フィールドに存在するか(ゲーム, 'player-1'), true);
  });
});
