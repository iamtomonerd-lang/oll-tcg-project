import { カード } from '../カード/カード.js';

export interface ゾーン名称 {
  識別子: string;
  表示名: string;
  説明?: string;
}

export interface ゾーン制約 {
  最大枚数?: number;
  許可カード種別?: string[];
}

export class ゾーン {
  readonly 識別子: string;
  readonly 名称: ゾーン名称;
  状態: Map<string, any>;
  カード群: カード[];
  制約: ゾーン制約;
  効果対象: Set<string>;

  constructor(識別子: string, 名称: ゾーン名称, 制約: ゾーン制約 = {}) {
    this.識別子 = 識別子;
    this.名称 = 名称;
    this.状態 = new Map();
    this.カード群 = [];
    this.制約 = 制約;
    this.効果対象 = new Set();
  }

  状態を設定(キー: string, 値: any): void {
    this.状態.set(キー, 値);
  }

  状態を取得(キー: string): any {
    return this.状態.get(キー);
  }

  カードを追加(カード: カード): boolean {
    if (this.制約.最大枚数 && this.カード群.length >= this.制約.最大枚数) {
      return false;
    }

    if (this.制約.許可カード種別 && this.制約.許可カード種別.length > 0) {
      const カード種別 = カード.状態を取得('種別');
      if (!this.制約.許可カード種別.includes(カード種別)) {
        return false;
      }
    }

    this.カード群.push(カード);
    return true;
  }

  カードを削除(カード識別子: string): カード | null {
    const インデックス = this.カード群.findIndex(c => c.識別子 === カード識別子);
    if (インデックス >= 0) {
      return this.カード群.splice(インデックス, 1)[0];
    }
    return null;
  }

  カード一覧を取得(): カード[] {
    return [...this.カード群];
  }

  カードを取得(カード識別子: string): カード | undefined {
    return this.カード群.find(c => c.識別子 === カード識別子);
  }

  カード枚数を取得(): number {
    return this.カード群.length;
  }

  カード追加可能(): boolean {
    if (this.制約.最大枚数) {
      return this.カード群.length < this.制約.最大枚数;
    }
    return true;
  }

  効果対象を追加(対象識別子: string): void {
    this.効果対象.add(対象識別子);
  }

  効果対象を削除(対象識別子: string): void {
    this.効果対象.delete(対象識別子);
  }

  効果対象一覧を取得(): string[] {
    return Array.from(this.効果対象);
  }

  クリア(): void {
    this.カード群 = [];
    this.状態.clear();
    this.効果対象.clear();
  }
}
