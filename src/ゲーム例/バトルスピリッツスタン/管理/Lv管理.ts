import { カード } from '../../../データ/カード/カード.js';
import { Lv判定 } from '../判定/Lv判定.js';

export class Lv管理 {
  private Lv判定: Lv判定;

  constructor() {
    this.Lv判定 = new Lv判定();
  }

  現在のLvを取得(カード: カード): number {
    // Lvは「この1枚の今の数」なので数値Mapで管理する
    const Lv = カード.数値を取得('Lv');
    // 未設定（0）の場合は初期値 Lv1
    return Lv >= 1 ? Lv : 1;
  }

  Lvを上げる(カード: カード, 新しいLv: number): void {
    const 現在のLv = this.現在のLvを取得(カード);

    if (新しいLv > 現在のLv) {
      カード.数値を設定('Lv', 新しいLv);
    }
  }

  Lvを下げる(カード: カード, 新しいLv: number): void {
    const 現在のLv = this.現在のLvを取得(カード);

    if (新しいLv < 現在のLv) {
      カード.数値を設定('Lv', 新しいLv);
    }
  }

  // 現在のコア数はソウルコアを含む総数
  Lvを更新(カード: カード, 現在のコア数: number, ソウルコアあり: boolean = false): void {
    const 現在のLv = this.現在のLvを取得(カード);
    const 計算されたLv = this.Lv判定.現在のLvを計算(カード, 現在のコア数, ソウルコアあり);

    if (計算されたLv > 現在のLv) {
      this.Lvを上げる(カード, 計算されたLv);
    } else if (計算されたLv < 現在のLv) {
      this.Lvを下げる(カード, 計算されたLv);
    }
  }
}
