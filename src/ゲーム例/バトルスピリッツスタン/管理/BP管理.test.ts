import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { BP管理 } from './BP管理.js';

test('BPを設定／現在のBPを取得：カードのBPを直接書き換えて読み取れる', () => {
  const 管理 = new BP管理();
  const カード = グンガタを作成('test-1');
  管理.BPを設定(カード, 6000);
  assert.equal(管理.現在のBPを取得(カード), 6000);
});

test('Lvに対応したBPに更新：指定したLvの基本BPへ書き換える', () => {
  const 管理 = new BP管理();
  const カード = グンガタを作成('test-2');
  管理.Lvに対応したBPに更新(カード, 2);
  assert.equal(管理.現在のBPを取得(カード), 8000);
});

test('効果によるBPを変更：現在のBPに加減算し、0未満にはならない', () => {
  const 管理 = new BP管理();
  const カード = グンガタを作成('test-3');
  管理.BPを設定(カード, 5000);

  管理.効果によるBPを変更(カード, 2000);
  assert.equal(管理.現在のBPを取得(カード), 7000);

  管理.効果によるBPを変更(カード, -10000);
  assert.equal(管理.現在のBPを取得(カード), 0);
});

test('最大BPを取得／最小BPを取得：カードのLv一覧の両端のBPを返す', () => {
  const 管理 = new BP管理();
  const カード = グンガタを作成('test-4');
  assert.equal(管理.最大BPを取得(カード), 8000);
  assert.equal(管理.最小BPを取得(カード), 5000);
});
