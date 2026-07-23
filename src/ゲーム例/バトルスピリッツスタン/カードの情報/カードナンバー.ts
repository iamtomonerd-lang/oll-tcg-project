import { カード } from '../../../データ/カード/カード.js';

export class カードナンバールール {
  カードナンバーを取得(カード: カード): string {
    const 名称データ = カード.名称 as any;
    return 名称データ.カードナンバー ?? '';
  }

  カードナンバーは有効(カード: カード): boolean {
    const カードナンバー = this.カードナンバーを取得(カード);
    return カードナンバー !== null && カードナンバー !== undefined && カードナンバー.length > 0;
  }

  カードナンバーが同じ(カード1: カード, カード2: カード): boolean {
    return this.カードナンバーを取得(カード1) === this.カードナンバーを取得(カード2);
  }
}
