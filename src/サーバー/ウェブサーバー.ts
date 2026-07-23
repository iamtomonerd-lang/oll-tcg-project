import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { シンプルTCG } from '../ゲーム例/シンプルTCG.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const ポート = 3000;

let ゲーム: シンプルTCG | null = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

app.get('/api/ゲーム/状態', (req: Request, res: Response) => {
  if (!ゲーム) {
    res.json({ 初期化済み: false });
    return;
  }

  const A手札 = ゲーム.A手札を取得().カード一覧を取得();
  const A場 = ゲーム.A場を取得().カード一覧を取得();
  const B手札 = ゲーム.B手札を取得().カード一覧を取得();
  const B場 = ゲーム.B場を取得().カード一覧を取得();

  res.json({
    初期化済み: true,
    プレイヤーA: {
      名前: ゲーム.プレイヤーAを取得().名前,
      ライフ: ゲーム.プレイヤーAを取得().ライフを取得(),
      手札枚数: A手札.length,
      場のカード: A場.map(c => ({
        識別子: c.識別子,
        名前: c.名称.表示名,
        HP: c.数値を取得('HP'),
        攻撃力: c.数値を取得('攻撃力'),
      })),
    },
    プレイヤーB: {
      名前: ゲーム.プレイヤーBを取得().名前,
      ライフ: ゲーム.プレイヤーBを取得().ライフを取得(),
      手札枚数: B手札.length,
      場のカード: B場.map(c => ({
        識別子: c.識別子,
        名前: c.名称.表示名,
        HP: c.数値を取得('HP'),
        攻撃力: c.数値を取得('攻撃力'),
      })),
    },
  });
});

app.post('/api/ゲーム/初期化', (req: Request, res: Response) => {
  try {
    ゲーム = new シンプルTCG();
    ゲーム.ゲームを初期化();
    res.json({ 成功: true, メッセージ: 'ゲーム初期化完了' });
  } catch (error) {
    res.status(500).json({
      成功: false,
      メッセージ: error instanceof Error ? error.message : '初期化失敗',
    });
  }
});

app.listen(ポート, () => {
  console.log(`\n🎮 TCG サーバーが起動しました！`);
  console.log(`📱 iPad で以下にアクセス:`);
  console.log(`   http://localhost:${ポート}`);
  console.log(`   または http://<このマシンのIP>:${ポート}`);
  console.log(`\n⚠️  同じネットワークで iPad と接続してください\n`);
});
