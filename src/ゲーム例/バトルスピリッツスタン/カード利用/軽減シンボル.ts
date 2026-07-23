import { バトルスピリッツスタンカード } from '../カード.js';
import { コストルール } from './コスト.js';

export class 軽減シンボルルール {
  private コストルール: コストルール;

  constructor() {
    this.コストルール = new コストルール();
  }

  軽減シンボルを取得(カード: バトルスピリッツスタンカード): { 種類: string; 数値: number }[] {
    return カード.名称.軽減シンボル;
  }

  軽減シンボルは有効(カード: バトルスピリッツスタンカード): boolean {
    const 軽減シンボル = this.軽減シンボルを取得(カード);
    if (!Array.isArray(軽減シンボル)) {
      return false;
    }

    return 軽減シンボル.every(
      シンボル => シンボル.種類 && typeof シンボル.種類 === 'string' && シンボル.数値 >= 0
    );
  }

  軽減後のコストを計算(
    カード: バトルスピリッツスタンカード,
    フィールドシンボル: { [種類: string]: number }
  ): number {
    const 元のコスト = this.コストルール.コストを取得(カード);
    const 軽減シンボル = this.軽減シンボルを取得(カード);

    let 軽減量 = 0;

    for (const シンボル of 軽減シンボル) {
      const フィールドシンボル数 = フィールドシンボル[シンボル.種類] ?? 0;
      const 軽減できる量 = Math.min(シンボル.数値, フィールドシンボル数);
      軽減量 += 軽減できる量;
    }

    const 最終コスト = Math.max(0, 元のコスト - 軽減量);
    return 最終コスト;
  }

}
