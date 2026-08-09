import { プレイヤー } from './データ/プレイヤー/プレイヤー.js';
import { ゾーン } from './データ/ゾーン/ゾーン.js';
import { カード } from './データ/カード/カード.js';

export interface ゲームフェーズ {
  名前: string;
  順序: number;
}

export class ゲームエンジン {
  private プレイヤー一覧: Map<string, プレイヤー>;
  private ゾーン一覧: Map<string, ゾーン>;
  private 現在のフェーズ: ゲームフェーズ | null;
  private 現在のプレイヤーインデックス: number;
  private ゲーム中フラグ: boolean;

  constructor() {
    this.プレイヤー一覧 = new Map();
    this.ゾーン一覧 = new Map();
    this.現在のフェーズ = null;
    this.現在のプレイヤーインデックス = 0;
    this.ゲーム中フラグ = false;
  }

  プレイヤーを追加(プレイヤー: プレイヤー): void {
    this.プレイヤー一覧.set(プレイヤー.識別子, プレイヤー);
  }

  プレイヤーを削除(プレイヤー識別子: string): boolean {
    return this.プレイヤー一覧.delete(プレイヤー識別子);
  }

  プレイヤーを取得(プレイヤー識別子: string): プレイヤー | undefined {
    return this.プレイヤー一覧.get(プレイヤー識別子);
  }

  全プレイヤーを取得(): プレイヤー[] {
    return Array.from(this.プレイヤー一覧.values());
  }

  現在のプレイヤーを取得(): プレイヤー | undefined {
    const プレイヤー一覧 = this.全プレイヤーを取得();
    if (プレイヤー一覧.length === 0) return undefined;
    return プレイヤー一覧[this.現在のプレイヤーインデックス % プレイヤー一覧.length];
  }

  次のプレイヤーに切り替え(): void {
    const プレイヤー一覧 = this.全プレイヤーを取得();
    if (プレイヤー一覧.length > 0) {
      this.現在のプレイヤーインデックス = (this.現在のプレイヤーインデックス + 1) % プレイヤー一覧.length;
    }
  }

  ゾーンを追加(ゾーン: ゾーン): void {
    this.ゾーン一覧.set(ゾーン.識別子, ゾーン);
  }

  ゾーンを削除(ゾーン識別子: string): boolean {
    return this.ゾーン一覧.delete(ゾーン識別子);
  }

  ゾーンを取得(ゾーン識別子: string): ゾーン | undefined {
    return this.ゾーン一覧.get(ゾーン識別子);
  }

  全ゾーンを取得(): ゾーン[] {
    return Array.from(this.ゾーン一覧.values());
  }

  現在のフェーズを設定(フェーズ: ゲームフェーズ): void {
    this.現在のフェーズ = フェーズ;
  }

  現在のフェーズを取得(): ゲームフェーズ | null {
    return this.現在のフェーズ;
  }

  ゲームを開始(): void {
    this.ゲーム中フラグ = true;
  }

  ゲームを終了(): void {
    this.ゲーム中フラグ = false;
  }

  ゲーム中判定(): boolean {
    return this.ゲーム中フラグ;
  }

  ゲーム状態を取得() {
    return {
      プレイヤー: this.全プレイヤーを取得(),
      ゾーン: this.全ゾーンを取得(),
      現在のフェーズ: this.現在のフェーズ,
      現在のプレイヤー: this.現在のプレイヤーを取得(),
      ゲーム中: this.ゲーム中フラグ,
    };
  }

  // 同じ盤面の別物を作る（先読みで手を試すため）。
  //
  // プレイヤーもゾーンも中のカードも全部作り直す。
  // 1つでも本物を使い回すと、試しに打った手が本物の盤面に漏れる。
  //
  // 差し替え表 には「元のカードの識別子 → 複製したカード」が入る。
  // 管理クラスが持っているカードの参照を張り替えるのに要る。
  内容を写す(元: ゲームエンジン, 差し替え表?: Map<string, カード>): void {
    this.リセット();
    for (const プレイヤー個体 of 元.プレイヤー一覧.values()) {
      this.プレイヤーを追加(プレイヤー個体.複製());
    }
    for (const [鍵, ゾーン個体] of 元.ゾーン一覧.entries()) {
      this.ゾーン一覧.set(鍵, ゾーン個体.複製(差し替え表));
    }
    this.現在のフェーズ = 元.現在のフェーズ ? { ...元.現在のフェーズ } : null;
    this.現在のプレイヤーインデックス = 元.現在のプレイヤーインデックス;
    this.ゲーム中フラグ = 元.ゲーム中フラグ;
  }

  リセット(): void {
    this.プレイヤー一覧.clear();
    this.ゾーン一覧.clear();
    this.現在のフェーズ = null;
    this.現在のプレイヤーインデックス = 0;
    this.ゲーム中フラグ = false;
  }
}
