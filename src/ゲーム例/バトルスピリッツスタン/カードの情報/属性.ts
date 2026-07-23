import { カード } from '../../../データ/カード/カード.js';

export type 属性色 = '赤' | '紫' | '白' | '緑' | '青' | '黄';

export class 属性ルール {
  属性を取得(カード: カード): 属性色[] {
    const 名称データ = カード.名称 as any;
    const 属性 = 名称データ.属性 ?? [];
    return Array.isArray(属性) ? 属性 : [];
  }

  属性は有効(カード: カード): boolean {
    const 属性 = this.属性を取得(カード);
    return Array.isArray(属性) && 属性.length > 0;
  }

  属性を持つ(カード: カード, 属性名: 属性色): boolean {
    const 属性一覧 = this.属性を取得(カード);
    return 属性一覧.includes(属性名);
  }

  属性数を取得(カード: カード): number {
    const 属性 = this.属性を取得(カード);
    return 属性.length;
  }
}
