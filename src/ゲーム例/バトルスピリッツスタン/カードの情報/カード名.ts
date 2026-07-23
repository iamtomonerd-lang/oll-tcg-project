import { カード } from '../../../データ/カード/カード.js';

export class カード名ルール {
  カード名を取得(カード: カード): string {
    const 名称データ = カード.名称 as any;
    return 名称データ.カード名 ?? '';
  }

  カード名は有効(カード: カード): boolean {
    const カード名 = this.カード名を取得(カード);
    return カード名 !== null && カード名 !== undefined && カード名.length > 0;
  }
}
