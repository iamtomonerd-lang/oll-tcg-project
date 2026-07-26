import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BP上昇効果 } from './BP上昇効果.js';
import { グンガタを作成 } from '../../カードデータ/グンガタ.js';
import { BP管理 } from '../../管理/BP管理.js';

test('BP上昇効果：指定された量だけBPが上昇する', async () => {
  const カード1 = グンガタを作成('card-1');
  const BP管理者 = new BP管理();

  // グンガタはLv1でBP=5000
  BP管理者.Lvに対応したBPに更新(カード1, 1);
  const 初期BP = BP管理者.現在のBPを取得(カード1);

  const 効果 = new BP上昇効果(1000);
  const 結果 = await 効果.実行({ 対象: カード1 });

  assert.equal(結果.成功, true);
  const 最終BP = BP管理者.現在のBPを取得(カード1);
  assert.equal(最終BP, 初期BP + 1000);
});

test('BP上昇効果：複数の効果を重ねて適用できる', async () => {
  const カード1 = グンガタを作成('card-1');
  const BP管理者 = new BP管理();

  BP管理者.Lvに対応したBPに更新(カード1, 1);
  const 初期BP = BP管理者.現在のBPを取得(カード1);

  const 効果1 = new BP上昇効果(500);
  const 効果2 = new BP上昇効果(300);

  await 効果1.実行({ 対象: カード1 });
  await 効果2.実行({ 対象: カード1 });

  const 最終BP = BP管理者.現在のBPを取得(カード1);
  assert.equal(最終BP, 初期BP + 800);
});

test('BP上昇効果：対象が指定されない場合は失敗する', async () => {
  const 効果 = new BP上昇効果(1000);
  const 結果 = await 効果.実行({});

  assert.equal(結果.成功, false);
  assert.equal(結果.メッセージ, '対象カードが指定されていません');
});

test('BP上昇効果：BPが負の値にならない', async () => {
  const カード1 = グンガタを作成('card-1');
  const BP管理者 = new BP管理();

  BP管理者.BPを設定(カード1, 100);

  // マイナスの上昇量（実際には減少）
  const 効果 = new BP上昇効果(-500);
  await 効果.実行({ 対象: カード1 });

  const 最終BP = BP管理者.現在のBPを取得(カード1);
  assert.equal(最終BP, 0); // 負の値にならず0になる
});
