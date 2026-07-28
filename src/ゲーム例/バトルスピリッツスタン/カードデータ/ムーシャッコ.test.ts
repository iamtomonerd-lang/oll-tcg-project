import { strict as assert } from 'assert';
import { ムーシャッコを作成 } from './ムーシャッコ.js';

describe('ムーシャッコ（26RSD01-001）', () => {
  it('カードが正しく生成される', () => {
    const カード = ムーシャッコを作成('test-mushaako-1');
    assert.equal(カード.識別子, 'test-mushaako-1');
    assert.equal(カード.名称.表示名, 'ムーシャッコ');
    assert.equal(カード.名称.カードナンバー, '26RSD01-001');
  });

  it('レベル情報が正しく設定されている', () => {
    const カード = ムーシャッコを作成('test-mushaako-2');
    const Lv情報 = カード.名称 as any;
    assert.equal(Lv情報.Lv.length, 2);
    assert.equal(Lv情報.Lv[0].level, 1);
    assert.equal(Lv情報.Lv[0].bp, 2000);
    assert.equal(Lv情報.Lv[1].level, 2);
    assert.equal(Lv情報.Lv[1].bp, 3000);
  });

  it('バトル終了時の効果が設定されている', () => {
    const カード = ムーシャッコを作成('test-mushaako-3');
    const 効果 = カード.状態を取得('バトル終了時_ドロー効果');
    assert.ok(効果, 'バトル終了時の効果が設定されるべき');
    assert.equal(効果.発動Lv, 2, 'Lv2で発動するべき');
    assert.equal(効果.発動タイミング, 'バトル終了時', 'バトル終了時に発動するべき');
  });
});
