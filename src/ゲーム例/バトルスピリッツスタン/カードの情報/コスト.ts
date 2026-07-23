import { カード } from '../../../データ/カード/カード.js';

export class コストルール {
  コストを取得(カード: カード): number {
    const 名称データ = カード.名称 as any;
    return 名称データ.コスト ?? 0;
  }

  コストは有効(カード: カード): boolean {
    const コスト = this.コストを取得(カード);
    return コスト >= 0 && Number.isInteger(コスト);
  }

  コスト支払い可能(カード: カード, プレイヤーリソース: number): boolean {
    const コスト = this.コストを取得(カード);
    return プレイヤーリソース >= コスト;
  }
}
