// サービスワーカー
//
// iPadのホーム画面から開いたとき、通信が無くても遊べるようにする。
// ゲームはブラウザの中だけで動く（サーバーに問い合わせない）ので、
// 必要なファイルさえ手元にあれば完全にオフラインで成立する。
//
// パスはすべて相対で書く。GitHub Pages では
// https://<ユーザー>.github.io/<リポジトリ>/ のように
// 根ではない場所に置かれるため、絶対パスだと外れてしまう。

// 中身を変えたらここを上げる。古い保存分は activate で捨てる。
const 保管名 = 'oll-tcg-v5';

const 最初に取っておくもの = [
  './',
  './index.html',
  './game.css',
  './layout.css',
  './ゲーム本体.js',
  './game.js',
  './セーブデータ.js',
  './デッキ構築.js',
  './layout.js',
  './版表示.js',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', 事象 => {
  事象.waitUntil(
    caches.open(保管名).then(保管 =>
      // 1つでも欠けると全部失敗する addAll は使わない。
      // ファイルが増減しても、入れられるものだけ入れて先に進む。
      Promise.all(
        最初に取っておくもの.map(道 =>
          保管.add(道).catch(() => console.warn('取り込めませんでした', 道))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', 事象 => {
  事象.waitUntil(
    caches
      .keys()
      .then(名前一覧 =>
        Promise.all(名前一覧.filter(名 => 名 !== 保管名).map(名 => caches.delete(名)))
      )
      .then(() => self.clients.claim())
  );
});

// 取り方は「まず通信、駄目なら手元」。
// こうしておくと、更新したぶんが次に開いたときに反映される。
// 通信が無ければ手元の保存分で動く。
self.addEventListener('fetch', 事象 => {
  const 要求 = 事象.request;
  if (要求.method !== 'GET') return;
  if (new URL(要求.url).origin !== self.location.origin) return;

  // 版.json は「今サーバーに何が置かれているか」を聞くための札。
  // ここを手元の保存分で答えてしまうと、更新が出ていても永久に気づけない。
  // 通信できなければ答えない（＝呼んだ側が「確かめられなかった」と分かる）。
  if (new URL(要求.url).pathname.endsWith('/版.json')) {
    事象.respondWith(fetch(要求, { cache: 'no-store' }));
    return;
  }

  // GitHub Pages は index.html にも ゲーム本体.js にも
  // cache-control: max-age=600 を付けて返す。
  // そのまま fetch すると、ブラウザが自分の10分以内の控えを返してしまい、
  // 公開しなおしても最大10分は古いままになる。
  // 「更新するボタンは出るのに更新されない」の原因がこれだった
  // （版.json だけ no-store で聞いているので、帯は正しく出てしまう）。
  //
  // no-cache は「毎回サーバーに確かめる」であって「毎回まるごと取り直す」ではない。
  // 変わっていなければ 304 が返るだけなので、通信量はほとんど増えない。
  //
  // navigate の要求は Request を作り直せない（例外になる）ので、URLから組み立てる。
  const 確かめて取る =
    要求.mode === 'navigate'
      ? fetch(new Request(要求.url, { cache: 'no-cache', credentials: 'same-origin' }))
      : fetch(要求, { cache: 'no-cache' });

  事象.respondWith(
    確かめて取る
      .then(応答 => {
        if (応答 && 応答.status === 200 && 応答.type === 'basic') {
          const 控え = 応答.clone();
          caches.open(保管名).then(保管 => 保管.put(要求, 控え));
        }
        return 応答;
      })
      .catch(() =>
        caches.match(要求).then(見つかった => {
          if (見つかった) return 見つかった;
          // 画面の遷移だけは、入口のページを返して白画面を避ける
          if (要求.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
