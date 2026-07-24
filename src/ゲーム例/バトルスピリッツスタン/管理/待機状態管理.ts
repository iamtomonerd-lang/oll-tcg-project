import { カード } from '../../../データ/カード/カード.js';
import { 消滅判定 } from '../判定/消滅判定.js';

export class 待機状態管理 {
  private 消滅判定: 消滅判定;

  constructor() {
    this.消滅判定 = new 消滅判定();
  }

  待機状態へ遷移(カード: カード, 現在のコア数: number): boolean {
    // 消滅判定に引っかかったか確認
    if (this.消滅判定.消滅判定(カード, 現在のコア数)) {
      // 待機状態にする
      カード.状態.set('待機状態', true);
      return true;
    }
    return false;
  }

  待機状態か(カード: カード): boolean {
    return カード.状態.get('待機状態') === true;
  }

  待機状態から復帰(カード: カード): void {
    カード.状態.delete('待機状態');
  }
}
