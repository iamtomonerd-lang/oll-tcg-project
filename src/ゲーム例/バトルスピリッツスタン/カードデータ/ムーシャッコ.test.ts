import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ムーシャッコを作成 } from './ムーシャッコ.js';
import { カード名ルール } from '../カードの情報/カード名.js';
import { カードナンバールール } from '../カードの情報/カードナンバー.js';
import { Lvルール } from '../カードの情報/Lv.js';

test('ムーシャッコ（26RSD01-001）が正しく生成される', () => {
  const カード = ムーシャッコを作成('test-mushaako-1');
  assert.equal(カード.識別子, 'test-mushaako-1');
  assert.equal(new カード名ルール().カード名を取得(カード), 'ムーシャッコ');
  assert.equal(new カードナンバールール().カードナンバーを取得(カード), '26RSD01-001');
});

test('ムーシャッコのレベル情報が正しく設定されている', () => {
  const カード = ムーシャッコを作成('test-mushaako-2');
  const Lv一覧 = new Lvルール().Lvを取得(カード);
  assert.equal(Lv一覧.length, 2);
  assert.deepEqual(Lv一覧[0], { level: 1, cost: 1, bp: 2000 });
  assert.deepEqual(Lv一覧[1], { level: 2, cost: 2, bp: 3000 });
});

test('ムーシャッコにバトル終了時の効果が設定されている', () => {
  const カード = ムーシャッコを作成('test-mushaako-3');
  const 効果 = カード.状態を取得('バトル終了時_ドロー効果');
  assert.ok(効果, 'バトル終了時の効果が設定されるべき');
  assert.equal(効果.発動Lv, 2, 'Lv2で発動するべき');
  assert.equal(効果.発動タイミング, 'バトル終了時', 'バトル終了時に発動するべき');
});
