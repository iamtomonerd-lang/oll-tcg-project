import { カード } from '../../../データ/カード/カード.js';
import { BP判定 } from '../ルール/BP判定.js';

export class BP管理 {
  private BP判定: BP判定;

  constructor() {
    this.BP判定 = new BP判定();
  }

  現在のBPを取得(カード: カード): number {
    // BPは「この1枚の今の数」なので数値Mapで管理する
    return カード.数値を取得('BP');
  }

  BPを設定(カード: カード, 新しいBP: number): void {
    カード.数値を設定('BP', 新しいBP);
  }

  Lvに対応したBPに更新(カード: カード, Lvレベル: number): void {
    const 基本BP = this.BP判定.BPを計算(カード, Lvレベル);
    this.BPを設定(カード, 基本BP);
  }

  効果によるBPを変更(カード: カード, 変更量: number): void {
    const 現在のBP = this.現在のBPを取得(カード);
    const 新しいBP = Math.max(0, 現在のBP + 変更量);
    this.BPを設定(カード, 新しいBP);
  }

  最大BPを取得(カード: カード): number {
    return this.BP判定.最大BPを計算(カード);
  }

  最小BPを取得(カード: カード): number {
    return this.BP判定.最小BPを計算(カード);
  }
}
