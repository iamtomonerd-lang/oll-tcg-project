// ブラウザ用に1枚へまとめ、あわせて「版の印」を作る。
//
// 公開したものが本当に反映されたかを、画面を見るだけで確かめられるようにする。
// そのために2つのものを作る。
//
//   public/ゲーム本体.js … 動いているコード。版の印を埋め込んである
//   public/版.json       … いま公開されている版を知らせる小さな札
//
// 画面は「埋め込まれた印（今動いているもの）」と
// 「版.json（今公開されているもの）」を見比べる。
// 食い違えば新しい版が出たということなので、その場で知らせる。
//
// 印はコミットの短いSHAと日時、そして件名（コミットメッセージの1行目）。
// 件名を出すのは、SHAより「何が入ったか」のほうが人には確かめやすいため。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 根 = path.join(ここ, '..');

function gitで聞く(引数, 既定) {
  try {
    return execSync(`git ${引数}`, { cwd: 根, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 既定;
  }
}

// CIでは GITHUB_SHA が入る。手元では git に聞く。
const 長いSHA = process.env.GITHUB_SHA || gitで聞く('rev-parse HEAD', '');
const 印 = 長いSHA ? 長いSHA.slice(0, 7) : '手元';
const 件名 = gitで聞く('log -1 --pretty=%s', '（手元のビルド）');

// 手元で未コミットの変更を抱えたままビルドしたときは、それが分かるようにする。
// 画面の表示と実際のコードが食い違って悩まないため。
const 汚れ = gitで聞く('status --porcelain', '') !== '';

const 版 = {
  印: 汚れ ? `${印}+` : 印,
  日時: new Date().toISOString(),
  件名,
};

fs.writeFileSync(
  path.join(根, 'public/版.json'),
  `${JSON.stringify(版, null, 2)}\n`,
  'utf8'
);

await esbuild.build({
  entryPoints: [path.join(根, 'src/ブラウザ/起動.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  outfile: path.join(根, 'public/ゲーム本体.js'),
  // 動いているコード自身に印を焼き付ける。
  // 版.json を読むだけだと、通信が無くて古い本体が動いている場面で
  // 「公開されている版」を「動いている版」と取り違えてしまう。
  define: { __版__: JSON.stringify(版) },
});

const 大きさ = (fs.statSync(path.join(根, 'public/ゲーム本体.js')).size / 1024).toFixed(0);
console.log(`まとめました: public/ゲーム本体.js (${大きさ}KB)`);
console.log(`版: ${版.印} / ${版.件名}`);
if (汚れ) {
  console.log('※ コミットしていない変更があります（印の末尾に + を付けました）');
}
