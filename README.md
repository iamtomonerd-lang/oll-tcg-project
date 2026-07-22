# OLL TCG Project

全てのトレーディングカードゲーム(TCG)を作れる土台

## プロジェクト構成

```
src/
├── data/                    # データ定義
│   ├── card/               # カード定義
│   │   └── CardName.ts     # カード: 名称、状態、数値
│   ├── zone/               # ゾーン定義
│   │   └── ZoneName.ts     # ゾーン: 名称、状態、置ける物、効果対象
│   ├── player/             # プレイヤー定義
│   │   └── PlayerState.ts  # プレイヤー: 状態、数値
│   └── game/               # ゲーム物定義
│       └── GameObject.ts   # ゲーム物: 状態、数値
├── effects/                # 効果処理
│   ├── Effect.ts           # 効果基底クラス
│   ├── ReplacementEffect.ts    # 置換効果
│   ├── ZoneMoveEffect.ts       # ゾーン移動
│   ├── ValueChangeEffect.ts    # 数値の変化
│   ├── StateChangeEffect.ts    # 状態変更
│   ├── SpawnEffect.ts          # 物の生成
│   ├── RandomEffect.ts         # 乱数の生成
│   └── EffectEngine.ts         # 効果エンジン
├── GameEngine.ts           # ゲームコア
└── index.ts               # メインエクスポート
```

## 主要なコンポーネント

### データレイヤー

#### Card (カード)
- `id`: カードの一意識別子
- `name`: カード情報 (表示名、説明)
- `state`: カード状態 (任意のキー値ペア)
- `values`: カード数値 (キー値ペア、数値型)

#### Zone (ゾーン)
- `id`: ゾーンの一意識別子
- `name`: ゾーン情報
- `state`: ゾーン状態
- `cards`: 配置されたカード
- `constraint`: 制約 (最大枚数、許可カード種別)
- `effectTargets`: 効果対象のID集合

#### Player (プレイヤー)
- `id`: プレイヤーID
- `name`: プレイヤー名
- `state`: プレイヤー状態
- `values`: プレイヤー数値 (ライフ等)

#### GameObject (ゲーム物)
- `id`: ゲーム物ID
- `type`: ゲーム物種別
- `state`: ゲーム物状態
- `values`: ゲーム物数値

### 効果レイヤー

#### 置換効果 (ReplacementEffect)
他の効果が発生する際に、それを別の効果に置き換える

```typescript
const replacement = new ReplacementEffect(
  'prevent-damage',
  'Prevent Damage',
  (context) => context.target instanceof Player && context.effectId === 'damage',
  async (context) => {
    // 置き換え処理
    return { success: true };
  }
);
```

#### ゾーン移動 (ZoneMoveEffect)
カードをあるゾーンから別のゾーンに移動

```typescript
await engine.executeEffect('zone-move', {
  source: card,
  target: targetZone,
  additionalData: { fromZone: sourceZone }
});
```

#### 数値変化 (ValueChangeEffect)
カード、プレイヤー、ゲーム物の数値を変更

```typescript
await engine.executeEffect('value-change', {
  target: player,
  additionalData: { key: 'life', amount: -5 }
});
```

#### 状態変更 (StateChangeEffect)
カード、プレイヤー、ゲーム物、ゾーンの状態を変更

```typescript
await engine.executeEffect('state-change', {
  target: card,
  additionalData: { key: 'tapped', value: true }
});
```

#### 物の生成 (SpawnEffect)
新しいカードまたはゲーム物を生成

```typescript
await engine.executeEffect('spawn', {
  additionalData: {
    type: 'card',
    cardId: 'new-card-1',
    cardName: { id: 'card-1', displayName: 'New Card' }
  }
});
```

#### 乱数生成 (RandomEffect)
指定範囲の乱数を生成

```typescript
const result = await engine.executeEffect('random', {
  additionalData: { min: 1, max: 6, count: 1 }
});
console.log(result.data.value); // 1-6のいずれか
```

### ゲームエンジン (GameEngine)

ゲーム全体を管理するコアエンジン

```typescript
const game = new GameEngine();

// プレイヤー追加
const player1 = new Player('p1', 'Player 1');
game.addPlayer(player1);

// ゾーン追加
const hand = new Zone('hand', { id: 'hand', displayName: 'Hand' });
game.addZone(hand);

// 効果エンジンへのアクセス
const effectEngine = game.getEffectEngine();

// 効果実行
await game.executeEffect('zone-move', context);

// ゲーム状態取得
const state = game.getGameState();
```

## 使用例

```typescript
import {
  Card,
  Zone,
  Player,
  GameEngine,
  ZoneMoveEffect,
  EffectEngine
} from './src/index.js';

// ゲーム初期化
const game = new GameEngine();
const effectEngine = game.getEffectEngine();

// プレイヤー作成
const player = new Player('p1', 'Alice');
player.setValue('life', 20);
game.addPlayer(player);

// ゾーン作成
const hand = new Zone('hand', { id: 'hand', displayName: 'Hand' });
const field = new Zone('field', { id: 'field', displayName: 'Field' });
game.addZone(hand);
game.addZone(field);

// カード作成
const card = new Card('card-1', { id: 'card-1', displayName: 'Sample Card' });
card.setValue('power', 5);
hand.addCard(card);

// 効果エンジン登録
const zoneMoveEffect = new ZoneMoveEffect();
effectEngine.registerEffect(zoneMoveEffect);

// 効果実行
const result = await game.executeEffect('zone-move', {
  source: card,
  target: field,
  additionalData: { fromZone: hand }
});

console.log(result.message); // "Moved card card-1 to zone field"
```

## セットアップ

```bash
npm install
npm run build
npm test
```

## ライセンス

MIT
