import { カード } from '../../../データ/カード/カード.js';
import { アタック判定 } from '../ルール/アタック判定.js';

export class アタック管理 {
  private アタック判定: アタック判定;

  constructor() {
    this.アタック判定 = new アタック判定();
  }

  アタック可能か(カード: カード): boolean {
    // 基本的なアタック可能条件を確認
    if (!this.アタック判定.アタック可能か(カード)) {
      return false;
    }

    // 効果によるアタック禁止を確認
    const アタック禁止 = カード.状態.get('アタック禁止');
    if (アタック禁止 === true) {
      return false;
    }

    return true;
  }

  アタック禁止を付与(カード: カード): void {
    カード.状態.set('アタック禁止', true);
  }

  アタック禁止を解除(カード: カード): void {
    カード.状態.delete('アタック禁止');
  }

  アタック禁止か(カード: カード): boolean {
    return カード.状態.get('アタック禁止') === true;
  }

  召喚直後アタック可能(): boolean {
    return this.アタック判定.召喚直後アタック可能();
  }
}
