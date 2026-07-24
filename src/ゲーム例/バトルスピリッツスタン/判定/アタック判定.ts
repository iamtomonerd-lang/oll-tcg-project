import { カード } from '../../../データ/カード/カード.js';
import { カード種別ルール } from '../カードの情報/カード種別.js';

export class アタック判定 {
  private カード種別ルール: カード種別ルール;

  constructor() {
    this.カード種別ルール = new カード種別ルール();
  }

  アタック可能か(カード: カード): boolean {
    return this.カード種別ルール.スピリットか(カード);
  }

  召喚直後アタック可能(): boolean {
    // スピリットは召喚されたばかりのターンからアタックできる（サマニング・シックネス無し）
    return true;
  }
}
