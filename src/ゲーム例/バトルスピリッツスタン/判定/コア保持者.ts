import { ゾーン } from '../../../データ/ゾーン/ゾーン.js';
import { カード } from '../../../データ/カード/カード.js';

// コア保持者：コアを持てるもの（ゾーン／カード）を統一的に扱う抽象
// ゾーンはコア数を状態Mapに、カードは数値Mapに持つという保存先の違いを吸収する。
// コア数は「ソウルコアを含む総数」。ソウルコアの有無は別途フラグで持つ。
export interface コア保持者 {
  コア数を取得(): number;              // 総数（ソウルコア含む）
  コア数を設定(数: number): void;
  ソウルコアあるか(): boolean;
  ソウルコアを設定(ある: boolean): void;
  制限付き配置先か(): boolean;         // 5-7-3：ソウルコアの配置が制限される先（ライフ／ボイド）か
  // コアが乗っているカード（ゾーンなら undefined）。
  // コア数が変わった後にLvを更新し直す相手を知るために使う。
  対象のカード(): カード | undefined;
}

// ゾーン用アダプタ（コア数は状態Mapに保存）
export class ゾーンコア保持者 implements コア保持者 {
  constructor(private ゾーン: ゾーン) {}

  コア数を取得(): number {
    const 値 = this.ゾーン.状態を取得('コア数');
    return typeof 値 === 'number' ? 値 : 0;
  }

  コア数を設定(数: number): void {
    this.ゾーン.状態を設定('コア数', Math.max(0, 数));
  }

  ソウルコアあるか(): boolean {
    return this.ゾーン.状態を取得('ソウルコア') === true;
  }

  ソウルコアを設定(ある: boolean): void {
    this.ゾーン.状態を設定('ソウルコア', ある);
  }

  制限付き配置先か(): boolean {
    const キー = this.ゾーン.名称.識別子;
    return キー === 'ライフ' || キー === 'ボイド';
  }

  対象のカード(): カード | undefined {
    return undefined;
  }
}

// カード用アダプタ（コア数は数値Map、ソウルコアの有無は状態Mapに保存）
export class カードコア保持者 implements コア保持者 {
  constructor(private カード: カード) {}

  コア数を取得(): number {
    return this.カード.数値を取得('コア数');
  }

  コア数を設定(数: number): void {
    this.カード.数値を設定('コア数', Math.max(0, 数));
  }

  ソウルコアあるか(): boolean {
    return this.カード.状態を取得('ソウルコア') === true;
  }

  ソウルコアを設定(ある: boolean): void {
    this.カード.状態を設定('ソウルコア', ある);
  }

  制限付き配置先か(): boolean {
    return false; // カードはライフ／ボイドではない
  }

  対象のカード(): カード | undefined {
    return this.カード;
  }
}
