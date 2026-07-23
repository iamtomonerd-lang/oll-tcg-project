import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export class 乱数生成効果 extends 効果 {
  constructor(識別子: string = '乱数', 名前: string = '乱数生成') {
    super(識別子, 名前);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    const { 追加データ } = 文脈;
    const 最小値 = 追加データ?.最小値 as number | undefined;
    const 最大値 = 追加データ?.最大値 as number | undefined;
    const 個数 = 追加データ?.個数 as number | undefined;

    if (最小値 === undefined || 最大値 === undefined) {
      return { 成功: false, メッセージ: '最小値または最大値が不足しています' };
    }

    if (最小値 > 最大値) {
      return { 成功: false, メッセージ: '最小値が最大値を超えています' };
    }

    if (個数 !== undefined && 個数 > 1) {
      const 結果配列: number[] = [];
      for (let i = 0; i < 個数; i++) {
        結果配列.push(this.乱数を生成(最小値, 最大値));
      }
      return {
        成功: true,
        メッセージ: `${個数}個の乱数を生成しました`,
        データ: { 値一覧: 結果配列, 最小値, 最大値 },
      };
    }

    const 値 = this.乱数を生成(最小値, 最大値);
    return {
      成功: true,
      メッセージ: `乱数を生成しました`,
      データ: { 値, 最小値, 最大値 },
    };
  }

  private 乱数を生成(最小値: number, 最大値: number): number {
    return Math.floor(Math.random() * (最大値 - 最小値 + 1)) + 最小値;
  }
}
