// AIの重みを自己対戦で鍛え、結果を src/.../AI/学習した重み.ts に書き出す。
//
//   npm run 学習              … ふつうに鍛える（20世代）
//   npm run 学習 -- 40        … 世代数を指定する
//
// 書き出した重みはビルドに含まれるので、**ブラウザ側は何も変えなくていい**。
// 開いた瞬間から鍛えた強さになる（サーバーは要らないまま）。
//
// 鍛えるのに使っていない種で測り直した勝率も一緒に書き込む。
// 「鍛えた」と「強くなった」は別物なので、数字を残しておかないと後から確かめられない。

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 根 = path.join(ここ, '..');

const { 学習する } = await import(
  path.join(根, 'dist/ゲーム例/バトルスピリッツスタン/AI/学習.js')
);
const { カード帳 } = await import(
  path.join(根, 'dist/ゲーム例/バトルスピリッツスタン/カードデータ/カード帳.js')
);

// 赫焔ノ風牙の実装済みカードで40枚。スピリット・ネクサス・マジックが混ざる。
// スピリットだけで鍛えると、マジックの使いどきを一度も学べない。
const 風牙のカード = カード帳.filter(x => !/^紫/.test(x.カード名));
const デッキを作る = 接頭辞 => {
  const デッキ = [];
  for (let i = 0; i < 40; i++) {
    デッキ.push(風牙のカード[i % 風牙のカード.length].作る(`${接頭辞}-${i}`));
  }
  return デッキ;
};

const 世代数 = Number(process.argv[2] ?? 20);
console.log(`${世代数}世代 鍛えます（デッキ40枚・1世代あたり6人の挑戦者）`);

const 始め = Date.now();
const 結果 = 学習する({
  デッキを作る,
  世代数,
  進み具合: ({ 世代, 交代したか, 最高勝率, 乱れの大きさ }) => {
    const 経過 = ((Date.now() - 始め) / 1000).toFixed(0);
    console.log(
      `世代${String(世代).padStart(3)}  王者を超えた挑戦者 ${交代したか}人  ` +
        `最高勝率 ${(最高勝率 * 100).toFixed(1)}%  乱れ ${乱れの大きさ.toFixed(3)}  ${経過}秒`
    );
  },
});

console.log(
  `\n鍛える前の重みに対する勝率（学習に使っていない種・1000試合）: ` +
    `${(結果.元の重みに対する勝率 * 100).toFixed(1)}%`
);

const 出力先 = path.join(
  根,
  'src/ゲーム例/バトルスピリッツスタン/AI/学習した重み.ts'
);

const 並び = Object.entries(結果.重み)
  .map(([鍵, 値]) => `  ${鍵}: ${Number(値.toPrecision(6))},`)
  .join('\n');

writeFileSync(
  出力先,
  `import { 評価の重み } from './盤面評価.js';

// 自己対戦で鍛えた重み。**手で書き換えないこと。**
// 作り直すときは npm run 学習 を回す（scripts/AIを鍛える.mjs）。
//
// 鍛えた条件
//   デッキ      … 赫焔ノ風牙の実装済みカードで40枚
//   世代数      … ${結果.世代数}
//   確かめ方    … 学習に使っていない種で1000試合（先攻・後攻を入れ替えて半分ずつ）
//   鍛える前の重みに対する勝率 … ${(結果.元の重みに対する勝率 * 100).toFixed(1)}%
export const 学習した重み: 評価の重み = {
${並び}
};
`,
  'utf-8'
);

console.log(`書き出しました: ${path.relative(根, 出力先)}`);
