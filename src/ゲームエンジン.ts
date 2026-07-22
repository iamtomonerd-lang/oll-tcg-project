import { プレイヤー } from './データ/プレイヤー/プレイヤー.js';
import { ゾーン } from './データ/ゾーン/ゾーン.js';
import { 効果エンジン } from './効果処理/効果エンジン.js';
import { 効果実行文脈, 効果結果 } from './効果処理/効果.js';

export interface ゲームフェーズ {
  名前: string;
  順序: number;
}

export class ゲームエンジン {
  private プレイヤー一覧: Map<string, プレイヤー>;
  private ゾーン一覧: Map<string, ゾーン>;
  private 効果エンジン: 効果エンジン;
  private 現在のフェーズ: ゲームフェーズ | null;
  private 現在のプレイヤーインデックス: number;
  private ゲーム中フラグ: boolean;

  constructor() {
    this.プレイヤー一覧 = new Map();
    this.ゾーン一覧 = new Map();
    this.効果エンジン = new 効果エンジン();
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

  効果エンジンを取得(): 効果エンジン {
    return this.効果エンジン;
  }

  async 効果を実行(効果識別子: string, 文脈: 効果実行文脈): Promise<効果結果> {
    return this.効果エンジン.効果を実行(効果識別子, 文脈);
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

  リセット(): void {
    this.プレイヤー一覧.clear();
    this.ゾーン一覧.clear();
    this.現在のフェーズ = null;
    this.現在のプレイヤーインデックス = 0;
    this.ゲーム中フラグ = false;
    this.効果エンジン.効果スタックをクリア();
  }
}
