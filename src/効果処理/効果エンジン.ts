import { 効果, 効果実行文脈, 効果結果 } from './効果.js';
import { 置換効果 } from './置換効果.js';

export class 効果エンジン {
  private 効果一覧: Map<string, 効果>;
  private 置換効果一覧: 置換効果[];
  private 効果スタック: 効果実行文脈[];

  constructor() {
    this.効果一覧 = new Map();
    this.置換効果一覧 = [];
    this.効果スタック = [];
  }

  効果を登録(効果: 効果): void {
    this.効果一覧.set(効果.識別子, 効果);
    if (効果 instanceof 置換効果) {
      this.置換効果一覧.push(効果);
    }
  }

  効果の登録を解除(効果識別子: string): boolean {
    const 効果 = this.効果一覧.get(効果識別子);
    if (!効果) return false;

    if (効果 instanceof 置換効果) {
      const インデックス = this.置換効果一覧.indexOf(効果);
      if (インデックス >= 0) {
        this.置換効果一覧.splice(インデックス, 1);
      }
    }

    return this.効果一覧.delete(効果識別子);
  }

  async 効果を実行(効果識別子: string, 文脈: 効果実行文脈): Promise<効果結果> {
    const 効果 = this.効果一覧.get(効果識別子);
    if (!効果) {
      return { 成功: false, メッセージ: `効果 ${効果識別子} が見つかりません` };
    }

    if (!(await 効果.実行可能判定(文脈))) {
      return { 成功: false, メッセージ: `効果 ${効果識別子} は実行できません` };
    }

    this.効果スタック.push(文脈);

    const 置換効果一覧 = this.適用可能な置換効果を取得(文脈);
    for (const 置換 of 置換効果一覧) {
      const 結果 = await 置換.実行(文脈);
      if (結果.成功) {
        this.効果スタック.pop();
        return 結果;
      }
    }

    const 結果 = await 効果.実行(文脈);
    this.効果スタック.pop();
    return 結果;
  }

  private 適用可能な置換効果を取得(文脈: 効果実行文脈): 置換効果[] {
    return this.置換効果一覧.filter(効果 => 効果.置換可能(文脈));
  }

  効果スタック一覧を取得(): 効果実行文脈[] {
    return [...this.効果スタック];
  }

  効果スタックサイズを取得(): number {
    return this.効果スタック.length;
  }

  効果スタックをクリア(): void {
    this.効果スタック = [];
  }

  効果を取得(効果識別子: string): 効果 | undefined {
    return this.効果一覧.get(効果識別子);
  }

  全効果を取得(): 効果[] {
    return Array.from(this.効果一覧.values());
  }
}
