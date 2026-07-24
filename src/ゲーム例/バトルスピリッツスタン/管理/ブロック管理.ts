import { カード } from '../../../データ/カード/カード.js';
import { ブロック判定 } from '../判定/ブロック判定.js';

export class ブロック管理 {
  private ブロック判定: ブロック判定;

  constructor() {
    this.ブロック判定 = new ブロック判定();
  }

  ブロック可能か(カード: カード): boolean {
    // 基本的なブロック可能条件を確認
    if (!this.ブロック判定.ブロック可能か(カード)) {
      return false;
    }

    // 効果によるブロック禁止を確認
    const ブロック禁止 = カード.状態.get('ブロック禁止');
    if (ブロック禁止 === true) {
      return false;
    }

    return true;
  }

  ブロック禁止を付与(カード: カード): void {
    カード.状態.set('ブロック禁止', true);
  }

  ブロック禁止を解除(カード: カード): void {
    カード.状態.delete('ブロック禁止');
  }

  ブロック禁止か(カード: カード): boolean {
    return カード.状態.get('ブロック禁止') === true;
  }
}
