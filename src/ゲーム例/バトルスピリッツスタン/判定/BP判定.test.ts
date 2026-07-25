import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { BP判定 } from './BP判定.js';

test('BPを計算：指定したLvに対応する基本BPを返す', () => {
  const 判定 = new BP判定();
  const カード = グンガタを作成('test-1');
  assert.equal(判定.BPを計算(カード, 1), 5000);
  assert.equal(判定.BPを計算(カード, 2), 8000);
});

test('BPを計算：存在しないLvを指定すると0を返す', () => {
  const 判定 = new BP判定();
  const カード = グンガタを作成('test-2');
  assert.equal(判定.BPを計算(カード, 3), 0);
});

test('最大BPを計算／最小BPを計算：Lv一覧の両端のBPを返す', () => {
  const 判定 = new BP判定();
  const カード = グンガタを作成('test-3');
  assert.equal(判定.最大BPを計算(カード), 8000);
  assert.equal(判定.最小BPを計算(カード), 5000);
});
