import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { 消滅判定 } from './消滅判定.js';

// グン＝ガタ：Lv1コスト=1。Lv1コスト未満（ソウルコア込みの総数）で消滅する。

test('消滅判定：Lv1コスト未満のコア数では消滅する', () => {
  const 判定 = new 消滅判定();
  const カード = グンガタを作成('test-1');
  assert.equal(判定.消滅判定(カード, 0), true);
});

test('消滅判定：Lv1コスト以上のコア数では消滅しない', () => {
  const 判定 = new 消滅判定();
  const カード = グンガタを作成('test-2');
  assert.equal(判定.消滅判定(カード, 1), false);
  assert.equal(判定.消滅判定(カード, 5), false);
});

test('最小必要コア数を取得：Lv1コストを返す', () => {
  const 判定 = new 消滅判定();
  const カード = グンガタを作成('test-3');
  assert.equal(判定.最小必要コア数を取得(カード), 1);
});
