import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { Lv判定 } from './Lv判定.js';

// グン＝ガタ：Lv1(コスト1・BP5000)、Lv2(コスト3・BP8000)。真界放は持たないため対象外（別途扱う）。

test('現在のLvを計算：コストを満たす最大のLvを返す', () => {
  const 判定 = new Lv判定();
  const カード = グンガタを作成('test-1');

  assert.equal(判定.現在のLvを計算(カード, 0), 1, 'Lv1コスト未満でも既定はLv1');
  assert.equal(判定.現在のLvを計算(カード, 1), 1);
  assert.equal(判定.現在のLvを計算(カード, 2), 1, 'Lv2コスト(3)未満はLv1のまま');
  assert.equal(判定.現在のLvを計算(カード, 3), 2);
  assert.equal(判定.現在のLvを計算(カード, 10), 2, '最大Lvを超えては上がらない');
});

test('Lvアップ可能か：合計コア数（現在＋追加）が次のLvコストに届くかで判定する', () => {
  const 判定 = new Lv判定();
  const カード = グンガタを作成('test-2');

  assert.equal(判定.Lvアップ可能か(カード, 1, 1, 1), false, '合計2はLv2コスト3未満');
  assert.equal(判定.Lvアップ可能か(カード, 1, 2, 1), true, '合計3はLv2コストちょうど');
  assert.equal(判定.Lvアップ可能か(カード, 1, 5, 1), true, '合計が上回っても可能');
});

test('Lvアップ可能か：次のLvが存在しない（既に最大Lv）なら不可能', () => {
  const 判定 = new Lv判定();
  const カード = グンガタを作成('test-3');
  assert.equal(判定.Lvアップ可能か(カード, 2, 10, 3), false);
});

test('計算Lvダウン と Lvダウンするか：現在のコア数を満たす最大のLvまで下がる', () => {
  const 判定 = new Lv判定();
  const カード = グンガタを作成('test-4');

  assert.equal(判定.計算Lvダウン(カード, 3), 2);
  assert.equal(判定.計算Lvダウン(カード, 2), 1, 'Lv2コスト未満まで下がればLv1');
  assert.equal(判定.Lvダウンするか(カード, 2, 2), true, 'Lv2からコア2はLv1へ下がる');
  assert.equal(判定.Lvダウンするか(カード, 2, 3), false, 'Lv2を維持できるコア数なら下がらない');
});
