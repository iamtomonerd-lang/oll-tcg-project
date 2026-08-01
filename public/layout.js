// 配置モード — 盤面のブロックの位置と大きさを、コードを書かずに決める
//
// 座標と大きさは「盤面に対する％」で持つ。画面の大きさが変わっても比率が保たれる。
// ドラッグでおおまかに置き、数値欄と矢印キーでぴったり合わせる。
// 「保存」を押すとサーバーに書き込まれ、次に開いたときの既定の配置になる。

(() => {
  // 動かせるブロック。ここに1行足せば調整対象が増える。
  const ブロック定義 = [
    { id: '相手情報', 名前: '相手の情報バー', セレクタ: '.side-foe .side-bar' },
    { id: '相手手札', 名前: '相手の手札', セレクタ: '#foeHand' },
    { id: '相手フィールド', 名前: '相手のフィールド', セレクタ: '#foeField' },
    { id: 'ターン表示', 名前: 'ターン表示', セレクタ: '#turnBanner' },
    { id: '自分フィールド', 名前: '自分のフィールド', セレクタ: '#selfField' },
    { id: '自分情報', 名前: '自分の情報バー', セレクタ: '.side-self .side-bar' },
    { id: '自分手札', 名前: '自分の手札', セレクタ: '#selfHand' },
  ];

  const 既定のカード幅 = 108;
  const 吸着の刻み = 0.5; // ％
  const 最小の大きさ = 2; // ％

  const 盤面 = document.getElementById('board');

  let レイアウト = null; // { 版, カード幅, ブロック: { id: {x,y,w,h} } }
  let 編集中か = false;
  let 選択中 = null; // ブロックid
  let 重ね = null; // #layoutOverlay
  const プロキシ表 = new Map(); // id → 操作用の板

  // === 下ごしらえ ===

  const 要素 = id => {
    const 定義 = ブロック定義.find(b => b.id === id);
    return 定義 ? document.querySelector(定義.セレクタ) : null;
  };

  const 丸める = 値 => Math.round(値 * 10) / 10;

  const 吸着 = (値, 効かせるか) =>
    効かせるか ? Math.round(値 / 吸着の刻み) * 吸着の刻み : 丸める(値);

  const 挟む = (値, 下, 上) => Math.min(上, Math.max(下, 値));

  // ブロックは盤面の内側に収める。
  // 外にはみ出せると、掴む場所ごと画面の外へ消えて戻せなくなるため。
  function 正す(箱) {
    箱.w = 挟む(丸める(箱.w), 最小の大きさ, 100);
    箱.h = 挟む(丸める(箱.h), 最小の大きさ, 100);
    箱.x = 丸める(挟む(丸める(箱.x), 0, 100 - 箱.w));
    箱.y = 丸める(挟む(丸める(箱.y), 0, 100 - 箱.h));
    return 箱;
  }

  // === 当てる・外す ===

  function 適用する() {
    if (!レイアウト) return;
    盤面.classList.add('layout-applied');
    document.documentElement.style.setProperty(
      '--card-w',
      `${レイアウト.カード幅 ?? 既定のカード幅}px`
    );
    for (const 定義 of ブロック定義) {
      const 箱 = レイアウト.ブロック[定義.id];
      const 対象 = 要素(定義.id);
      if (!箱 || !対象) continue;
      対象.style.left = `${箱.x}%`;
      対象.style.top = `${箱.y}%`;
      対象.style.width = `${箱.w}%`;
      対象.style.height = `${箱.h}%`;
    }
  }

  function 解除する() {
    盤面.classList.remove('layout-applied');
    document.documentElement.style.removeProperty('--card-w');
    for (const 定義 of ブロック定義) {
      const 対象 = 要素(定義.id);
      if (!対象) continue;
      対象.style.left = '';
      対象.style.top = '';
      対象.style.width = '';
      対象.style.height = '';
    }
  }

  // 今の見た目をそのまま初期値にする。編集を始めても画面が飛ばない。
  function 現状から作る() {
    const 盤 = 盤面.getBoundingClientRect();
    const ブロック = {};
    for (const 定義 of ブロック定義) {
      const 対象 = document.querySelector(定義.セレクタ);
      if (!対象) continue;
      const r = 対象.getBoundingClientRect();
      ブロック[定義.id] = 正す({
        x: ((r.left - 盤.left) / 盤.width) * 100,
        y: ((r.top - 盤.top) / 盤.height) * 100,
        w: (r.width / 盤.width) * 100,
        h: (r.height / 盤.height) * 100,
      });
    }
    return { 版: 1, カード幅: 既定のカード幅, ブロック };
  }

  // === 操作用の板 ===

  function 重ねを作る() {
    重ね = document.createElement('div');
    重ね.id = 'layoutOverlay';
    盤面.appendChild(重ね);

    for (const 定義 of ブロック定義) {
      if (!レイアウト.ブロック[定義.id]) continue;

      const 板 = document.createElement('div');
      板.className = 'layout-proxy';
      板.dataset.id = 定義.id;

      const 名札 = document.createElement('span');
      名札.className = 'layout-proxy-name';
      名札.textContent = 定義.名前;
      板.appendChild(名札);

      const つまみ = document.createElement('div');
      つまみ.className = 'layout-handle';
      板.appendChild(つまみ);

      板.addEventListener('pointerdown', e => 掴む(e, 定義.id, 'move'));
      つまみ.addEventListener('pointerdown', e => 掴む(e, 定義.id, 'resize'));

      重ね.appendChild(板);
      プロキシ表.set(定義.id, 板);
    }
  }

  function 重ねを消す() {
    重ね?.remove();
    重ね = null;
    プロキシ表.clear();
  }

  // === ドラッグ ===

  let 掴み = null;

  function 掴む(e, id, 種類) {
    e.preventDefault();
    e.stopPropagation();
    選ぶ(id);
    const 箱 = レイアウト.ブロック[id];
    const 盤 = 盤面.getBoundingClientRect();
    掴み = {
      id,
      種類,
      始点X: e.clientX,
      始点Y: e.clientY,
      元: { ...箱 },
      盤幅: 盤.width,
      盤高: 盤.height,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function 動かす(e) {
    if (!掴み) return;
    const 差X = ((e.clientX - 掴み.始点X) / 掴み.盤幅) * 100;
    const 差Y = ((e.clientY - 掴み.始点Y) / 掴み.盤高) * 100;
    const 吸わせる = !e.altKey; // Alt を押している間は吸着しない
    const 箱 = レイアウト.ブロック[掴み.id];

    if (掴み.種類 === 'move') {
      箱.x = 吸着(掴み.元.x + 差X, 吸わせる);
      箱.y = 吸着(掴み.元.y + 差Y, 吸わせる);
    } else {
      箱.w = 吸着(掴み.元.w + 差X, 吸わせる);
      箱.h = 吸着(掴み.元.h + 差Y, 吸わせる);
    }
    正す(箱);
    適用する();
    同期する();
  }

  function 離す() {
    掴み = null;
  }

  window.addEventListener('pointermove', 動かす);
  window.addEventListener('pointerup', 離す);
  window.addEventListener('pointercancel', 離す);

  // === 選択と数値 ===

  function 選ぶ(id) {
    選択中 = id;
    同期する();
  }

  function 同期する() {
    for (const [id, 板] of プロキシ表) {
      const 箱 = レイアウト.ブロック[id];
      板.style.left = `${箱.x}%`;
      板.style.top = `${箱.y}%`;
      板.style.width = `${箱.w}%`;
      板.style.height = `${箱.h}%`;
      板.classList.toggle('selected', id === 選択中);
    }
    for (const ボタン of document.querySelectorAll('.layout-block-btn')) {
      ボタン.classList.toggle('selected', ボタン.dataset.id === 選択中);
    }
    const 箱 = 選択中 ? レイアウト.ブロック[選択中] : null;
    for (const 名 of ['x', 'y', 'w', 'h']) {
      const 入力 = document.getElementById(`layoutNum_${名}`);
      if (!入力) continue;
      入力.disabled = !箱;
      if (箱 && document.activeElement !== 入力) 入力.value = 箱[名];
    }
  }

  // 矢印キーでの微調整。Shift を足すと 0.1％ ずつ動く。
  function キー操作(e) {
    if (!編集中か || !選択中) return;
    const 向き = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!向き) return;
    if (document.activeElement?.tagName === 'INPUT') return;
    e.preventDefault();
    const 刻み = e.shiftKey ? 0.1 : 吸着の刻み;
    const 箱 = レイアウト.ブロック[選択中];
    if (e.metaKey || e.ctrlKey) {
      箱.w += 向き[0] * 刻み;
      箱.h += 向き[1] * 刻み;
    } else {
      箱.x += 向き[0] * 刻み;
      箱.y += 向き[1] * 刻み;
    }
    正す(箱);
    適用する();
    同期する();
  }

  window.addEventListener('keydown', キー操作);

  // === パネル ===

  function パネルを作る() {
    const パネル = document.createElement('div');
    パネル.id = 'layoutPanel';
    パネル.innerHTML = `
      <div class="layout-panel-head">
        <h2>配置モード</h2>
        <button id="layoutFold" class="layout-fold" type="button" title="たたむ">▾</button>
      </div>
      <div class="layout-panel-body">
      <div class="layout-block-list">
        ${ブロック定義
          .filter(b => レイアウト.ブロック[b.id])
          .map(b => `<button class="layout-block-btn" data-id="${b.id}" type="button">${b.名前}</button>`)
          .join('')}
      </div>
      <div class="layout-nums">
        <div class="layout-num"><label for="layoutNum_x">左</label><input id="layoutNum_x" type="number" step="0.1" disabled></div>
        <div class="layout-num"><label for="layoutNum_y">上</label><input id="layoutNum_y" type="number" step="0.1" disabled></div>
        <div class="layout-num"><label for="layoutNum_w">幅</label><input id="layoutNum_w" type="number" step="0.1" disabled></div>
        <div class="layout-num"><label for="layoutNum_h">高さ</label><input id="layoutNum_h" type="number" step="0.1" disabled></div>
      </div>
      <div class="layout-row">
        <span>カード</span>
        <input id="layoutCardW" type="range" min="60" max="220" step="2">
        <span class="layout-readout" id="layoutCardWOut">108px</span>
      </div>
      <div class="layout-actions">
        <button id="layoutSave" class="btn-solid" type="button">保存</button>
        <button id="layoutClose" class="btn-outline" type="button">閉じる</button>
        <button id="layoutReset" class="btn-outline" type="button">既定に戻す</button>
      </div>
      <p class="layout-hint">
        ドラッグで移動、右下の四角で大きさ。矢印キーで微調整（Shiftで細かく、Ctrlで大きさ）。
        Altを押しながらだと吸着しません。数値は盤面に対する％です。
        このパネルは見出しを掴めば動かせます。
      </p>
      </div>
    `;
    document.body.appendChild(パネル);

    パネルを掴めるようにする(パネル);
    document.getElementById('layoutFold').addEventListener('click', () => {
      const たたむ = パネル.classList.toggle('folded');
      document.getElementById('layoutFold').textContent = たたむ ? '▸' : '▾';
    });

    for (const ボタン of パネル.querySelectorAll('.layout-block-btn')) {
      ボタン.addEventListener('click', () => 選ぶ(ボタン.dataset.id));
    }
    for (const 名 of ['x', 'y', 'w', 'h']) {
      const 入力 = document.getElementById(`layoutNum_${名}`);
      入力.addEventListener('input', () => {
        if (!選択中) return;
        const 値 = parseFloat(入力.value);
        if (Number.isNaN(値)) return;
        レイアウト.ブロック[選択中][名] = 値;
        正す(レイアウト.ブロック[選択中]);
        適用する();
        同期する();
      });
    }

    const カード幅 = document.getElementById('layoutCardW');
    const カード幅表示 = document.getElementById('layoutCardWOut');
    カード幅.value = レイアウト.カード幅 ?? 既定のカード幅;
    カード幅表示.textContent = `${カード幅.value}px`;
    カード幅.addEventListener('input', () => {
      レイアウト.カード幅 = Number(カード幅.value);
      カード幅表示.textContent = `${カード幅.value}px`;
      適用する();
    });

    document.getElementById('layoutSave').addEventListener('click', 保存する);
    document.getElementById('layoutClose').addEventListener('click', 編集を閉じる);
    document.getElementById('layoutReset').addEventListener('click', 既定に戻す);
  }

  function パネルを消す() {
    document.getElementById('layoutPanel')?.remove();
  }

  // パネルが調整したいブロックを隠すことがあるので、見出しを掴んで動かせるようにする
  function パネルを掴めるようにする(パネル) {
    const 見出し = パネル.querySelector('.layout-panel-head');
    let 掴み中 = null;
    見出し.addEventListener('pointerdown', e => {
      if (e.target.closest('.layout-fold')) return;
      const r = パネル.getBoundingClientRect();
      掴み中 = { 差X: e.clientX - r.left, 差Y: e.clientY - r.top };
      パネル.style.right = 'auto';
      パネル.style.bottom = 'auto';
      見出し.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    見出し.addEventListener('pointermove', e => {
      if (!掴み中) return;
      // パネルごと画面の外へ出ると押せなくなるので、全体が入る範囲に留める
      const r = パネル.getBoundingClientRect();
      const 右端 = Math.max(0, window.innerWidth - r.width);
      const 下端 = Math.max(0, window.innerHeight - r.height);
      パネル.style.left = `${挟む(e.clientX - 掴み中.差X, 0, 右端)}px`;
      パネル.style.top = `${挟む(e.clientY - 掴み中.差Y, 0, 下端)}px`;
    });
    見出し.addEventListener('pointerup', () => {
      掴み中 = null;
    });
  }

  // === 出入り ===

  function 編集を開く() {
    if (盤面.hidden) {
      伝える('対戦を始めてから配置を調整してください');
      return;
    }
    if (!レイアウト) {
      レイアウト = 現状から作る();
    }
    編集中か = true;
    適用する();
    盤面.classList.add('layout-editing');
    重ねを作る();
    パネルを作る();
    選ぶ(ブロック定義.find(b => レイアウト.ブロック[b.id])?.id ?? null);
    document.getElementById('layoutEditBtn').hidden = true;
  }

  function 編集を閉じる() {
    編集中か = false;
    選択中 = null;
    盤面.classList.remove('layout-editing');
    重ねを消す();
    パネルを消す();
    document.getElementById('layoutEditBtn').hidden = false;
  }

  // === 保存・読み込み ===

  // 黙って:true なら知らせを出さない。
  // セーブデータから読み込んだ直後など、別の知らせを消したくない場面で使う。
  async function 保存する({ 黙って = false } = {}) {
    try {
      const 応答 = await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(レイアウト),
      });
      const 結果 = await 応答.json();
      if (!黙って) 伝える(結果.ok ? '配置を保存しました' : 結果.error || '保存できませんでした');
    } catch {
      if (!黙って) 伝える('保存できませんでした');
    }
  }

  async function 既定に戻す() {
    if (!window.confirm('保存した配置を消して、元の並びに戻します。よろしいですか？')) return;
    try {
      await fetch('/api/layout', { method: 'DELETE' });
    } catch {
      /* 消せなくても画面上は戻す */
    }
    レイアウト = null;
    解除する();
    編集を閉じる();
    伝える('元の並びに戻しました');
  }

  async function 読み込む() {
    try {
      const 応答 = await fetch('/api/layout');
      const 結果 = await 応答.json();
      if (結果.ok && 結果.レイアウト) {
        レイアウト = 結果.レイアウト;
        適用する();
      }
    } catch {
      /* 配置が無ければ元の並びのまま */
    }
  }

  // game.js のトーストがあれば使う
  function 伝える(文言) {
    if (typeof window.showToast === 'function') window.showToast(文言);
    else console.log(文言);
  }

  // === セーブデータに相乗りする ===
  //
  // 「配置」をコピペで持ち運べるものの1つとして名乗り出る。
  // 書き出し・読み込みの画面そのものは セーブデータ.js が持っているので、
  // ここは中身の受け渡しだけを引き受ける。

  function セーブデータに登録する() {
    if (!window.セーブデータ) return;
    window.セーブデータ.登録する({
      鍵: '配置',
      名前: '画面の配置',
      集める: () => レイアウト,
      受け取る: 受け取った => {
        if (!受け取った || typeof 受け取った.ブロック !== 'object') {
          throw new Error('配置の形が正しくありません');
        }
        レイアウト = 受け取った;
        // 画面外へ飛んでいる値が混ざっていても掴めなくならないようにする
        for (const 箱 of Object.values(レイアウト.ブロック)) 正す(箱);
        適用する();
        if (編集中か) {
          重ねを消す();
          重ねを作る();
          同期する();
        }
        // 次に開いたときも同じになるよう、そのまま保存しておく。
        // 知らせは セーブデータ側 が出すので、ここは黙って書く。
        保存する({ 黙って: true });
      },
      要約: 受け取った => `ブロック${Object.keys(受け取った.ブロック ?? {}).length}個`,
    });
  }

  // === 入口 ===

  const 入口 = document.createElement('button');
  入口.id = 'layoutEditBtn';
  入口.type = 'button';
  入口.textContent = '⚙ 配置';
  入口.addEventListener('click', 編集を開く);
  document.body.appendChild(入口);

  セーブデータに登録する();
  読み込む();
})();
