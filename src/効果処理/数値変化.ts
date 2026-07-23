import { 効果, 効果実行文脈, 効果結果 } from './効果.js';
import { カード } from '../データ/カード/カード.js';
import { プレイヤー } from '../データ/プレイヤー/プレイヤー.js';
import { ゲーム物 } from '../データ/ゲーム物/ゲーム物.js';

export type 数値変化対象 = カード | プレイヤー | ゲーム物;

export class 数値変化効果 extends 効果 {
  constructor(識別子: string = '数値-変化', 名前: string = '数値変化') {
    super(識別子, 名前);
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    const { 対象, 追加データ } = 文脈;

    if (!対象 || !(対象 instanceof カード || 対象 instanceof プレイヤー || 対象 instanceof ゲーム物)) {
      return { 成功: false, メッセージ: '対象はカード、プレイヤー、またはゲーム物である必要があります' };
    }

    const 数値キー = 追加データ?.キー as string | undefined;
    const 増加量 = 追加データ?.増加量 as number | undefined;

    if (!数値キー || 増加量 === undefined) {
      return { 成功: false, メッセージ: '追加データのキーまたは増加量が不足しています' };
    }

    const 変更前 = (対象 as any).数値を取得(数値キー);
    const 変更後 = (対象 as any).数値を加算(数値キー, 増加量);

    return {
      成功: true,
      メッセージ: `${数値キー}を${変更前}から${変更後}に変更しました`,
      データ: { 対象, キー: 数値キー, 変更前, 変更後, 増加量 },
    };
  }
}
