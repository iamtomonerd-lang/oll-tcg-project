import { test } from 'node:test';
import assert from 'node:assert';
import { ロワミークを作成 } from './ロワミーク.js';
import { カード名ルール } from '../カードの情報/カード名.js';
import { コストルール } from '../カードの情報/コスト.js';
import { 系統ルール } from '../カードの情報/系統.js';
import { 属性ルール } from '../カードの情報/属性.js';
import { レアリティルール } from '../カードの情報/レアリティ.js';
import { カードナンバールール } from '../カードの情報/カードナンバー.js';
import { 軽減シンボルルール } from '../カードの情報/軽減シンボル.js';
import { シンボルルール } from '../カードの情報/シンボル.js';
import { Lvルール } from '../カードの情報/Lv.js';
import { カード種別ルール } from '../カードの情報/カード種別.js';

test('ロワミーク（26RSD01-003）', async (t) => {
  await t.test('カード情報が正しく設定されている', () => {
    const カード = ロワミークを作成('test-1');

    assert.equal(new カード名ルール().カード名を取得(カード), 'ロワミーク');
    assert.equal(new カードナンバールール().カードナンバーを取得(カード), '26RSD01-003');
    assert.equal(new カード種別ルール().スピリットか(カード), true);
  });

  await t.test('属性が赤で正しく設定されている', () => {
    const カード = ロワミークを作成('test-2');
    assert.deepEqual(new 属性ルール().属性を取得(カード), ['赤']);
  });

  await t.test('コストが正しく設定されている', () => {
    const カード = ロワミークを作成('test-3');
    assert.equal(new コストルール().コストを取得(カード), 3);
  });

  await t.test('レベル情報が正しく設定されている', () => {
    const カード = ロワミークを作成('test-4');
    const Lv一覧 = new Lvルール().Lvを取得(カード);
    assert.equal(Lv一覧.length, 2);
    assert.deepEqual(Lv一覧[0], { level: 1, cost: 1, bp: 3000 });
    assert.deepEqual(Lv一覧[1], { level: 2, cost: 3, bp: 5000 });
  });

  await t.test('軽減シンボルが赤赤で正しく設定されている', () => {
    const カード = ロワミークを作成('test-5');
    assert.deepEqual(new 軽減シンボルルール().軽減シンボルを取得(カード), ['赤', '赤']);
  });

  await t.test('シンボルが赤EXで正しく設定されている', () => {
    const カード = ロワミークを作成('test-6');
    assert.equal(new シンボルルール().シンボル数を取得(カード), 1);
    assert.equal(new シンボルルール().EXシンボルを持つ(カード), true);
  });

  await t.test('系統が紅雲・風牙で正しく設定されている', () => {
    const カード = ロワミークを作成('test-7');
    assert.deepEqual(new 系統ルール().系統を取得(カード), ['紅雲', '風牙']);
  });

  await t.test('レアリティがCで正しく設定されている', () => {
    const カード = ロワミークを作成('test-8');
    assert.equal(new レアリティルール().レアリティを取得(カード), 'C');
  });

  await t.test('召喚時効果が設定されている', () => {
    const カード = ロワミークを作成('test-9');
    const 効果 = カード.状態を取得('召喚時_破壊効果');
    assert.ok(効果);
  });
});
