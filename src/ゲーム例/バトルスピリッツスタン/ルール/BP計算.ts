import { カード } from '../../../データ/カード/カード.js';

interface Lv情報 {
  level: number;
  cost: number;
  bp: number;
}

export class BP計算 {
  // スピリットが持つルール
  // 現在のLvに対応したBPを計算する

  BPを取得(カード: カード, 現在のLv: number): number {
    const Lv情報配列 = (カード.名称 as any).Lv as Lv情報[] | undefined;

    if (!Array.isArray(Lv情報配列)) {
      return 0;
    }

    const Lv情報 = Lv情報配列.find(lv => lv.level === 現在のLv);
    if (!Lv情報) {
      return 0;
    }

    return Lv情報.bp;
  }

  最大BPを取得(カード: カード): number {
    const Lv情報配列 = (カード.名称 as any).Lv as Lv情報[] | undefined;

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const 最大Lv情報 = Lv情報配列[Lv情報配列.length - 1];
    return 最大Lv情報.bp;
  }

  最小BPを取得(カード: カード): number {
    const Lv情報配列 = (カード.名称 as any).Lv as Lv情報[] | undefined;

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const 最小Lv情報 = Lv情報配列[0];
    return 最小Lv情報.bp;
  }
}
