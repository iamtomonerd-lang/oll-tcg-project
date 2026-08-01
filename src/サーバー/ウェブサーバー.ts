// ウェブサーバー（HTTPの皮）
//
// ゲームの決まりごとは一切ここに置かない。すべて アプリ/ゲームAPI.ts にある。
// このファイルの仕事は2つだけ。
//   1. public/ の中身を配る
//   2. /api/... のリクエストを ゲームAPI.処理する() に渡して、返ってきたものをそのまま返す
//
// 同じ ゲームAPI を、ブラウザ側は src/ブラウザ/起動.ts から直に呼ぶ。
// どちらの入り口から来ても通る道が同じなので、片方だけ挙動がずれることがない。

import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { 処理する, 配置保管庫, 配置保管庫を設定する } from '../アプリ/ゲームAPI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const ポート = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// === 配置をファイルに残す ===
//
// 更新してもユーザーの調整が消えないよう、ゲーム本体とは別のファイルに置く。
// 書き込みは 一時ファイル → 本ファイルをバックアップへ → 一時ファイルを本ファイルへ、
// の順に行う。途中で落ちても、本ファイルが壊れた状態にはならない。

const 配置ファイル = path.join(__dirname, '../../public/レイアウト.json');
const 一時ファイル = path.join(__dirname, '../../public/レイアウト.json.tmp');
const バックアップ = path.join(__dirname, '../../public/レイアウト.json.bak');

const ファイル配置保管庫: 配置保管庫 = {
  読み込む() {
    if (!fs.existsSync(配置ファイル)) return null;
    try {
      return JSON.parse(fs.readFileSync(配置ファイル, 'utf8'));
    } catch {
      // 本ファイルが壊れていればバックアップから復旧を試みる
      if (fs.existsSync(バックアップ)) {
        try {
          return JSON.parse(fs.readFileSync(バックアップ, 'utf8'));
        } catch {
          return null;
        }
      }
      return null;
    }
  },

  保存する(配置: unknown) {
    try {
      fs.writeFileSync(一時ファイル, `${JSON.stringify(配置, null, 2)}\n`, 'utf8');
      if (fs.existsSync(配置ファイル)) fs.renameSync(配置ファイル, バックアップ);
      fs.renameSync(一時ファイル, 配置ファイル);
    } catch (e) {
      // 中途半端な一時ファイルを残さない
      try {
        if (fs.existsSync(一時ファイル)) fs.unlinkSync(一時ファイル);
      } catch {
        /* 無視 */
      }
      throw e;
    }
  },

  消す() {
    if (fs.existsSync(配置ファイル)) fs.unlinkSync(配置ファイル);
    if (fs.existsSync(バックアップ)) fs.unlinkSync(バックアップ);
    if (fs.existsSync(一時ファイル)) fs.unlinkSync(一時ファイル);
  },
};

配置保管庫を設定する(ファイル配置保管庫);

// === APIをそのまま通す ===

function 中継する(req: Request, res: Response): void {
  const 応答 = 処理する(req.method, req.originalUrl, req.body);
  res.status(応答.状態番号).json(応答.本体);
}

app.get('/api/*', 中継する);
app.post('/api/*', 中継する);
app.delete('/api/*', 中継する);

// テストから読み込んで叩けるよう、アプリ本体は公開し、
// 待ち受けはこのファイルを直接実行したときだけ行う。
export { app };

const 直接実行されたか = process.argv[1] === fileURLToPath(import.meta.url);
if (直接実行されたか) {
  app.listen(ポート, () => {
    console.log(`\n🎮 バトルスピリッツ・スタン サーバーが起動しました！`);
    console.log(`   http://localhost:${ポート}`);
    console.log(`   同じネットワーク内の別端末からは http://<このマシンのIP>:${ポート}\n`);
  });
}
