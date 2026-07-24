import { カード } from '../../../データ/カード/カード.js';
import { Lvルール } from '../カードの情報/Lv.js';

interface Lv情報 {
  level: number;
  cost: number;
  bp: number;
}

export class BP判定 {
  private Lvルール: Lvルール;

  constructor() {
    this.Lvルール = new Lvルール();
  }

  BPを計算(カード: カード, Lvレベル: number): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列)) {
      return 0;
    }

    const Lv情報 = Lv情報配列.find(lv => lv.level === Lvレベル);
    if (!Lv情報) {
      return 0;
    }

    return Lv情報.bp;
  }

  最大BPを計算(カード: カード): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const 最大Lv情報 = Lv情報配列[Lv情報配列.length - 1];
    return 最大Lv情報.bp;
  }

  最小BPを計算(カード: カード): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const 最小Lv情報 = Lv情報配列[0];
    return 最小Lv情報.bp;
  }
}
