import { カード } from '../../../データ/カード/カード.js';
import { Lvルール } from '../カードの情報/Lv.js';

// 真界放判定（ルール層 ＝ 状態を返すだけ）
// 《真界放》：Lv2コストに真界放と書かれているスピリットやネクサスが持つ共通効果（12-2-1-1）。
export class 真界放判定 {
  private Lvルール: Lvルール;

  constructor() {
    this.Lvルール = new Lvルール();
  }

  // 《真界放》を持つか（いずれかのLvに真界放の指定があるか。12-2-1-1-1）
  真界放を持つか(カード: カード): boolean {
    return this.Lvルール.Lvを取得(カード).some(lv => lv.真界放 === true);
  }

  // 真界放状態か：《真界放》を持つカードが、真界放指定のあるLvに現在いるか（12-2-1-1-3）
  // この状態でのみ、Lv2コストと同じ色で書かれた《真界放》効果を発揮できる。
  真界放状態か(カード: カード, 現在のLv: number): boolean {
    const 該当Lv情報 = this.Lvルール.Lvを取得(カード).find(lv => lv.level === 現在のLv);
    return 該当Lv情報?.真界放 === true;
  }
}
