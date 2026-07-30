import { カード } from '../../../データ/カード/カード.js';
import { BP判定 } from '../判定/BP判定.js';

export class BP管理 {
  private BP判定: BP判定;
  // 常在効果によるBPの増減を聞く先。試合が組み上がってから差し込む。
  // BP管理は「今のBPはいくらか」を答えるだけで、常在効果の中身は知らない。
  private 常在BP補正の供給元: ((カード: カード) => number) | undefined;

  constructor() {
    this.BP判定 = new BP判定();
  }

  常在BP補正の供給元を設定(供給元: (カード: カード) => number): void {
    this.常在BP補正の供給元 = 供給元;
  }

  現在のBPを取得(カード: カード): number {
    // BPは「この1枚の今の数」なので数値Mapで管理する
    const BP = カード.数値を取得('BP');
    // 『アタック中』このスピリットをBP+2000する ——のような常在効果の分を足す。
    // 常在効果は「今そうなっている」ものなので、書き込まずに毎回足して答える。
    const 補正 = this.常在BP補正の供給元 ? this.常在BP補正の供給元(カード) : 0;
    return Math.max(0, BP + 補正);
  }

  BPを設定(カード: カード, 新しいBP: number): void {
    カード.数値を設定('BP', 新しいBP);
  }

  Lvに対応したBPに更新(カード: カード, Lvレベル: number): void {
    const 基本BP = this.BP判定.BPを計算(カード, Lvレベル);
    this.BPを設定(カード, 基本BP);
  }

  効果によるBPを変更(カード: カード, 変更量: number): void {
    // 記録してある値に足す。現在のBPは常在効果の分を含むため、そこに足すと二重に乗る。
    const 記録されたBP = カード.数値を取得('BP');
    this.BPを設定(カード, Math.max(0, 記録されたBP + 変更量));
  }

  最大BPを取得(カード: カード): number {
    return this.BP判定.最大BPを計算(カード);
  }

  最小BPを取得(カード: カード): number {
    return this.BP判定.最小BPを計算(カード);
  }
}
