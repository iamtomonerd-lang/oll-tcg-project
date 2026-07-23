import { カード } from '../../../データ/カード/カード.js';

export class 消滅判定 {
  // スピリットが持つルール
  // Lv1コスト未満のコアになるとスピリットは消滅する

  消滅判定(カード: カード, 現在のコア数: number): boolean {
    const Lv情報配列 = (カード.名称 as any).Lv ?? [];

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return false;
    }

    const Lv1情報 = Lv情報配列.find(lv => lv.level === 1);
    if (!Lv1情報) {
      return false;
    }

    // Lv1コスト未満になったら消滅
    return 現在のコア数 < Lv1情報.cost;
  }

  最小必要コア数を取得(カード: カード): number {
    const Lv情報配列 = (カード.名称 as any).Lv ?? [];

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const Lv1情報 = Lv情報配列.find(lv => lv.level === 1);
    if (!Lv1情報) {
      return 0;
    }

    // Lv1を維持するために必要な最小コア数
    return Lv1情報.cost;
  }
}
