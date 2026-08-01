import { カード } from '../../../データ/カード/カード.js';

export class レアリティルール {
  レアリティを取得(カード: カード): string {
    const 名称データ = カード.名称 as any;
    return 名称データ.レアリティ ?? '';
  }

  レアリティは有効(カード: カード): boolean {
    const レアリティ = this.レアリティを取得(カード);
    return レアリティ !== null && レアリティ !== undefined && レアリティ.length > 0;
  }

  レアリティが同じ(カード1: カード, カード2: カード): boolean {
    return this.レアリティを取得(カード1) === this.レアリティを取得(カード2);
  }
}
