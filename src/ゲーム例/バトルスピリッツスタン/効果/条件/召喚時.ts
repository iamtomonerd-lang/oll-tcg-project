import { カード } from '../../../../データ/カード/カード.js';
import { 効果条件 } from '../条件.js';

// 「召喚時」条件
// このカードが召喚されたターンかどうかを判定する
export class 召喚時条件 extends 効果条件 {
  constructor() {
    super('summoned', '召喚時');
  }

  判定(カード?: カード): boolean {
    if (!カード) return false;
    return カード.状態を取得('召喚時') === true;
  }
}
