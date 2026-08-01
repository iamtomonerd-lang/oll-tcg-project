import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export type 宣言条件 = (文脈: 効果実行文脈) => boolean;
export type 宣言処理 = (文脈: 効果実行文脈) => Promise<効果結果>;

// 宣言効果：手札にあるカードを、指定されたタイミングに宣言することで発揮する効果（マジックの使用等）。
export class 宣言効果 extends 効果 {
  private 条件: 宣言条件;
  private 処理: 宣言処理;
  private 有効: boolean;

  constructor(識別子: string, 名前: string, 条件: 宣言条件, 処理: 宣言処理) {
    super(識別子, 名前);
    this.条件 = 条件;
    this.処理 = 処理;
    this.有効 = true;
  }

  宣言可能(文脈: 効果実行文脈): boolean {
    if (!this.有効) {
      return false;
    }
    return this.条件(文脈);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    if (!this.宣言可能(文脈)) {
      return { 成功: false, メッセージ: '宣言条件が満たされていません' };
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
