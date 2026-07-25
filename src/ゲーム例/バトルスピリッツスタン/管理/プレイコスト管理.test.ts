import { test } from 'node:test';
import assert from 'node:assert/strict';

import { プレイコスト判定 } from '../判定/プレイコスト判定.js';
import { コア保持者 } from '../判定/コア保持者.js';
import { プレイコスト管理 } from './プレイコスト管理.js';

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
}

// === プレイコスト判定 ===

test('支払い総数はちょうどか：合計がコストとぴったり一致するときのみtrue（過剰不可・11-1-1-5等）', () => {
  const 判定 = new プレイコスト判定();
  const 元一覧 = [{ 保持者: new テスト用コア保持者(10), 数: 3 }];
  assert.equal(判定.支払い総数はちょうどか(元一覧, 3), true);
  assert.equal(判定.支払い総数はちょうどか(元一覧, 4), false);
  assert.equal(判定.支払い総数はちょうどか(元一覧, 2), false);
});

test('初期配置数は十分か：合計が最低必要数以上であればtrue（過剰は許容・11-1-1-6等）', () => {
  const 判定 = new プレイコスト判定();
  const 元一覧 = [{ 保持者: new テスト用コア保持者(10), 数: 3 }];
  assert.equal(判定.初期配置数は十分か(元一覧, 3), true);
  assert.equal(判定.初期配置数は十分か(元一覧, 2), true);
  assert.equal(判定.初期配置数は十分か(元一覧, 4), false);
});

test('各支払い元に十分なコアがあるか：各支払い元が指定数のコア（通常+ソウル）を実際に持っているかを検証する', () => {
  const 判定 = new プレイコスト判定();
  const 十分な元 = new テスト用コア保持者(3, false);
  const ソウルで充足する元 = new テスト用コア保持者(1, true); // 総数1・ソウルコアあり
  const 不足する元 = new テスト用コア保持者(0, false); // 総数0

  assert.equal(判定.各支払い元に十分なコアがあるか([{ 保持者: 十分な元, 数: 3 }]), true);
  assert.equal(判定.各支払い元に十分なコアがあるか([{ 保持者: ソウルで充足する元, 数: 1 }]), true);
  assert.equal(判定.各支払い元に十分なコアがあるか([{ 保持者: 不足する元, 数: 1 }]), false);
});

// === プレイコスト管理 ===

test('コストを支払う：各支払い元から通常コアをトラッシュへ移す', () => {
  const 管理 = new プレイコスト管理();
  const 元1 = new テスト用コア保持者(5);
  const 元2 = new テスト用コア保持者(5);
  const トラッシュ = new テスト用コア保持者(0);

  const 成功 = 管理.コストを支払う([{ 保持者: 元1, 数: 2 }, { 保持者: 元2, 数: 1 }], トラッシュ, 3);

  assert.equal(成功, true);
  assert.equal(元1.コア数を取得(), 3);
  assert.equal(元2.コア数を取得(), 4);
  assert.equal(トラッシュ.コア数を取得(), 3);
});

test('コストを支払う：合計がコストと一致しなければ何も動かさず失敗する', () => {
  const 管理 = new プレイコスト管理();
  const 元 = new テスト用コア保持者(5);
  const トラッシュ = new テスト用コア保持者(0);

  const 成功 = 管理.コストを支払う([{ 保持者: 元, 数: 2 }], トラッシュ, 3);

  assert.equal(成功, false);
  assert.equal(元.コア数を取得(), 5, '失敗時は元のコア数が変化しない');
  assert.equal(トラッシュ.コア数を取得(), 0);
});

test('コストを支払う：支払い元のコアが実際には足りていなければ失敗する', () => {
  const 管理 = new プレイコスト管理();
  const 元 = new テスト用コア保持者(1);
  const トラッシュ = new テスト用コア保持者(0);

  const 成功 = 管理.コストを支払う([{ 保持者: 元, 数: 3 }], トラッシュ, 3);

  assert.equal(成功, false);
});

test('初期コアを配置する：最低必要数以上のコアを対象へ置く（過剰も許容）', () => {
  const 管理 = new プレイコスト管理();
  const 元 = new テスト用コア保持者(5);
  const 対象 = new テスト用コア保持者(0);

  const 成功 = 管理.初期コアを配置する([{ 保持者: 元, 数: 4 }], 対象, 1);

  assert.equal(成功, true);
  assert.equal(元.コア数を取得(), 1);
  assert.equal(対象.コア数を取得(), 4);
});

test('初期コアを配置する：合計が最低必要数未満なら失敗する', () => {
  const 管理 = new プレイコスト管理();
  const 元 = new テスト用コア保持者(5);
  const 対象 = new テスト用コア保持者(0);

  const 成功 = 管理.初期コアを配置する([{ 保持者: 元, 数: 1 }], 対象, 2);

  assert.equal(成功, false);
  assert.equal(対象.コア数を取得(), 0);
});
