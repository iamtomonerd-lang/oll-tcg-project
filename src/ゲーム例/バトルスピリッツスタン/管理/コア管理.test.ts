import { test } from 'node:test';
import assert from 'node:assert/strict';

import { コア管理 } from './コア管理.js';
import { コア保持者 } from '../判定/コア保持者.js';

class テスト用コア保持者 implements コア保持者 {
  constructor(
    private _コア数 = 0,
    private _ソウルコア = false,
    private _制限付き = false
  ) {}
  コア数を取得(): number {
    return this._コア数;
  }
  コア数を設定(数: number): void {
    this._コア数 = Math.max(0, 数);
  }
  ソウルコアあるか(): boolean {
    return this._ソウルコア;
  }
  ソウルコアを設定(ある: boolean): void {
    this._ソウルコア = ある;
  }
  制限付き配置先か(): boolean {
    return this._制限付き;
  }
  対象のカード(): undefined {
    return undefined; // このテスト用保持者はカードに紐づかない
  }
}

test('通常コアを移動：足りていれば元から先へ移動し、ソウルコアは動かさない', () => {
  const 管理 = new コア管理();
  const 元 = new テスト用コア保持者(4, true); // 総数4（通常3＋ソウル1）
  const 先 = new テスト用コア保持者(0);

  const 成功 = 管理.通常コアを移動(元, 先, 2);

  assert.equal(成功, true);
  assert.equal(元.コア数を取得(), 2); // 総数4-2
  assert.equal(元.ソウルコアあるか(), true); // ソウルコアは動いていない
  assert.equal(先.コア数を取得(), 2);
});

test('通常コアを移動：通常コアが不足していれば失敗し、状態は変化しない', () => {
  const 管理 = new コア管理();
  const 元 = new テスト用コア保持者(1, false); // 通常1のみ
  const 先 = new テスト用コア保持者(0);

  const 成功 = 管理.通常コアを移動(元, 先, 2);

  assert.equal(成功, false);
  assert.equal(元.コア数を取得(), 1);
  assert.equal(先.コア数を取得(), 0);
});

test('通常コアを移動：0以下の数を指定すると失敗する', () => {
  const 管理 = new コア管理();
  const 元 = new テスト用コア保持者(3);
  assert.equal(管理.通常コアを移動(元, new テスト用コア保持者(0), 0), false);
  assert.equal(管理.通常コアを移動(元, new テスト用コア保持者(0), -1), false);
});

test('ソウルコアを移動：元にソウルコアが無ければ失敗する', () => {
  const 管理 = new コア管理();
  const 元 = new テスト用コア保持者(2, false);
  const 先 = new テスト用コア保持者(0);
  assert.equal(管理.ソウルコアを移動(元, 先), false);
});

test('ソウルコアを移動：制限付き配置先には、効果がソウルコアを対象とする場合のみ移動できる（5-7-3）', () => {
  const 管理 = new コア管理();

  const 元A = new テスト用コア保持者(1, true);
  const 制限あり先 = new テスト用コア保持者(0, false, true);
  assert.equal(管理.ソウルコアを移動(元A, 制限あり先, false), false);
  assert.equal(元A.ソウルコアあるか(), true, '失敗時は元のソウルコアが残る');

  const 元B = new テスト用コア保持者(1, true);
  assert.equal(管理.ソウルコアを移動(元B, 制限あり先, true), true);
  assert.equal(元B.ソウルコアあるか(), false);
  assert.equal(制限あり先.ソウルコアあるか(), true);
  assert.equal(制限あり先.コア数を取得(), 1);
});

test('全コアを移動：通常コアとソウルコアの両方を先へ移動する', () => {
  const 管理 = new コア管理();
  const 元 = new テスト用コア保持者(4, true); // 通常3＋ソウル1
  const 先 = new テスト用コア保持者(0);

  管理.全コアを移動(元, 先);

  assert.equal(元.コア数を取得(), 0);
  assert.equal(元.ソウルコアあるか(), false);
  assert.equal(先.コア数を取得(), 4);
  assert.equal(先.ソウルコアあるか(), true);
});

test('ボイドからコアを置く：配置先のコア数を指定数だけ増やす（ボイド側は減らない仕様）', () => {
  const 管理 = new コア管理();
  const 先 = new テスト用コア保持者(1);
  管理.ボイドからコアを置く(先, 3);
  assert.equal(先.コア数を取得(), 4);
});

test('ボイドからコアを置く：0以下を指定しても何も変化しない', () => {
  const 管理 = new コア管理();
  const 先 = new テスト用コア保持者(1);
  管理.ボイドからコアを置く(先, 0);
  assert.equal(先.コア数を取得(), 1);
});

test('ソウルコアと通常コアを交換：両者の総数を変えずソウルコアの位置だけ入れ替える', () => {
  const 管理 = new コア管理();
  const ソウル側 = new テスト用コア保持者(1, true); // ソウルコアのみ
  const 通常側 = new テスト用コア保持者(2, false); // 通常コア2個

  const 成功 = 管理.ソウルコアと通常コアを交換(ソウル側, 通常側);

  assert.equal(成功, true);
  assert.equal(ソウル側.コア数を取得(), 1); // 総数は変わらない
  assert.equal(ソウル側.ソウルコアあるか(), false);
  assert.equal(通常側.コア数を取得(), 2); // 総数は変わらない
  assert.equal(通常側.ソウルコアあるか(), true);
});

test('ソウルコアと通常コアを交換：ソウル側にソウルコアが無ければ失敗する', () => {
  const 管理 = new コア管理();
  const ソウル側 = new テスト用コア保持者(1, false);
  const 通常側 = new テスト用コア保持者(2, false);
  assert.equal(管理.ソウルコアと通常コアを交換(ソウル側, 通常側), false);
});

test('ソウルコアと通常コアを交換：通常側に通常コアが無ければ失敗する', () => {
  const 管理 = new コア管理();
  const ソウル側 = new テスト用コア保持者(1, true);
  const 通常側 = new テスト用コア保持者(1, true); // 総数1＝ソウルコアのみで通常コア無し
  assert.equal(管理.ソウルコアと通常コアを交換(ソウル側, 通常側), false);
});

test('ソウルコアと通常コアを交換：通常側が制限付き配置先（ライフ／ボイド相当）なら失敗する（5-7-3）', () => {
  const 管理 = new コア管理();
  const ソウル側 = new テスト用コア保持者(1, true);
  const 通常側 = new テスト用コア保持者(2, false, true);
  assert.equal(管理.ソウルコアと通常コアを交換(ソウル側, 通常側), false);
});
