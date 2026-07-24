import { カード } from '../../../データ/カード/カード.js';

export class カード種別ルール {
  カード種別を取得(カード: カード): string {
    const 種別 = (カード.名称 as any).カード種別;
    return typeof 種別 === 'string' ? 種別 : '';
  }

  カード種別は有効(カード: カード): boolean {
    return this.カード種別を取得(カード).length > 0;
  }

  カード種別が同じか(カード1: カード, カード2: カード): boolean {
    return this.カード種別を取得(カード1) === this.カード種別を取得(カード2);
  }

  スピリットか(カード: カード): boolean {
    return this.カード種別を取得(カード) === 'スピリット';
  }

  ネクサスか(カード: カード): boolean {
    return this.カード種別を取得(カード) === 'ネクサス';
  }

  マジックか(カード: カード): boolean {
    return this.カード種別を取得(カード) === 'マジック';
  }
}
