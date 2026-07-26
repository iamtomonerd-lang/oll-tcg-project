import { カード } from '../../../../データ/カード/カード.js';
import { バトル判定 } from '../../判定/バトル判定.js';
import { 効果条件 } from '../条件.js';

// 「アタック中」条件
// このカードがアタック中の状態にあるかを判定する
export class アタック中条件 extends 効果条件 {
  private バトル判定: バトル判定;

  constructor() {
    super('attacking', 'アタック中');
    this.バトル判定 = new バトル判定();
  }

  判定(カード?: カード): boolean {
    if (!カード) return false;
    return this.バトル判定.アタック中か(カード);
  }
}
