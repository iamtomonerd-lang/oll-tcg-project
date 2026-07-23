import { バトルスピリッツスタンカード } from '../カード.js';

export class コストルール {
  コストを取得(カード: バトルスピリッツスタンカード): number {
    return カード.名称.コスト;
  }

  コストは有効(カード: バトルスピリッツスタンカード): boolean {
    const コスト = this.コストを取得(カード);
    return コスト >= 0 && Number.isInteger(コスト);
  }

  コスト支払い可能(カード: バトルスピリッツスタンカード, プレイヤーリソース: number): boolean {
    const コスト = this.コストを取得(カード);
    return プレイヤーリソース >= コスト;
  }
}
