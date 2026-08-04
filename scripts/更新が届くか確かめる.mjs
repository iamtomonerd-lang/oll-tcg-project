// 「更新する」を押したら本当に新しい版になるかを、本番と同じ条件で確かめる。
//
// なぜ要るか
//   GitHub Pages は index.html にも ゲーム本体.js にも
//   cache-control: max-age=600 を付けて返す。
//   版.json だけは no-store で聞いているので「新しい版があります」の帯は正しく出るが、
//   読み直したときに戻ってくるファイルはブラウザの控えのまま——という食い違いが起きる。
//   実際それで「ボタンは出るのに更新されない」が起きた。
//   手元のふつうの静的サーバーは max-age を付けないので、この不具合は再現しない。
//
// 使い方
//   npm run build:all
//   npm i -D playwright-core        （入っていなければ。ブラウザ本体は /opt/pw-browsers にある）
//   node scripts/更新が届くか確かめる.mjs
//
// npm test には入れていない。ブラウザが要るので、手元とCIで前提が違う。
//
// 何をするか
//   1. max-age=600 を付けて public/ の写しを配る（＝GitHub Pages と同じ条件）
//   2. ブラウザで開く（サービスワーカーに取り込ませる）
//   3. 配る中身の印を差し替える（＝公開しなおしたのと同じ）
//   4. 「更新する」を押して、1回で新しい印になるか見る
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// playwright-core は npm test では使わないので、必要になったときだけ読む。
let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error('playwright-core が要ります: npm i -D playwright-core');
  process.exit(1);
}

const 元 = path.resolve('public');
const 接頭 = '/oll-tcg-project';
const 港 = Number(process.env.PORT ?? 4321);
const ブラウザの場所 =
  process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

if (!fs.existsSync(path.join(元, 'ゲーム本体.js'))) {
  console.error('先に npm run build:all を流してください（public/ゲーム本体.js がありません）');
  process.exit(1);
}

// --- 配る場所を作る（本物を書き換えないよう写しでやる） ---
const 配布 = fs.mkdtempSync(path.join(os.tmpdir(), '更新確認-'));
for (const 名 of fs.readdirSync(元)) {
  const 道 = path.join(元, 名);
  if (fs.statSync(道).isDirectory()) continue;
  fs.copyFileSync(道, path.join(配布, 名));
}

const 型 = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
};
const サーバー = http.createServer((req, res) => {
  let 道 = decodeURIComponent(req.url.split('?')[0]);
  if (!道.startsWith(接頭)) {
    res.writeHead(404);
    res.end();
    return;
  }
  道 = 道.slice(接頭.length) || '/';
  const 実体 = path.join(配布, 道 === '/' ? 'index.html' : 道);
  if (!fs.existsSync(実体) || fs.statSync(実体).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  const 中身 = fs.readFileSync(実体);
  res.writeHead(200, {
    'Content-Type': 型[path.extname(実体)] ?? 'application/octet-stream',
    'Cache-Control': 'max-age=600', // ← ここが肝。GitHub Pages と同じ。
  });
  res.end(中身);
});
await new Promise(解決 => サーバー.listen(港, 解決));

const 片付ける = () => {
  サーバー.close();
  fs.rmSync(配布, { recursive: true, force: true });
};

let 問題 = 0;
const ログ = [];
const 確かめる = (名, 実際, 期待) => {
  if (実際 !== 期待) 問題++;
  ログ.push(`${実際 === 期待 ? 'OK ' : 'NG '}${名}: ${実際}`);
};

try {
  const b = await chromium.launch({ executablePath: ブラウザの場所, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1194, height: 834 } });
  p.on('pageerror', e => ログ.push(`[pageerror] ${e.message}`));

  const 印 = () => p.evaluate(() => window.この版?.印 ?? '(なし)');

  await p.goto(`http://localhost:${港}${接頭}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const 元の印 = await 印();
  ログ.push(`開いた直後の印: ${元の印}`);
  確かめる('サービスワーカーが効いている', await p.evaluate(() => !!navigator.serviceWorker.controller), true);

  // --- 公開しなおす ---
  const 新しい印 = `試験-${Date.now().toString(36)}`;
  fs.writeFileSync(
    path.join(配布, '版.json'),
    JSON.stringify({ 印: 新しい印, 日時: new Date().toISOString(), 件名: '更新が届くかの試験' }, null, 2)
  );
  const 本体道 = path.join(配布, 'ゲーム本体.js');
  const 本体 = fs.readFileSync(本体道, 'utf8');
  const 差し替え後 = 本体.replace(/(\\u5370:")[^"]*(")/, `$1${新しい印}$2`);
  if (差し替え後 === 本体) {
    ログ.push('※ 本体の印を差し替えられませんでした（まとめ方が変わった可能性）');
    問題++;
  }
  fs.writeFileSync(本体道, 差し替え後);

  // --- 帯が出るか → 1回押して追いつくか ---
  await p.evaluate(() => window.版?.更新を確かめる({ 黙って: false }));
  await p.waitForTimeout(1500);
  確かめる('「新しい版があります」の帯が出る', await p.evaluate(() => !!document.getElementById('updateBar')), true);

  if (!問題) {
    await p.evaluate(() => document.getElementById('updateNow').click());
    await p.waitForTimeout(6000);
    確かめる('「更新する」を1回押して新しい印になる', await 印(), 新しい印);
  }

  await b.close();
} finally {
  片付ける();
}

console.log(ログ.join('\n'));
console.log(問題 === 0 ? '\n=== 更新は届く ===' : `\n=== 問題 ${問題}件 ===`);
process.exit(問題 === 0 ? 0 : 1);
