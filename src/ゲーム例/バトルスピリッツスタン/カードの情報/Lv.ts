import { カード } from '../../../データ/カード/カード.js';

export interface Lv情報 {
  level: number;
  cost: number;
  bp: number;
}

export class Lvルール {
  Lvを取得(カード: カード): Lv情報[] {
    const 名称データ = カード.名称 as any;
    const Lv = 名称データ.Lv ?? [];
    return Array.isArray(Lv) ? Lv : [];
  }

  Lvは有効(カード: カード): boolean {
    const Lv = this.Lvを取得(カード);
    return Array.isArray(Lv) && Lv.length > 0;
  }

  現在のLvを計算(カード: カード, コア数: number): Lv情報 | null {
    const Lv一覧 = this.Lvを取得(カード);

    if (Lv一覧.length === 0) {
      return null;
    }

    let 満たしているLv: Lv情報 | null = null;
    for (const Lv情報 of Lv一覧) {
      if (コア数 >= Lv情報.cost) {
        満たしているLv = Lv情報;
      } else {
        break;
      }
    }

    return 満たしているLv;
  }

  LvのBPを取得(Lv情報: Lv情報): number {
    return Lv情報.bp;
  }

  Lvコストを満たしているか(Lv情報: Lv情報, コア数: number): boolean {
    return コア数 >= Lv情報.cost;
  }

  最大Lvを取得(カード: カード): Lv情報 | null {
    const Lv一覧 = this.Lvを取得(カード);
    if (Lv一覧.length === 0) {
      return null;
    }
    return Lv一覧[Lv一覧.length - 1];
  }
}
