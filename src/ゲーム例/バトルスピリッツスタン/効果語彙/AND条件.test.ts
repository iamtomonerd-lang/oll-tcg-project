import { test } from 'node:test';
import assert from 'node:assert/strict';

import { かつ } from '../効果部品/index.js';

test('AND条件: 複数の条件を AND で組み合わせられる', async (t) => {
  await t.test('AND条件が正しく型定義される', () => {
    // 手札が5枚以下 かつ 真界放している
    const 条件A = { 数量: { 場: '自分' as const, ゾーン: '手札', 以下: 5 } };
    const 条件B = { 自身: { 真界放: true } };
    const AND条件 = かつ(条件A, 条件B);

    // AND条件が正しく構造化されている
    assert.ok('かつ' in AND条件, 'AND条件が「かつ」フィールドを持つ');
    assert.equal(AND条件.かつ.length, 2, '2つの条件が結合されている');
  });

  await t.test('3つ以上の条件をANDで結合できる', () => {
    const 条件A = { 数量: { 場: '自分' as const, ゾーン: '手札', 以下: 5 } };
    const 条件B = { 自身: { 真界放: true } };
    const 条件C = { 履歴: 'テスト出来事' };

    const AND条件 = かつ(条件A, 条件B, 条件C);

    assert.ok('かつ' in AND条件, 'AND条件が「かつ」フィールドを持つ');
    assert.equal(AND条件.かつ.length, 3, '3つの条件が結合されている');
  });

  await t.test('AND条件をネストできる', () => {
    const 条件A = { 数量: { 場: '自分' as const, ゾーン: '手札', 以下: 5 } };
    const 条件B = { 自身: { 真界放: true } };
    const AND条件1 = かつ(条件A, 条件B);

    const 条件C = { 履歴: 'テスト出来事' };
    const AND条件2 = かつ(AND条件1, 条件C);

    assert.ok('かつ' in AND条件2, 'ネストされたAND条件が「かつ」フィールドを持つ');
    assert.equal(AND条件2.かつ.length, 2, 'ネストされた条件が結合されている');
    // ネストされた最初の要素もAND条件
    assert.ok('かつ' in AND条件2.かつ[0], 'ネストされたAND条件が含まれている');
  });
});
