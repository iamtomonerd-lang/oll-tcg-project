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

  // 同じ中身の別物を作る（先読みで盤面を試すため）。
  //
  // 中のカードも複製する。ここで元のカードを使い回すと、
  // 複製の盤面をいじったつもりが本物のカードまで変わってしまう。
  // 作った複製カードは 差し替え表 に控えて、
  // 管理クラスが持っているカードの参照を張り替えるのに使う。
  //
  // コアはゾーンなら状態Map・カードなら数値Mapに入っているので、
  // 状態と数値を写せばコアも一緒に付いてくる。
  複製(差し替え表?: Map<string, カード>): ゾーン {
    const 複製 = new ゾーン(this.識別子, this.名称, { ...this.制約 });
    複製.状態 = new Map(this.状態);
    複製.効果対象 = new Set(this.効果対象);
    複製.カード群 = this.カード群.map(元のカード => {
      const 複製カード = 元のカード.複製();
      差し替え表?.set(元のカード.識別子, 複製カード);
      return 複製カード;
    });
    return 複製;
  }
}
