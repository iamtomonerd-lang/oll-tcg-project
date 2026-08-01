import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ゲームエンジン } from '../../../ゲームエンジン.js';
import { カード } from '../../../データ/カード/カード.js';
import { グンガタを作成 } from '../カードデータ/グンガタ.js';
import { ゾーン管理 } from './ゾーン管理.js';
import { 破壊管理 } from './破壊管理.js';
import { 破壊判定 } from '../判定/破壊判定.js';
import { 破壊原因判定 } from '../判定/破壊原因判定.js';

function マジックカードを作る(識別子: string): カード {
  return new カード(識別子, { 識別子, 表示名: 'テストマジック', カード種別: 'マジック' } as any);
}

test('破壊判定：破壊対象になるのはスピリットとネクサスのみ', () => {
  const 判定 = new 破壊判定();
  const スピリット = グンガタを作成('spirit-1');
  const マジック = マジックカードを作る('magic-1');
  const ネクサス = new カード('nexus-1', { 識別子: 'nexus-1', 表示名: 'テストネクサス', カード種別: 'ネクサス' } as any);

  assert.equal(判定.破壊対象か(スピリット), true);
  assert.equal(判定.破壊対象か(ネクサス), true);
  assert.equal(判定.破壊対象か(マジック), false);
});

test('破壊原因判定：相手の効果／BP比べは『相手による破壊時』に該当し、自分の効果は該当しない（12-2-1-12-1）', () => {
  const 判定 = new 破壊原因判定();
  const 相手のカード = グンガタを作成('opponent-1');

  assert.equal(判定.相手による破壊か({ 由来: '相手の効果', 効果識別子: 'x' }), true);
  assert.equal(判定.相手による破壊か({ 由来: 'BP比べ', 相手のカード }), true);
  assert.equal(判定.相手による破壊か({ 由来: '自分の効果', 効果識別子: 'x' }), false);
  assert.equal(判定.相手による破壊か(undefined), false);
});

test('破壊する：対象外のカード（マジック）は破壊できない', () => {
  const 管理 = new 破壊管理();
  const マジック = マジックカードを作る('magic-2');
  assert.equal(管理.破壊する(マジック), false);
});

test('破壊する：対象カードを待機状態（理由=破壊）にし、破壊原因を記録する（第1段階）', () => {
  const 管理 = new 破壊管理();
  const カード = グンガタを作成('spirit-2');

  const 成功 = 管理.破壊する(カード, { 由来: '相手の効果', 効果識別子: 'x' });

  assert.equal(成功, true);
  assert.equal(管理.相手による破壊か(カード), true);
});

test('破壊する：原因を渡さなければ相手による破壊とは判定されない', () => {
  const 管理 = new 破壊管理();
  const カード = グンガタを作成('spirit-3');
  管理.破壊する(カード);
  assert.equal(管理.相手による破壊か(カード), false);
});

test('トラッシュへ置く：破壊で待機状態のカードをフィールドからトラッシュへ移し、コアはリザーブへ戻す（第2段階）', () => {
  const ゾーン管理個体 = new ゾーン管理();
  const ゲーム = new ゲームエンジン();
  ゾーン管理個体.プレイヤーの領域を生成(ゲーム, 'p1');

  const フィールド = ゾーン管理個体.フィールドを取得(ゲーム, 'p1')!;
  const トラッシュ = ゾーン管理個体.トラッシュを取得(ゲーム, 'p1')!;
  const リザーブ = ゾーン管理個体.リザーブを取得(ゲーム, 'p1')!;

  const カード = グンガタを作成('spirit-4');
  カード.数値を設定('コア数', 3);
  フィールド.カードを追加(カード);

  const 管理 = new 破壊管理();
  管理.破壊する(カード, { 由来: '相手の効果', 効果識別子: 'x' });

  const 解決成功 = 管理.トラッシュへ置く(ゲーム, 'p1', カード);

  assert.equal(解決成功, true);
  assert.equal(フィールド.カードを取得(カード.識別子), undefined);
  assert.ok(トラッシュ.カードを取得(カード.識別子));
  assert.equal(カード.数値を取得('コア数'), 0, 'コアはリザーブへ移り、カード自身のコアは0になる');
  assert.equal(リザーブ.状態を取得('コア数'), 3);
  assert.equal(管理.破壊原因を取得(カード), undefined, '解決後は破壊原因の記録をクリアする');
});
