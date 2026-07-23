import { ゲームエンジン, ゲームフェーズ } from '../ゲームエンジン.js';
import { プレイヤー } from '../データ/プレイヤー/プレイヤー.js';
import { ゾーン } from '../データ/ゾーン/ゾーン.js';

export class バトルスピリッツスタン {
  private ゲーム: ゲームエンジン;
  private プレイヤーA: プレイヤー;
  private プレイヤーB: プレイヤー;
  private Aデッキ: ゾーン;
  private Bデッキ: ゾーン;
  private ゲーム中: boolean;
  private 現在のフェーズ: ゲームフェーズ | null;

  constructor() {
    this.ゲーム = new ゲームエンジン();
    this.ゲーム中 = false;
    this.現在のフェーズ = null;

    this.プレイヤーA = new プレイヤー('player-A', 'プレイヤーA');
    this.プレイヤーB = new プレイヤー('player-B', 'プレイヤーB');

    this.ゲーム.プレイヤーを追加(this.プレイヤーA);
    this.ゲーム.プレイヤーを追加(this.プレイヤーB);

    this.Aデッキ = new ゾーン('A-deck', { 識別子: 'deck', 表示名: 'プレイヤーA のデッキ' });
    this.Bデッキ = new ゾーン('B-deck', { 識別子: 'deck', 表示名: 'プレイヤーB のデッキ' });

    this.ゲーム.ゾーンを追加(this.Aデッキ);
    this.ゲーム.ゾーンを追加(this.Bデッキ);
  }

  ゲームを初期化(): void {
    this.ゲーム中 = true;
    this.ゲーム.ゲームを開始();
  }

  フェーズを設定(フェーズ: ゲームフェーズ): void {
    this.現在のフェーズ = フェーズ;
    this.ゲーム.現在のフェーズを設定(フェーズ);
  }

  勝利条件を判定(): { 勝者: プレイヤー | null; 理由: string } {
    if (!this.ゲーム中) {
      return { 勝者: null, 理由: 'ゲームが開始されていません' };
    }

    const Aライフ = this.プレイヤーA.ライフを取得();
    const Bライフ = this.プレイヤーB.ライフを取得();

    // 条件1: 相手のライフが0になった
    if (Aライフ <= 0) {
      this.ゲーム中 = false;
      return { 勝者: this.プレイヤーB, 理由: 'プレイヤーA のライフが 0 になった' };
    }

    if (Bライフ <= 0) {
      this.ゲーム中 = false;
      return { 勝者: this.プレイヤーA, 理由: 'プレイヤーB のライフが 0 になった' };
    }

    // 条件2: 相手のスタートステップに相手のデッキが0枚である
    if (this.現在のフェーズ && this.現在のフェーズ.名前 === 'スタートステップ') {
      const Aデッキ枚数 = this.Aデッキ.カード枚数を取得();
      const Bデッキ枚数 = this.Bデッキ.カード枚数を取得();

      if (Aデッキ枚数 === 0) {
        this.ゲーム中 = false;
        return { 勝者: this.プレイヤーB, 理由: 'プレイヤーA のデッキが 0 枚になった' };
      }

      if (Bデッキ枚数 === 0) {
        this.ゲーム中 = false;
        return { 勝者: this.プレイヤーA, 理由: 'プレイヤーB のデッキが 0 枚になった' };
      }
    }

    return { 勝者: null, 理由: 'ゲーム継続中' };
  }

  プレイヤーAを取得(): プレイヤー {
    return this.プレイヤーA;
  }

  プレイヤーBを取得(): プレイヤー {
    return this.プレイヤーB;
  }

  Aデッキを取得(): ゾーン {
    return this.Aデッキ;
  }

  Bデッキを取得(): ゾーン {
    return this.Bデッキ;
  }

  ゲーム中判定(): boolean {
    return this.ゲーム中;
  }

  数値をクリップ(プレイヤー: プレイヤー): void {
    const ライフ = プレイヤー.ライフを取得();
    if (ライフ < 0) {
      プレイヤー.ライフを設定(0);
    }
  }

  ゲーム状態を修正(): void {
    this.数値をクリップ(this.プレイヤーA);
    this.数値をクリップ(this.プレイヤーB);
  }
}
