import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  カード帳,
  番号で引く,
  番号は実在するか,
  番号からカード名を引く,
  見出し一覧を取得,
} from './カード帳.js';

test('カード帳：実装済みのカードを1か所から引ける', async t => {
  await t.test('赤16枚と紫21枚が載っている', () => {
    const 赤 = カード帳.filter(項 => 項.カードナンバー.startsWith('26RSD01-'));
    const 紫 = カード帳.filter(項 => 項.カードナンバー.startsWith('紫-'));

    assert.equal(赤.length, 16, '26RSD01 の実装済み16枚');
    assert.equal(紫.length, 21, '紫血醒の21枚');
    assert.equal(カード帳.length, 赤.length + 紫.length, '他の種類は混ざっていない');
  });

  // 索引が壊れると、デッキ構築の同名判定が静かに狂う。
  await t.test('カードナンバーが重複していない', () => {
    const 番号一覧 = カード帳.map(項 => 項.カードナンバー);
    assert.equal(new Set(番号一覧).size, 番号一覧.length);
  });

  await t.test('どの項目も中身が空でない', () => {
    for (const 項 of カード帳) {
      assert.ok(項.カードナンバー, 'カードナンバーがある');
      assert.ok(項.カード名, `${項.カードナンバー} にカード名がある`);
      assert.ok(項.表示名, `${項.カードナンバー} に表示名がある`);
      assert.ok(項.カード種別, `${項.カードナンバー} にカード種別がある`);
      assert.equal(typeof 項.コスト, 'number', `${項.カードナンバー} のコストが数`);
    }
  });

  await t.test('作る関数は、その番号のカードを実際に作る', () => {
    for (const 項 of カード帳) {
      const 実物 = 項.作る(`確認-${項.カードナンバー}`);
      assert.equal(実物.識別子, `確認-${項.カードナンバー}`);
      assert.equal(
        (実物.名称 as unknown as { カードナンバー: string }).カードナンバー,
        項.カードナンバー,
        '見出しと実物の番号が一致する'
      );
    }
  });

  await t.test('同じ番号で2回作っても別のカードになる', () => {
    const 項 = カード帳[0];
    const 甲 = 項.作る('甲');
    const 乙 = 項.作る('乙');
    assert.notEqual(甲, 乙, '使い回しではなく毎回新しく作る');
    assert.notEqual(甲.識別子, 乙.識別子);
  });
});

test('カード帳：番号で引く', async t => {
  const 見本 = カード帳[0];

  await t.test('実在する番号を引ける', () => {
    assert.equal(番号で引く(見本.カードナンバー)?.カード名, 見本.カード名);
    assert.equal(番号は実在するか(見本.カードナンバー), true);
    assert.equal(番号からカード名を引く(見本.カードナンバー), 見本.カード名);
  });

  await t.test('無い番号は undefined / false', () => {
    assert.equal(番号で引く('存在しない-000'), undefined);
    assert.equal(番号は実在するか('存在しない-000'), false);
    assert.equal(番号からカード名を引く('存在しない-000'), undefined);
  });
});

test('カード帳：画面に渡す見出しには作成関数を含めない', () => {
  const 一覧 = 見出し一覧を取得();
  assert.equal(一覧.length, カード帳.length);
  for (const 見出し of 一覧) {
    assert.equal('作る' in 見出し, false, 'JSONにできる形であること');
  }
  // JSONにできることを実際に確かめる（APIでそのまま返すため）
  assert.doesNotThrow(() => JSON.stringify(一覧));
});

// 実装したカードを帳に足し忘れると、デッキ構築の画面に出てこない。
// 26RSD01 は 001〜014 と X01/X02 で全16枚。番号が欠けていたら足し忘れ。
test('カード帳：26RSD01 の全16枚が欠けずに載っている', () => {
  const 赤の番号 = カード帳
    .map(項 => 項.カードナンバー)
    .filter(番号 => 番号.startsWith('26RSD01-'))
    .map(番号 => 番号.slice('26RSD01-'.length))
    .sort();

  const あるべき番号 = [
    '001', '002', '003', '004', '005', '006', '007',
    '008', '009', '010', '011', '012', '013', '014',
    'X01', 'X02',
  ].sort();

  assert.deepEqual(赤の番号, あるべき番号);
});

// デッキ構築が成立する前提。同名3枚までで40枚を組むには14種類以上が要る。
test('カード帳：40枚のデッキを組めるだけの種類がある', () => {
  assert.ok(
    カード帳.length >= 14,
    `${カード帳.length}種類。同名3枚までで40枚を組むには14種類以上が必要`
  );
});
