import { 効果, 効果実行文脈, 効果結果 } from './効果.js';
import { カード } from '../データ/カード/カード.js';
import { プレイヤー } from '../データ/プレイヤー/プレイヤー.js';
import { ゲーム物 } from '../データ/ゲーム物/ゲーム物.js';
import { ゾーン } from '../データ/ゾーン/ゾーン.js';

export type 状態変更対象 = カード | プレイヤー | ゲーム物 | ゾーン;

export class 状態変更効果 extends 効果 {
  constructor(識別子: string = '状態-変更', 名前: string = '状態変更') {
    super(識別子, 名前);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    const { 対象, 追加データ } = 文脈;

    if (!対象 || !(対象 instanceof カード || 対象 instanceof プレイヤー || 対象 instanceof ゲーム物 || 対象 instanceof ゾーン)) {
      return { 成功: false, メッセージ: '対象はカード、プレイヤー、ゲーム物、またはゾーンである必要があります' };
    }

    const 状態キー = 追加データ?.キー as string | undefined;
    const 状態値 = 追加データ?.値;

    if (!状態キー) {
      return { 成功: false, メッセージ: '追加データのキーが不足しています' };
    }

    const 変更前 = (対象 as any).状態を取得(状態キー);
    (対象 as any).状態を設定(状態キー, 状態値);
    const 変更後 = (対象 as any).状態を取得(状態キー);

    return {
      成功: true,
      メッセージ: `状態 ${状態キー} を ${変更前} から ${変更後} に変更しました`,
      データ: { 対象, キー: 状態キー, 変更前, 変更後 },
    };
  }
}
