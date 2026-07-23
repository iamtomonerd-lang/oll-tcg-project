import { ゲームエンジン } from '../ゲームエンジン.js';
import { プレイヤー } from '../データ/プレイヤー/プレイヤー.js';
import { ゾーン } from '../データ/ゾーン/ゾーン.js';
import { カード } from '../データ/カード/カード.js';
import { 効果エンジン } from '../効果処理/効果エンジン.js';
import { ゾーン移動効果 } from '../効果処理/ゾーン移動.js';
import { 数値変化効果 } from '../効果処理/数値変化.js';
import { シャッフル効果 } from '../効果処理/シャッフル.js';

export class シンプルTCG {
  private ゲーム: ゲームエンジン;
  private 効果エンジン: 効果エンジン;
  private プレイヤーA: プレイヤー;
  private プレイヤーB: プレイヤー;
  private A手札: ゾーン;
  private A場: ゾーン;
  private A墓地: ゾーン;
  private Aデッキ: ゾーン;
  private B手札: ゾーン;
  private B場: ゾーン;
  private B墓地: ゾーン;
  private Bデッキ: ゾーン;
  private ゲーム中: boolean;

  constructor() {
    this.ゲーム = new ゲームエンジン();
    this.効果エンジン = new 効果エンジン();
    this.ゲーム中 = false;

    this.プレイヤーA = new プレイヤー('player-A', 'Alice');
    this.プレイヤーA.ライフを設定(20);

    this.プレイヤーB = new プレイヤー('player-B', 'Bob');
    this.プレイヤーB.ライフを設定(20);

    this.ゲーム.プレイヤーを追加(this.プレイヤーA);
    this.ゲーム.プレイヤーを追加(this.プレイヤーB);

    this.A手札 = new ゾーン('A-hand', { 識別子: 'hand', 表示名: 'Aさんの手札' });
    this.A場 = new ゾーン('A-field', { 識別子: 'field', 表示名: 'Aさんの場' }, { 最大枚数: 5 });
    this.A墓地 = new ゾーン('A-grave', { 識別子: 'grave', 表示名: 'Aさんの墓地' });
    this.Aデッキ = new ゾーン('A-deck', { 識別子: 'deck', 表示名: 'Aさんのデッキ' });

    this.B手札 = new ゾーン('B-hand', { 識別子: 'hand', 表示名: 'Bさんの手札' });
    this.B場 = new ゾーン('B-field', { 識別子: 'field', 表示名: 'Bさんの場' }, { 最大枚数: 5 });
    this.B墓地 = new ゾーン('B-grave', { 識別子: 'grave', 表示名: 'Bさんの墓地' });
    this.Bデッキ = new ゾーン('B-deck', { 識別子: 'deck', 表示名: 'Bさんのデッキ' });

    this.ゲーム.ゾーンを追加(this.A手札);
    this.ゲーム.ゾーンを追加(this.A場);
    this.ゲーム.ゾーンを追加(this.A墓地);
    this.ゲーム.ゾーンを追加(this.Aデッキ);
    this.ゲーム.ゾーンを追加(this.B手札);
    this.ゲーム.ゾーンを追加(this.B場);
    this.ゲーム.ゾーンを追加(this.B墓地);
    this.ゲーム.ゾーンを追加(this.Bデッキ);

    this.効果エンジンを初期化();
  }

  private 効果エンジンを初期化(): void {
    this.効果エンジン.効果を登録(new ゾーン移動効果());
    this.効果エンジン.効果を登録(new 数値変化効果());
    this.効果エンジン.効果を登録(new シャッフル効果());
  }

  デッキを作成(): カード[] {
    const デッキカード: カード[] = [];

    const ピカチュウ = new カード('pikachu-001', {
      識別子: 'pikachu-001',
      表示名: 'ピカチュウ',
      説明: 'でんきタイプ。攻撃力30',
    });
    ピカチュウ.数値を設定('HP', 60);
    ピカチュウ.数値を設定('攻撃力', 30);

    const リザードン = new カード('charizard-001', {
      識別子: 'charizard-001',
      表示名: 'リザードン',
      説明: 'ほのおタイプ。攻撃力50',
    });
    リザードン.数値を設定('HP', 100);
    リザードン.数値を設定('攻撃力', 50);

    const フリーザー = new カード('articuno-001', {
      識別子: 'articuno-001',
      表示名: 'フリーザー',
      説明: 'こおりタイプ。攻撃力40',
    });
    フリーザー.数値を設定('HP', 80);
    フリーザー.数値を設定('攻撃力', 40);

    デッキカード.push(ピカチュウ);
    デッキカード.push(リザードン);
    デッキカード.push(フリーザー);
    デッキカード.push(ピカチュウ.複製());
    デッキカード.push(リザードン.複製());
    デッキカード.push(フリーザー.複製());

    return デッキカード;
  }

