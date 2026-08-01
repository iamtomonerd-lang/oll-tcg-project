import { 効果, 効果実行文脈, 効果結果 } from '../../../../効果処理/効果.js';
import { カード } from '../../../../データ/カード/カード.js';
import { BP管理 } from '../../管理/BP管理.js';

// BP上昇効果
// 指定された量だけカードのBPを上昇させる
export class BP上昇効果 extends 効果 {
  private BP管理: BP管理;

  constructor(private 上昇量: number) {
    super('bp-increase', `BP+${上昇量}`);
    this.BP管理 = new BP管理();
  }

  async 実行(文脈: 効果実行文脈): Promise<効果結果> {
    const カード = 文脈.対象 as カード;
    if (!カード) {
      return { 成功: false, メッセージ: '対象カードが指定されていません' };
    }

    const 現在のBP = this.BP管理.現在のBPを取得(カード);
    this.BP管理.効果によるBPを変更(カード, this.上昇量);
    const 新しいBP = this.BP管理.現在のBPを取得(カード);

    return {
      成功: true,
      メッセージ: `${カード.名称.表示名}のBPが${現在のBP}から${新しいBP}に上昇しました`,
      データ: { 変更前BP: 現在のBP, 変更後BP: 新しいBP },
    };
  }
}
