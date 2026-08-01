import { カード } from '../../../../データ/カード/カード.js';
import { 効果条件 } from '../条件.js';

// 「バトル終了時」条件
// バトルが終了したときに発動する効果の条件
export class バトル終了時条件 extends 効果条件 {
  constructor() {
    super('battle-end', 'バトル終了時');
  }

  判定(カード?: カード): boolean {
    // この条件は、バトル終了時にカード側から呼び出されるため、常に真を返す
    // 実際の判定はバトル管理側で行われる
    return true;
  }
}
