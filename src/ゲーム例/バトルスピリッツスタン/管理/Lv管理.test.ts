import { test } from 'node:test';
import assert from 'node:assert/strict';

import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { Lv管理 } from './Lv管理.js';

test('現在のLvを取得：未設定のカードは既定でLv1を返す', () => {
  const カード = グンガタを作成('test-1');
  assert.equal(new Lv管理().現在のLvを取得(カード), 1);
});

test('Lvを上げる：新しいLvが現在より大きい場合のみLvとBPを同期して更新する', () => {
  const 管理 = new Lv管理();
  const カード = グンガタを作成('test-2');
  カード.数値を設定('Lv', 1);

  管理.Lvを上げる(カード, 2);
  assert.equal(管理.現在のLvを取得(カード), 2);
  assert.equal(カード.数値を取得('BP'), 8000);

  // 現在以下のLvを指定しても変化しない
  管理.Lvを上げる(カード, 2);
  管理.Lvを上げる(カード, 1);
  assert.equal(管理.現在のLvを取得(カード), 2);
});

test('Lvを下げる：新しいLvが現在より小さい場合のみLvとBPを同期して更新する', () => {
  const 管理 = new Lv管理();
  const カード = グンガタを作成('test-3');
  カード.数値を設定('Lv', 2);
  カード.数値を設定('BP', 8000);

  管理.Lvを下げる(カード, 1);
  assert.equal(管理.現在のLvを取得(カード), 1);
  assert.equal(カード.数値を取得('BP'), 5000);

  // 現在以上のLvを指定しても変化しない
  管理.Lvを下げる(カード, 1);
  管理.Lvを下げる(カード, 2);
  assert.equal(管理.現在のLvを取得(カード), 1);
});

test('Lvを更新：コア数から計算したLvとBPを常に同期する（変化が無くてもBPを書き込む）', () => {
  const 管理 = new Lv管理();
  const カード = グンガタを作成('test-4');

  // 召喚直後などLv未設定（暗黙のLv1）のまま呼んでも、BPが確実にLv1のものへ同期される
  管理.Lvを更新(カード, 1);
  assert.equal(管理.現在のLvを取得(カード), 1);
  assert.equal(カード.数値を取得('BP'), 5000);

  管理.Lvを更新(カード, 3, false);
  assert.equal(管理.現在のLvを取得(カード), 2);
  assert.equal(カード.数値を取得('BP'), 8000);

  // コアが減れば計算されたLvへ自動で戻る
  管理.Lvを更新(カード, 1, false);
  assert.equal(管理.現在のLvを取得(カード), 1);
  assert.equal(カード.数値を取得('BP'), 5000);
});
