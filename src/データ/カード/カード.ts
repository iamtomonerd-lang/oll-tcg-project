export interface カード名称 {
  識別子: string;
  表示名: string;
  説明?: string;
}

export class カード {
  readonly 識別子: string;
  readonly 名称: カード名称;
  状態: Map<string, any>;
  数値: Map<string, number>;

  constructor(識別子: string, 名称: カード名称) {
    this.識別子 = 識別子;
    this.名称 = 名称;
    this.状態 = new Map();
    this.数値 = new Map();
  }

  状態を設定(キー: string, 値: any): void {
    this.状態.set(キー, 値);
  }

  状態を取得(キー: string): any {
    return this.状態.get(キー);
  }

  状態を持つ(キー: string): boolean {
    return this.状態.has(キー);
  }

  状態をクリア(キー: string): void {
    this.状態.delete(キー);
  }

  数値を設定(キー: string, 値: number): void {
    this.数値.set(キー, 値);
  }

  数値を取得(キー: string): number {
    return this.数値.get(キー) ?? 0;
  }

  数値を加算(キー: string, 量: number): number {
    const 現在値 = this.数値を取得(キー);
    const 新しい値 = 現在値 + 量;
    this.数値を設定(キー, 新しい値);
    return 新しい値;
  }

  複製(): カード {
    const 複製 = new カード(this.識別子, this.名称);
    複製.状態 = new Map(this.状態);
    複製.数値 = new Map(this.数値);
    return 複製;
  }
}
