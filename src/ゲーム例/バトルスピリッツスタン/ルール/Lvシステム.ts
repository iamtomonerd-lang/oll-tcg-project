import { カード } from '../../../データ/カード/カード.js';

export class Lvシステム {
  // スピリットが持つルール
  // Lvコストに応じてレベルを管理する
  // Lvコスト以上のコアを置くとそのLvになる
  // Lvコスト未満に減るとLvが下がる

  現在のLvを取得(カード: カード, 現在のコア数: number): number {
    const Lv情報配列 = (カード.名称 as any).Lv ?? [];

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 1;
    }

    let 現在のLv = 1;
    for (const Lv情報 of Lv情報配列) {
      if (現在のコア数 >= Lv情報.cost) {
        現在のLv = Lv情報.level;
      } else {
        break;
      }
    }

    return 現在のLv;
  }

  Lvアップ可能判定(カード: カード, 現在のLv: number, 追加コア数: number, 現在のコア数: number): boolean {
    const Lv情報配列 = (カード.名称 as any).Lv ?? [];

    if (!Array.isArray(Lv情報配列)) {
      return false;
    }

    const 次のLv情報 = Lv情報配列.find(lv => lv.level === 現在のLv + 1);
    if (!次のLv情報) {
      return false;
    }

    const コア合計 = 現在のコア数 + 追加コア数;
    return コア合計 >= 次のLv情報.cost;
  }

  Lvダウン判定(カード: カード, 現在のLv: number, 現在のコア数: number): number {
    const Lv情報配列 = (カード.名称 as any).Lv ?? [];

    if (!Array.isArray(Lv情報配列)) {
      return 1;
    }

    let 新しいLv = 1;
    for (const Lv情報 of Lv情報配列) {
      if (現在のコア数 >= Lv情報.cost) {
        新しいLv = Lv情報.level;
      } else {
        break;
      }
    }

    return 新しいLv;
  }
}