  ゲームを初期化(): void {
    const Aデッキカード = this.デッキを作成();
    const Bデッキカード = this.デッキを作成();

    for (const カード of Aデッキカード) {
      this.Aデッキ.カードを追加(カード);
    }

    for (const カード of Bデッキカード) {
      this.Bデッキ.カードを追加(カード);
    }

    this.ゲーム中 = true;
    this.ゲーム.ゲームを開始();
    console.log('ゲーム開始！');
    console.log(`${this.プレイヤーA.名前} のライフ: ${this.プレイヤーA.ライフを取得()}`);
    console.log(`${this.プレイヤーB.名前} のライフ: ${this.プレイヤーB.ライフを取得()}`);
  }

  async カードをプレイ(プレイヤー: プレイヤー, カード: カード, 対象ゾーン: ゾーン, 移動元ゾーン: ゾーン): Promise<void> {
    const 結果 = await this.効果エンジン.効果を実行('ゾーン-移動', {
      発動源: カード,
      対象: 対象ゾーン,
      追加データ: { 移動元ゾーン },
    });

    if (結果.成功) {
      console.log(`${プレイヤー.名前} が ${カード.名称.表示名} をプレイ！`);
    } else {
      console.log(`プレイ失敗: ${結果.メッセージ}`);
    }
  }

  async 攻撃(攻撃側プレイヤー: プレイヤー, 攻撃カード: カード, 防御側プレイヤー: プレイヤー): Promise<void> {
    const 攻撃力 = 攻撃カード.数値を取得('攻撃力');

    const ダメージ結果 = await this.効果エンジン.効果を実行('数値-変化', {
      対象: 防御側プレイヤー,
      追加データ: { キー: 'ライフ', 増加量: -攻撃力 },
    });

    if (ダメージ結果.成功) {
      console.log(`${攻撃側プレイヤー.名前} の ${攻撃カード.名称.表示名} が攻撃！`);
      console.log(`${防御側プレイヤー.名前} に ${攻撃力} ダメージ！`);
      console.log(`${防御側プレイヤー.名前} のライフ: ${防御側プレイヤー.ライフを取得()}`);
    }
  }

  ゲーム終了判定(): boolean {
    const Aライフ = this.プレイヤーA.ライフを取得();
    const Bライフ = this.プレイヤーB.ライフを取得();

    if (Aライフ <= 0) {
      console.log(`\n🎉 ${this.プレイヤーB.名前} の勝利！`);
      console.log(`${this.プレイヤーA.名前} のライフが 0 になりました！`);
      this.ゲーム中 = false;
      return true;
    }

    if (Bライフ <= 0) {
      console.log(`\n🎉 ${this.プレイヤーA.名前} の勝利！`);
      console.log(`${this.プレイヤーB.名前} のライフが 0 になりました！`);
      this.ゲーム中 = false;
      return true;
    }

    return false;
  }

  ゲーム状態を表示(): void {
    console.log('\n--- ゲーム状態 ---');
    console.log(`${this.プレイヤーA.名前}: ライフ ${this.プレイヤーA.ライフを取得()}`);
    console.log(`  手札: ${this.A手札.カード枚数を取得()}枚, 場: ${this.A場.カード枚数を取得()}枚`);
    console.log(`${this.プレイヤーB.名前}: ライフ ${this.プレイヤーB.ライフを取得()}`);
    console.log(`  手札: ${this.B手札.カード枚数を取得()}枚, 場: ${this.B場.カード枚数を取得()}枚`);
  }

  プレイヤーAを取得(): プレイヤー {
    return this.プレイヤーA;
  }

  プレイヤーBを取得(): プレイヤー {
    return this.プレイヤーB;
  }

  A手札を取得(): ゾーン {
    return this.A手札;
  }

  A場を取得(): ゾーン {
    return this.A場;
  }

  B手札を取得(): ゾーン {
    return this.B手札;
  }

  B場を取得(): ゾーン {
    return this.B場;
  }
}
