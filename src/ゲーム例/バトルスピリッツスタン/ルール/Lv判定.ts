import { カード } from '../../../データ/カード/カード.js';
import { Lvルール } from '../カードの情報/Lv.js';

export class Lv判定 {
  private Lvルール: Lvルール;

  constructor() {
    this.Lvルール = new Lvルール();
  }

  現在のLvを計算(カード: カード, 現在のコア数: number, ソウルコアあり: boolean = false): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 1;
    }

    let 現在のLv = 1;
    for (const Lv情報 of Lv情報配列) {
      const コア条件 = 現在のコア数 >= Lv情報.cost;
      const 真界放条件 = (Lv情報.真界放 ?? false) && ソウルコアあり;

      if (コア条件 || 真界放条件) {
        現在のLv = Lv情報.level;
      } else {
        break;
      }
    }

    return 現在のLv;
  }

  Lvアップ可能か(カード: カード, 現在のLv: number, 追加コア数: number, 現在のコア数: number, ソウルコアあり: boolean = false): boolean {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列)) {
      return false;
    }

    const 次のLv情報 = Lv情報配列.find(lv => lv.level === 現在のLv + 1);
    if (!次のLv情報) {
      return false;
    }

    const コア合計 = 現在のコア数 + 追加コア数;
    const コア条件 = コア合計 >= 次のLv情報.cost;
    const 真界放条件 = (次のLv情報.真界放 ?? false) && ソウルコアあり;

    return コア条件 || 真界放条件;
  }

  Lvダウンするか(カード: カード, 現在のLv: number, 現在のコア数: number, ソウルコアあり: boolean = false): boolean {
    const 新しいLv = this.計算Lvダウン(カード, 現在のコア数, ソウルコアあり);
    return 新しいLv < 現在のLv;
  }

  計算Lvダウン(カード: カード, 現在のコア数: number, ソウルコアあり: boolean = false): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列)) {
      return 1;
    }

    let 新しいLv = 1;
    for (const Lv情報 of Lv情報配列) {
      const コア条件 = 現在のコア数 >= Lv情報.cost;
      const 真界放条件 = (Lv情報.真界放 ?? false) && ソウルコアあり;

      if (コア条件 || 真界放条件) {
        新しいLv = Lv情報.level;
      } else {
        break;
      }
    }

    return 新しいLv;
  }
}
