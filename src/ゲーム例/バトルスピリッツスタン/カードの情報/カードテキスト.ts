import { カード } from '../../../データ/カード/カード.js';

export class カードテキストルール {
  カードテキストを取得(カード: カード): string {
    const 名称データ = カード.名称 as any;
    return 名称データ.カードテキスト ?? '';
  }

  カードテキストは有効(カード: カード): boolean {
    const カードテキスト = this.カードテキストを取得(カード);
    return カードテキスト !== null && カードテキスト !== undefined && カードテキスト.length > 0;
  }

  カードテキストを持つ(カード: カード): boolean {
    return this.カードテキストは有効(カード);
  }
}
