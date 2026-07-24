import { Lvシステム } from '../../ルール/Lvシステム.js';
import { 消滅判定 } from '../../ルール/消滅判定.js';

export class ネクサス {
  readonly 識別子 = 'ネクサス';
  readonly 表示名 = 'ネクサス';
  readonly Lvシステム = new Lvシステム();
  readonly 消滅判定 = new 消滅判定();

  // ネクサスが持つルール：
  // - Lvシステム：Lv管理、Lvアップ/ダウン判定、真界放対応
  // - 消滅判定：Lv1コスト未満での消滅判定
}
