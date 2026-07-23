import { カード } from '../../../データ/カード/カード.js';

export class 作品アイコンルール {
  作品アイコンを取得(カード: カード): string {
    const 名称データ = カード.名称 as any;
    return 名称データ.作品アイコン ?? '';
  }

  作品アイコンは有効(カード: カード): boolean {
    const 作品アイコン = this.作品アイコンを取得(カード);
    return 作品アイコン !== null && 作品アイコン !== undefined && 作品アイコン.length > 0;
  }

  作品アイコンが同じ(カード1: カード, カード2: カード): boolean {
    return this.作品アイコンを取得(カード1) === this.作品アイコンを取得(カード2);
  }
}
