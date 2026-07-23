import { バトルスピリッツスタンカード } from '../カード.js';

export class カード名ルール {
  カード名を取得(カード: バトルスピリッツスタンカード): string {
    return カード.名称.カード名;
  }

  カード名は有効(カード: バトルスピリッツスタンカード): boolean {
    const カード名 = this.カード名を取得(カード);
    return カード名 !== null && カード名 !== undefined && カード名.length > 0;
  }
}
