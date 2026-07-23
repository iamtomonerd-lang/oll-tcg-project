import { カード } from '../../../データ/カード/カード.js';

export class 系統ルール {
  系統を取得(カード: カード): string[] {
    const 名称データ = カード.名称 as any;
    const 系統 = 名称データ.系統 ?? [];
    return Array.isArray(系統) ? 系統 : [];
  }

  系統は有効(カード: カード): boolean {
    const 系統 = this.系統を取得(カード);
    return Array.isArray(系統) && 系統.length > 0;
  }

  系統を持つ(カード: カード, 系統名: string): boolean {
    const 系統 = this.系統を取得(カード);
    return 系統.includes(系統名);
  }

  系統数を取得(カード: カード): number {
    const 系統 = this.系統を取得(カード);
    return 系統.length;
  }
}
