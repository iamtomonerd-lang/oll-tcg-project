import { test } from 'node:test';
import assert from 'node:assert/strict';

import { 待機状態判定 } from './待機状態判定.js';

test('待機状態でなければ、どんな効果も発揮できる', () => {
  const 判定 = new 待機状態判定();
  assert.equal(判定.発揮できる効果か(false, false, false), true);
});

test('待機状態でも、待機前から発揮している常在型効果は発揮できる', () => {
  const 判定 = new 待機状態判定();
  assert.equal(判定.発揮できる効果か(true, true, false), true);
});

test('待機状態でも、待機理由に紐づく効果（破壊時・消滅時等）は発揮できる', () => {
  const 判定 = new 待機状態判定();
  assert.equal(判定.発揮できる効果か(true, false, true), true);
});

test('待機状態で、上記いずれにも当たらない効果は発揮できない（10-2-2-4）', () => {
  const 判定 = new 待機状態判定();
  assert.equal(判定.発揮できる効果か(true, false, false), false);
});
