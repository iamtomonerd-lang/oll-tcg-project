import { アタックブロック判定 } from '../../ルール/アタックブロック判定.js';
import { Lvシステム } from '../../ルール/Lvシステム.js';
import { BP計算 } from '../../ルール/BP計算.js';
import { 消滅判定 } from '../../ルール/消滅判定.js';

export class スピリット {
  readonly 識別子 = 'スピリット';
  readonly 表示名 = 'スピリット';
  readonly アタックブロック判定 = new アタックブロック判定();
  readonly Lvシステム = new Lvシステム();
  readonly BP計算 = new BP計算();
  readonly 消滅判定 = new 消滅判定();

  // スピリットが持つルール：
  // - アタックブロック判定：アタック/ブロック可能判定、召喚直後アタック可能
  // - Lvシステム：Lv管理、Lvアップ/ダウン判定、真界放対応
  // - BP計算：現在のLvに対応したBP計算
  // - 消滅判定：Lv1コスト未満での消滅判定
}
