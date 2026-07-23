import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export class シャッフル効果 extends 効果 {
  constructor(識別子: string = 'シャッフル', 名前: string = 'シャッフル') {
    super(識別子, 名前);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    const { 追加データ } = 文脈;

    const 対象配列 = 追加データ?.対象配列 as any[] | undefined;

    if (!対象配列 || !Array.isArray(対象配列)) {
      return {
        成功: false,
        メッセージ: '対象配列が不足しているか、配列ではありません',
      };
    }

    if (対象配列.length === 0) {
      return {
        成功: true,
        メッセージ: '空の配列です',
        データ: { シャッフル後: 対象配列 },
      };
    }

    const シャッフル後 = this.フィッシャーイェーツシャッフル([...対象配列]);

    return {
      成功: true,
      メッセージ: `${対象配列.length}個の要素をシャッフルしました`,
      データ: {
        元の配列: 対象配列,
        シャッフル後,
      },
    };
  }

  private フィッシャーイェーツシャッフル(配列: any[]): any[] {
    const シャッフル済み = [...配列];
    for (let i = シャッフル済み.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [シャッフル済み[i], シャッフル済み[j]] = [
        シャッフル済み[j],
        シャッフル済み[i],
      ];
    }
    return シャッフル済み;
  }
}
