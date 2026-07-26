import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ゲン_ボーを作成 } from './ゲン_ボー.js';
import { BP管理 } from '../管理/BP管理.js';

test('ゲン_ボー: card definition is correct', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const cardData = card.名称 as any;

  assert.equal(card.名称.表示名, 'ゲン_ボー');
  assert.equal(cardData.カードナンバー, '26RSD01-002');
  assert.equal(cardData.コスト, 3);
});

test('ゲン_ボー: Lv info is correct', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const lvList = (card.名称 as any).Lv;

  assert.equal(lvList.length, 2);
  assert.equal(lvList[0].level, 1);
  assert.equal(lvList[0].bp, 3000);
  assert.equal(lvList[1].level, 2);
  assert.equal(lvList[1].bp, 5000);
  assert.equal(lvList[1].真界放, true);
});

test('ゲン_ボー: attack condition effect is set', () => {
  const card = ゲン_ボーを作成('genbo-1');

  const attackEffect = card.状態を取得('Lv2_アタック中_BP効果');
  assert.ok(attackEffect);
  assert.equal(attackEffect.発動Lv, 2);
  assert.ok(attackEffect.条件);
  assert.ok(attackEffect.効果);
});

test('ゲン_ボー: effect check is false when not attacking', () => {
  const card = ゲン_ボーを作成('genbo-1');

  const attackEffect = card.状態を取得('Lv2_アタック中_BP効果');
  const conditionCheck = attackEffect.条件.判定(card);

  assert.equal(conditionCheck, false);
});

test('ゲン_ボー: effect check is true when attacking', async () => {
  const card = ゲン_ボーを作成('genbo-1');
  card.状態を設定('アタック中', true);

  const attackEffect = card.状態を取得('Lv2_アタック中_BP効果');
  const conditionCheck = attackEffect.条件.判定(card);

  assert.equal(conditionCheck, true);
});

test('ゲン_ボー: effect execution adds BP+2000 when attacking', async () => {
  const card = ゲン_ボーを作成('genbo-1');
  const bpManager = new BP管理();

  bpManager.Lvに対応したBPに更新(card, 2);
  const initialBp = bpManager.現在のBPを取得(card);

  card.状態を設定('アタック中', true);
  const attackEffect = card.状態を取得('Lv2_アタック中_BP効果');
  const conditionCheck = attackEffect.条件.判定(card);
  assert.equal(conditionCheck, true);

  const effectResult = await attackEffect.効果.実行({ 対象: card });
  assert.equal(effectResult.成功, true);

  const finalBp = bpManager.現在のBPを取得(card);
  assert.equal(finalBp, initialBp + 2000);
});
