import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export type 誘発条件 = (文脈: 効果実行文脈) => boolean;
export type 誘発処理 = (文脈: 効果実行文脈) => Promise<効果結果>;

// 誘発効果：特定の事象が発生した時に発揮する効果（「〜時」「〜した時」等）。
// スケジューリング（いつ誘発したか、重複や優先順位の扱い）はゲームごとのルール層が担い、
// この効果自体は「1回分の発揮と解決」だけを表す。
export class 誘発効果 extends 効果 {
  private 条件: 誘発条件;
  private 処理: 誘発処理;
  private 有効: boolean;
  private 発動履歴: { 時刻: Date; 回数: number }[];

  constructor(識別子: string, 名前: string, 条件: 誘発条件, 処理: 誘発処理) {
    super(識別子, 名前);
    this.条件 = 条件;
    this.処理 = 処理;
    this.有効 = true;
    this.発動履歴 = [];
  }

  誘発可能(文脈: 効果実行文脈): boolean {
    if (!this.有効) {
      return false;
    }
    return this.条件(文脈);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    if (!this.誘発可能(文脈)) {
      return { 成功: false, メッセージ: '誘発条件が満たされていません' };
    }

    const 結果 = await this.処理(文脈);

    if (結果.成功) {
      this.発動履歴.push({ 時刻: new Date(), 回数: this.発動履歴.length + 1 });
    }

    return 結果;
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

  発動回数(): number {
    return this.発動履歴.length;
  }

  発動履歴を取得() {
    return [...this.発動履歴];
  }
}
