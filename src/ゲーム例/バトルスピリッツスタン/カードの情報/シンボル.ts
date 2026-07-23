import { カード } from '../../../データ/カード/カード.js';

export type シンボル色 = '赤' | '紫' | '白' | '緑' | '青' | '黄';

export interface シンボル情報 {
  色: シンボル色;
  タイプ: '通常' | 'EX';
}

export class シンボルルール {
  シンボルを取得(カード: カード): シンボル情報[] {
    const 名称データ = カード.名称 as any;
    const シンボル = 名称データ.シンボル ?? [];
    return Array.isArray(シンボル) ? シンボル : [];
  }

  シンボルは有効(カード: カード): boolean {
    const シンボル = this.シンボルを取得(カード);
    return Array.isArray(シンボル) && シンボル.length > 0;
  }

  色のシンボルを持つ(カード: カード, 色: シンボル色): boolean {
    const シンボル一覧 = this.シンボルを取得(カード);
    return シンボル一覧.some(s => s.色 === 色);
  }

  EXシンボルを持つ(カード: カード): boolean {
    const シンボル一覧 = this.シンボルを取得(カード);
    return シンボル一覧.some(s => s.タイプ === 'EX');
  }

  シンボル数を取得(カード: カード): number {
    const シンボル = this.シンボルを取得(カード);
    return シンボル.length;
  }

  指定色のシンボル数を取得(カード: カード, 色: シンボル色): number {
    const シンボル一覧 = this.シンボルを取得(カード);
    return シンボル一覧.filter(s => s.色 === 色).length;
  }

  EXシンボル数を取得(カード: カード): number {
    const シンボル一覧 = this.シンボルを取得(カード);
    return シンボル一覧.filter(s => s.タイプ === 'EX').length;
  }
}
