import { カード } from '../../../データ/カード/カード.js';

export class 軽減シンボルルール {
  軽減シンボルを取得(カード: カード): string[] {
    const 名称データ = カード.名称 as any;
    const 軽減シンボル = 名称データ.軽減シンボル ?? [];
    return Array.isArray(軽減シンボル) ? 軽減シンボル : [];
  }

  軽減後のコストを計算(
    カード: カード,
    オリジナルコスト: number,
    フィールドのシンボル: string[]
  ): number {
    const 軽減シンボル = this.軽減シンボルを取得(カード);

    if (軽減シンボル.length === 0) {
      return オリジナルコスト;
    }

    let 軽減可能な数 = 0;
    for (const シンボル of 軽減シンボル) {
      if (フィールドのシンボル.includes(シンボル)) {
        軽減可能な数++;
      }
    }

    const 軽減量 = Math.min(軽減可能な数, オリジナルコスト);
    return オリジナルコスト - 軽減量;
  }

  軽減シンボルは有効(カード: カード): boolean {
    const 軽減シンボル = this.軽減シンボルを取得(カード);
    return Array.isArray(軽減シンボル) && 軽減シンボル.length > 0;
  }

  軽減可能な数を計算(
    カード: カード,
    フィールドのシンボル: string[]
  ): number {
    const 軽減シンボル = this.軽減シンボルを取得(カード);

    if (軽減シンボル.length === 0) {
      return 0;
    }

    let 軽減可能な数 = 0;
    for (const シンボル of 軽減シンボル) {
      if (フィールドのシンボル.includes(シンボル)) {
        軽減可能な数++;
      }
    }

    return 軽減可能な数;
  }
}
