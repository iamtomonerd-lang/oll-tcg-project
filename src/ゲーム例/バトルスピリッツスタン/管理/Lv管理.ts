import { カード } from '../../../データ/カード/カード.js';
import { Lv判定 } from '../判定/Lv判定.js';
import { BP管理 } from './BP管理.js';

export class Lv管理 {
  private Lv判定: Lv判定;
  private BP管理: BP管理;

  constructor() {
    this.Lv判定 = new Lv判定();
    this.BP管理 = new BP管理();
  }

  現在のLvを取得(カード: カード): number {
    // Lvは「この1枚の今の数」なので数値Mapで管理する
    const Lv = カード.数値を取得('Lv');
    // 未設定（0）の場合は初期値 Lv1
    return Lv >= 1 ? Lv : 1;
  }

  // Lvが変わるとBPも自動で変わる（Lvに対応した基本BPへ同期する）
  Lvを上げる(カード: カード, 新しいLv: number): void {
    const 現在のLv = this.現在のLvを取得(カード);

    if (新しいLv > 現在のLv) {
      カード.数値を設定('Lv', 新しいLv);
      this.BP管理.Lvに対応したBPに更新(カード, 新しいLv);
    }
  }

  Lvを下げる(カード: カード, 新しいLv: number): void {
    const 現在のLv = this.現在のLvを取得(カード);

    if (新しいLv < 現在のLv) {
      カード.数値を設定('Lv', 新しいLv);
      this.BP管理.Lvに対応したBPに更新(カード, 新しいLv);
    }
  }

  // 現在のコア数はソウルコアを含む総数。
  // 計算されたLvを常に反映する（召喚直後などLvが未設定＝暗黙のLv1の状態からでも、
  // 計算結果が同じLv1であってもBPを確実に同期させるため、変化の有無で分岐しない）。
  Lvを更新(カード: カード, 現在のコア数: number, ソウルコアあり: boolean = false): void {
    const 計算されたLv = this.Lv判定.現在のLvを計算(カード, 現在のコア数, ソウルコアあり);
    カード.数値を設定('Lv', 計算されたLv);
    this.BP管理.Lvに対応したBPに更新(カード, 計算されたLv);
  }
}
