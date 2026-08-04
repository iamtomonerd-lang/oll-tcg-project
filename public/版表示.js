// 版表示 — 「いま動いているのがどれか」を画面で確かめられるようにする
//
// 公開したものが本当に反映されたか、コードを読めなくても分かるようにするのが目的。
// 出すのは日時と、最後に入った変更の件名。SHAより「何が入ったか」のほうが確かめやすい。
//
// 見比べるのは2つ。
//   window.この版 … 今このページで動いているコードに焼き付けられた印
//   版.json       … サーバーに今置かれている版の札
// 食い違えば新しい版が出たということなので、その場で知らせて再読み込みを促す。
//
// 通信が無いときは版.jsonが取れないが、それは「新しい版が無い」ではなく
// 「確かめられない」なので、黙って何もしない。

(() => {
  const 動いている版 = window.この版 ?? null;

  // === 表示の整え ===

  // 日本の時刻で「8/1 23:56」の形にする。日付だけだと同じ日に何度も出したとき見分けられない。
  function 日時を読みやすく(ISO文字列) {
    if (!ISO文字列) return '不明';
    const d = new Date(ISO文字列);
    if (Number.isNaN(d.getTime())) return '不明';
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    }).format(d);
  }

  function 短く(文字列, 上限) {
    const s = String(文字列 ?? '');
    return s.length > 上限 ? `${s.slice(0, 上限 - 1)}…` : s;
  }

  // === 対戦前の画面に出す ===
  //
  // 「開いたらまず目に入る」「遊んでいる間は視界に入らない」場所に置きたい。
  //
  // ただし最初に出る画面は固定ではない（game.js は起動時にモード選択を出し、
  // そこから「デッキを変更」でデッキ選択へ戻る）。特定の画面の中に入れると
  // 入口が変わったときに見えなくなるので、画面に固定して置き、
  // 盤面が出ている間だけ引っ込める形にする。

  function 版を書き出す() {
    const 置き場 = document.getElementById('versionLine');
    if (!置き場) return;

    if (!動いている版) {
      置き場.textContent = '版: 不明（古い読み込み方をしています。再読み込みしてください）';
      return;
    }
    置き場.innerHTML =
      `<span class="version-when">${日時を読みやすく(動いている版.日時)} 版</span>` +
      `<span class="version-what">${短く(動いている版.件名, 46)}</span>` +
      `<span class="version-id">${動いている版.印}</span>`;
    置き場.title =
      `印: ${動いている版.印}\n` +
      `作られた日時: ${動いている版.日時}\n` +
      `最後に入った変更: ${動いている版.件名}`;
  }

  // === 新しい版が出ていないか見る ===

  async function 公開中の版を聞く() {
    // サービスワーカーと中継の両方を素通りさせたいので、毎回違う印を付けて聞く。
    // ここで古い答えを掴むと「更新したのに出ない」の原因になる。
    const 応答 = await fetch(`版.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!応答.ok) throw new Error(`版.json が取れません (${応答.status})`);
    return 応答.json();
  }

  // 「更新する」を押したのに変わらない、を起こさないための片付け。
  //
  // 控えは2か所にある。
  //   ・サービスワーカーの保管（caches）… caches.delete で消せる
  //   ・ブラウザ自身のHTTPの控え        … 消せない。取り直して上書きするしかない
  //
  // GitHub Pages は index.html にも ゲーム本体.js にも max-age=600 を付けて返すので、
  // 2つ目を上書きしないまま読み直すと、10分間は古いファイルが返ってくる。
  // 版.json だけは no-store で聞いているため帯は出る——それで
  // 「ボタンは出るのに更新されない」という形になっていた。
  //
  // cache: 'reload' は控えを飛ばしてサーバーから取り、控えも新しくする。
  // 取り直す先は画面が実際に読んでいるものから拾う（一覧を二重に持つとずれる）。
  async function 手元の控えを捨てる() {
    try {
      const 一覧 = await caches.keys();
      await Promise.all(一覧.map(名 => caches.delete(名)));
    } catch {
      /* 保管が扱えなくても、この後の取り直しには意味がある */
    }

    const 取り直す = new Set(['./', './index.html']);
    for (const 要素 of document.querySelectorAll('script[src], link[href]')) {
      const 道 = 要素.getAttribute('src') ?? 要素.getAttribute('href');
      if (道 && !/^[a-z]+:/i.test(道)) 取り直す.add(道);
    }
    await Promise.all(
      [...取り直す].map(道 => fetch(道, { cache: 'reload' }).catch(() => {}))
    );

    // 新しいサービスワーカーがあれば、それも取りに行かせる。
    //
    // ここで待つのが肝。取りに行かせただけで読み直すと、
    // 交代が間に合わず、古いワーカーが古いファイルを返してしまう。
    // 実際それで「1回目は何も起きず、2回押してやっと更新される」状態になっていた。
    try {
      const 登録 = await navigator.serviceWorker?.getRegistration();
      if (登録) {
        await 登録.update();
        await 新しいワーカーの交代を待つ(登録);
      }
    } catch {
      /* 無くても読み直しは進める */
    }
  }

  // 新しいワーカーが控えている間だけ、交代を待つ。
  // 待ちっぱなしにならないよう上限を切る（待てなくても読み直しは進める）。
  function 新しいワーカーの交代を待つ(登録, 上限ミリ秒 = 4000) {
    if (!登録.installing && !登録.waiting) return Promise.resolve();
    return new Promise(解決 => {
      const 時計 = setTimeout(終わる, 上限ミリ秒);
      function 終わる() {
        clearTimeout(時計);
        navigator.serviceWorker.removeEventListener('controllerchange', 終わる);
        解決();
      }
      navigator.serviceWorker.addEventListener('controllerchange', 終わる);
    });
  }

  function 新しい版を知らせる(公開中) {
    if (document.getElementById('updateBar')) return;

    const 帯 = document.createElement('div');
    帯.id = 'updateBar';
    帯.innerHTML =
      `<span class="update-text">新しい版があります` +
      `<b>${短く(公開中.件名, 34)}</b></span>` +
      `<button id="updateNow" type="button">更新する</button>` +
      `<button id="updateLater" type="button" class="update-later">あとで</button>`;
    document.body.appendChild(帯);

    document.getElementById('updateLater').addEventListener('click', () => 帯.remove());
    document.getElementById('updateNow').addEventListener('click', async () => {
      document.getElementById('updateNow').textContent = '更新中…';
      await 手元の控えを捨てる();
      location.reload();
    });
  }

  async function 更新を確かめる({ 黙って = true } = {}) {
    if (!動いている版) return;
    try {
      const 公開中 = await 公開中の版を聞く();
      if (公開中.印 && 公開中.印 !== 動いている版.印) {
        新しい版を知らせる(公開中);
      } else if (!黙って) {
        // 「最新です」は良い知らせなので、赤いトースト（エラー用）は使わない。
        // 押した場所そのものが返事をするほうが、何に対する返事か分かりやすい。
        その場で返事する('最新です');
      }
    } catch {
      // 通信できないだけなら「確かめられなかった」であって「最新」ではない。
      // 勝手に安心させないよう、黙っているときは何も出さない。
      if (!黙って) 伝える('いま確かめられません（通信を確認してください）');
    }
  }

  // 版の行そのものを一瞬だけ返事に差し替える
  let 戻す時計 = null;
  function その場で返事する(文言) {
    const 行 = document.getElementById('versionLine');
    if (!行) return;
    clearTimeout(戻す時計);
    行.classList.add('version-ok');
    行.innerHTML = `<span class="version-when">${文言}</span>`;
    戻す時計 = setTimeout(() => {
      行.classList.remove('version-ok');
      版を書き出す();
    }, 1800);
  }

  function 伝える(文言) {
    if (typeof window.showToast === 'function') window.showToast(文言);
    else console.log(文言);
  }

  // === 組み立て ===

  function 置き場を作る() {
    if (document.getElementById('versionLine')) return;

    const 行 = document.createElement('button');
    行.id = 'versionLine';
    行.type = 'button';
    行.className = 'version-line';
    // 押せば、その場で最新かどうかを確かめられる。
    行.addEventListener('click', () => 更新を確かめる({ 黙って: false }));
    document.body.appendChild(行);

    // 盤面が出ている間は引っ込める。遊んでいる最中に出ていても邪魔なだけなので。
    const 盤面 = document.getElementById('board');
    if (!盤面) return;
    const 合わせる = () => {
      行.hidden = !盤面.hidden;
    };
    合わせる();
    new MutationObserver(合わせる).observe(盤面, {
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }

  置き場を作る();
  版を書き出す();

  // 開いた直後に一度見る。
  // 常時見張ると通信を使い続けるので、あとは画面に戻ってきたときだけ。
  更新を確かめる();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') 更新を確かめる();
  });

  window.版 = { 動いている版, 更新を確かめる };
})();
