import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export type 置換条件 = (文脈: 効果実行文脈) => boolean;
export type 置換処理 = (文脈: 効果実行文脈) => Promise<効果結果>;

export class 置換効果 extends 効果 {
  private 条件: 置換条件;
  private 処理: 置換処理;
  private 有効: boolean;

  constructor(識別子: string, 名前: string, 条件: 置換条件, 処理: 置換処理) {
    super(識別子, 名前);
    this.条件 = 条件;
    this.処理 = 処理;
    this.有効 = true;
  }

  置換可能(文脈: 効果実行文脈): boolean {
    if (!this.有効) return false;
    return this.条件(文脈);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    if (!this.置換可能(文脈)) {
      return { 成功: false, メッセージ: '置換条件が満たされていません' };
    }
    return this.処理(文脈);
  }

  有効化(): void {
    this.有効 = true;
  }

  無効化(): void {
    this.有効 = false;
  }

  有効判定(): boolean {
    return this.有効;
  }
}
