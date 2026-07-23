import { 効果, 効果実行文脈, 効果結果 } from './効果.js';

export type 常在条件 = (文脈: 効果実行文脈) => boolean;
export type 常在処理 = (文脈: 効果実行文脈) => Promise<効果結果>;

export class 常在効果 extends 効果 {
  private 条件: 常在条件;
  private 処理: 常在処理;
  private 有効: boolean;
  private 発動履歴: { 時刻: Date; 回数: number }[];

  constructor(
    識別子: string,
    名前: string,
    条件: 常在条件,
    処理: 常在処理
  ) {
    super(識別子, 名前);
    this.条件 = 条件;
    this.処理 = 処理;
    this.有効 = true;
    this.発動履歴 = [];
  }

  適用可能(文脈: 効果実行文脈): boolean {
    if (!this.有効) {
      return false;
    }
    return this.条件(文脈);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    if (!this.適用可能(文脈)) {
      return {
        成功: false,
        メッセージ: '常在効果の条件が満たされていません',
      };
    }

    const 結果 = await this.処理(文脈);

    if (結果.成功) {
      this.発動履歴.push({
        時刻: new Date(),
        回数: this.発動履歴.length + 1,
      });
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

  発動履歴をクリア(): void {
    this.発動履歴 = [];
  }
}
