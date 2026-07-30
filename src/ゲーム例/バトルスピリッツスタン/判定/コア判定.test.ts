import { test } from 'node:test';
import assert from 'node:assert/strict';

import { コア判定 } from './コア判定.js';
import { コア保持者 } from './コア保持者.js';

// コア保持者インターフェースの単純なテスト用実装（ゾーン／カードの実体を介さず判定ロジックのみを検証する）
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

test('総コア数を取得 はソウルコアを含む総数をそのまま返す', () => {
  const 保持者 = new テスト用コア保持者(4, true);
  assert.equal(new コア判定().総コア数を取得(保持者), 4);
});

test('通常コア数を取得 はソウルコアが有るときだけ総数から1減らす', () => {
  const 判定 = new コア判定();
  assert.equal(判定.通常コア数を取得(new テスト用コア保持者(4, true)), 3);
  assert.equal(判定.通常コア数を取得(new テスト用コア保持者(4, false)), 4);
});

test('ソウルコアあるか はコア保持者のフラグをそのまま返す', () => {
  const 判定 = new コア判定();
  assert.equal(判定.ソウルコアあるか(new テスト用コア保持者(1, true)), true);
  assert.equal(判定.ソウルコアあるか(new テスト用コア保持者(1, false)), false);
});

test('支払い可能か は総数（ソウルコア込み）で判定する', () => {
  const 判定 = new コア判定();
  const 保持者 = new テスト用コア保持者(4, true); // 総数4（通常3＋ソウル1）
  assert.equal(判定.支払い可能か(保持者, 4), true);
  assert.equal(判定.支払い可能か(保持者, 5), false);
});

test('ソウルコアを置けるか：制限付き配置先でなければ常に置ける', () => {
  const 判定 = new コア判定();
  const 制限なし先 = new テスト用コア保持者(0, false, false);
  assert.equal(判定.ソウルコアを置けるか(制限なし先, false), true);
  assert.equal(判定.ソウルコアを置けるか(制限なし先, true), true);
});

test('ソウルコアを置けるか：制限付き配置先（ライフ／ボイド相当）は効果が対象とする場合のみ置ける（5-7-3）', () => {
  const 判定 = new コア判定();
  const 制限あり先 = new テスト用コア保持者(0, false, true);
  assert.equal(判定.ソウルコアを置けるか(制限あり先, false), false);
  assert.equal(判定.ソウルコアを置けるか(制限あり先, true), true);
});
