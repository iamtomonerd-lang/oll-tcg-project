import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { カードの表示形式管理 } from './カードの表示形式管理.js';

test('回復にする／疲労にする／重疲労にする：無条件で指定の表示形式に設定する', () => {
  const 管理 = new カードの表示形式管理();
  const カード = グンガタを作成('test-1');

  管理.疲労にする(カード);
  assert.equal(管理.現在の表示形式を取得(カード), '疲労');
  管理.重疲労にする(カード);
  assert.equal(管理.現在の表示形式を取得(カード), '重疲労');
  管理.回復にする(カード);
  assert.equal(管理.現在の表示形式を取得(カード), '回復');
});

test('疲労する：回復状態のときだけ疲労させ、trueを返す（誘発型効果の発火契機）', () => {
  const 管理 = new カードの表示形式管理();
  const カード = グンガタを作成('test-2');

  assert.equal(管理.疲労する(カード), true);
  assert.equal(管理.現在の表示形式を取得(カード), '疲労');

  // 既に疲労状態なら何もせずfalse
  assert.equal(管理.疲労する(カード), false);
  assert.equal(管理.現在の表示形式を取得(カード), '疲労');
});

test('重疲労する：既に重疲労でなければ重疲労にしてtrueを返す', () => {
  const 管理 = new カードの表示形式管理();
  const カード = グンガタを作成('test-3');

  assert.equal(管理.重疲労する(カード), true);
  assert.equal(管理.現在の表示形式を取得(カード), '重疲労');
  assert.equal(管理.重疲労する(カード), false, '既に重疲労なら何もせずfalse');
});

test('回復する：疲労を1段階戻す。重疲労→疲労もtrue（回復したとき効果の発火契機になる）', () => {
  const 管理 = new カードの表示形式管理();
  const カード = グンガタを作成('test-4');

  assert.equal(管理.回復する(カード), false, '既に回復状態なら何もせずfalse');

  管理.疲労にする(カード);
  assert.equal(管理.回復する(カード), true);
  assert.equal(管理.現在の表示形式を取得(カード), '回復');

  管理.重疲労にする(カード);
  assert.equal(管理.回復する(カード), true);
  assert.equal(管理.現在の表示形式を取得(カード), '疲労', '重疲労が回復すると疲労になる');
});
