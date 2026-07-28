import { test } from 'node:test';
import assert from 'node:assert';
import { 召喚時条件 } from './召喚時.js';
import { グンガタを作成 } from '../../カードデータ/グンガタ.js';

test('召喚時条件', async (t) => {
  await t.test('フラグが設定されている時は条件を満たす', () => {
    const カード = グンガタを作成('test-1');
    カード.状態を設定('召喚時', true);

    const 条件 = new 召喚時条件();
    assert.equal(条件.判定(カード), true);
  });

  await t.test('フラグがない時は条件を満たさない', () => {
    const カード = グンガタを作成('test-2');

    const 条件 = new 召喚時条件();
    assert.equal(条件.判定(カード), false);
  });

  await t.test('フラグをクリアすると条件を満たさなくなる', () => {
    const カード = グンガタを作成('test-3');
    カード.状態を設定('召喚時', true);

    const 条件 = new 召喚時条件();
    assert.equal(条件.判定(カード), true);

    カード.状態をクリア('召喚時');
    assert.equal(条件.判定(カード), false);
  });

  await t.test('カードなしで判定するとfalse', () => {
    const 条件 = new 召喚時条件();
    assert.equal(条件.判定(undefined), false);
  });
});
