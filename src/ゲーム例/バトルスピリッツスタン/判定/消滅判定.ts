import { カード } from '../../../データ/カード/カード.js';
import { Lvルール } from '../カードの情報/Lv.js';

export class 消滅判定 {
  // スピリットが持つルール
  // Lv1コスト未満のコアになるとスピリットは消滅する
  private Lvルール: Lvルール;

  constructor() {
    this.Lvルール = new Lvルール();
  }

  // 現在のコア数はソウルコアを含む総数（ソウルコアも維持コアに数える）
  消滅判定(カード: カード, 現在のコア数: number): boolean {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return false;
    }

    const Lv1情報 = Lv情報配列.find(lv => lv.level === 1);
    if (!Lv1情報) {
      return false;
    }

    // Lv1コスト未満（ソウルコア込みの総数で判定）になったら消滅
    return 現在のコア数 < Lv1情報.cost;
  }

  最小必要コア数を取得(カード: カード): number {
    const Lv情報配列 = this.Lvルール.Lvを取得(カード);

    if (!Array.isArray(Lv情報配列) || Lv情報配列.length === 0) {
      return 0;
    }

    const Lv1情報 = Lv情報配列.find(lv => lv.level === 1);
    if (!Lv1情報) {
      return 0;
    }

    // Lv1を維持するために必要な最小コア数（Lv1コスト以上なければ消滅）
    return Lv1情報.cost;
  }
}
