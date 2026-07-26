import { test } from 'node:test';
import assert from 'node:assert/strict';

import { アタック中条件 } from './アタック中.js';
import { カード } from '../../../../データ/カード/カード.js';
import { グンガタ } from '../../カードデータ/グンガタ.js';

test('アタック中条件：アタック中のカードは判定がtrue', () => {
  const カード情報 = new グンガタ();
  const カード1 = new カード('card-1', カード情報);
  カード1.状態を設定('アタック中', true);

  const 条件 = new アタック中条件();
  assert.equal(条件.判定(カード1), true);
});

test('アタック中条件：アタック中でないカードは判定がfalse', () => {
  const カード情報 = new グンガタ();
  const カード1 = new カード('card-1', カード情報);

  const 条件 = new アタック中条件();
  assert.equal(条件.判定(カード1), false);
});

test('アタック中条件：カードが渡されない場合はfalse', () => {
  const 条件 = new アタック中条件();
  assert.equal(条件.判定(), false);
});
