import { 効果条件 } from './条件.js';
import { アタック中条件 } from './条件/アタック中.js';

// 効果条件の登録と管理
export class 効果条件登録 {
  private 条件マップ: Map<string, 効果条件> = new Map();

  constructor() {
    this.条件をセットアップ();
  }

  private 条件をセットアップ(): void {
    this.登録(new アタック中条件());
  }

  登録(条件: 効果条件): void {
    this.条件マップ.set(条件.識別子, 条件);
  }

  取得(識別子: string): 効果条件 | undefined {
    return this.条件マップ.get(識別子);
  }

  全条件を取得(): 効果条件[] {
    return Array.from(this.条件マップ.values());
  }
}
