import { カード } from '../../../データ/カード/カード.js';
import { プレイヤー } from '../../../データ/プレイヤー/プレイヤー.js';

// 効果条件の基底クラス
// 効果が発動可能かどうかを判定する条件を定義する。
export abstract class 効果条件 {
  readonly 識別子: string;
  readonly 名前: string;

  constructor(識別子: string, 名前: string) {
    this.識別子 = 識別子;
    this.名前 = 名前;
  }

  // 条件が満たされているかを判定する
  abstract 判定(カード?: カード, プレイヤー?: プレイヤー): boolean;
}
