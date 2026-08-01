import { カード } from '../../../../データ/カード/カード.js';
import { プレイヤー } from '../../../../データ/プレイヤー/プレイヤー.js';
import { 効果条件 } from '../条件.js';

// ムーシャッコのバトル終了時効果の条件
// ・Lv2である
// ・アタック中である
// ・自分の手札が5枚以下である
// ※ 手札確認にはプレイヤーが必要だが、基底クラスの制約上
//   手札チェックは別途実行時に行う
export class ムーシャッコ条件 extends 効果条件 {
  constructor() {
    super('mushaako-condition', 'ムーシャッコのバトル終了時効果条件');
  }

  // 基本的な条件判定（Lv2とアタック中）
  判定(カード?: カード, プレイヤー?: プレイヤー): boolean {
    if (!カード) {
      return false;
    }

    // 1. Lv2であるか
    const 現在のLv = カード.数値を取得('Lv');
    if (現在のLv !== 2) {
      return false;
    }

    // 2. アタック中であるか
    if (!カード.状態を取得('アタック中')) {
      return false;
    }

    return true;
  }
}
