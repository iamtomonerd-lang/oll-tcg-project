import { カード } from '../データ/カード/カード.js';
import { ゾーン } from '../データ/ゾーン/ゾーン.js';
import { プレイヤー } from '../データ/プレイヤー/プレイヤー.js';
import { ゲーム物 } from '../データ/ゲーム物/ゲーム物.js';

export interface 効果実行文脈 {
  発動源?: カード | プレイヤー | ゲーム物;
  対象?: カード | プレイヤー | ゲーム物 | ゾーン;
  ゲーム?: any;
  追加データ?: Record<string, any>;
}

export interface 効果結果 {
  成功: boolean;
  メッセージ?: string;
  データ?: any;
}

export abstract class 効果 {
  readonly 識別子: string;
  readonly 名前: string;

  constructor(識別子: string, 名前: string) {
    this.識別子 = 識別子;
    this.名前 = 名前;
  }

  abstract 実行(文脈: 効果実行文脈): Promise<効果結果>;

  async 実行可能判定(文脈: 効果実行文脈): Promise<boolean> {
    return true;
  }
}
