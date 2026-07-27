import { カード } from '../../../データ/カード/カード.js';
import { BP判定 } from '../判定/BP判定.js';
import { Lv判定 } from '../判定/Lv判定.js';
import { 真界放判定 } from '../判定/真界放判定.js';
import { コア管理 } from './コア管理.js';

export class BP管理 {
  private BP判定: BP判定;
  private Lv判定: Lv判定;
  private 真界放判定: 真界放判定;
  private コア管理: コア管理;

  constructor() {
    this.BP判定 = new BP判定();
    this.Lv判定 = new Lv判定();
    this.真界放判定 = new 真界放判定();
    this.コア管理 = new コア管理();
  }

  現在のBPを取得(カード: カード): number {
    // BPは「この1枚の今の数」なので数値Mapで管理する
    let BP = カード.数値を取得('BP');

    // Gen-Boのアタック中BP+2000効果：毎回条件を判定
    if (カード.状態を取得('アタック中')) {
      if (this.真界放判定.真界放を持つか(カード)) {
        const カード保持者 = this.コア管理.カードを保持者に(カード);
        const ソウルコアあり = カード保持者.ソウルコアあるか();
        const 現在のLv = this.Lv判定.現在のLvを計算(カード, カード保持者.コア数を取得(), ソウルコアあり);

        if (現在のLv === 2 || ソウルコアあり) {
          BP += 2000;
        }
      }
    }

    return BP;
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
