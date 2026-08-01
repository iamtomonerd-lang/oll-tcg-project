// セーブデータ — コピペで持ち運べる文字列に、残したいものをまとめる
//
// ブラウザに残したもの（配置の調整など）は、Safariのデータを消すと失われる。
// メモ帳に貼っておいたり、別の端末へ移したりできるよう、
// 1本の文字列に書き出せるようにする。
//
// 【あとから項目を増やせるようにしてある】
// 残したいものが増えたら（デッキ構築・リプレイ・実績など）、
// その機能の側から次のように名乗り出るだけでよい。この画面もこの形式も変えなくてよい。
//
//   window.セーブデータ.登録する({
//     鍵: 'デッキ',
//     名前: '組んだデッキ',
//     集める: () => 書き出したい中身 （無ければ null）,
//     受け取る: 中身 => { 読み込んだときの処理 },
//     要約: 中身 => '3個',   // 省略可。書き出し画面に出す短い説明
//   });
//
// === 文字列の形 ===
//
//   BSSAVE1.<本体>.<検査値>
//
// 本体は中身のJSONをUTF-8にしてbase64にしたもの。
// 途中で改行が入らない1本の文字列なので、iPadでも「すべて選択」でまるごと拾える。
// 検査値は本体から計算した短い値で、コピーが途中で切れていると合わなくなる。

(() => {
  const 印 = 'BSSAVE1';
  const 形式版 = 1;

  // 鍵 → { 名前, 集める, 受け取る, 要約 }
  const 項目表 = new Map();

  // === 文字と数の変換 ===

  function 文字列をbase64に(文字列) {
    const バイト列 = new TextEncoder().encode(文字列);
    let 並び = '';
    for (const バイト of バイト列) 並び += String.fromCharCode(バイト);
    // URLや引用に混ぜても壊れにくいよう + / = を置き換える
    return btoa(並び).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64を文字列に(符号) {
    const 戻し = 符号.replace(/-/g, '+').replace(/_/g, '/');
    const 並び = atob(戻し);
    const バイト列 = new Uint8Array(並び.length);
    for (let i = 0; i < 並び.length; i++) バイト列[i] = 並び.charCodeAt(i);
    return new TextDecoder().decode(バイト列);
  }

  // 途中で切れたコピーに気づくための短い検査値（FNV-1a）。
  // 改ざんを防ぐためのものではない。
  function 検査値を作る(文字列) {
    let 値 = 0x811c9dc5;
    for (let i = 0; i < 文字列.length; i++) {
      値 ^= 文字列.charCodeAt(i);
      値 = Math.imul(値, 0x01000193) >>> 0;
    }
    return 値.toString(36);
  }

  // === 書き出し・読み込み ===

  function 登録する(項目) {
    if (!項目 || !項目.鍵) return;
    項目表.set(項目.鍵, 項目);
  }

  // 今ある中身を集めて1本の文字列にする。残すものが何も無ければ null。
  function 書き出す() {
    const 中身 = {};
    for (const [鍵, 項目] of 項目表) {
      let 集めたもの = null;
      try {
        集めたもの = 項目.集める();
      } catch {
        集めたもの = null;
      }
      if (集めたもの !== null && 集めたもの !== undefined) 中身[鍵] = 集めたもの;
    }
    if (Object.keys(中身).length === 0) return null;

    const 包み = {
      形式: 'oll-tcg',
      版: 形式版,
      作成: new Date().toISOString(),
      中身,
    };
    const 本体 = 文字列をbase64に(JSON.stringify(包み));
    return `${印}.${本体}.${検査値を作る(本体)}`;
  }

  // 文字列を読んで中身を配る。何を入れたかの一覧を返す。
  // 読めなければ理由を投げる。
  function 読み込む(文字列) {
    const 整えた = String(文字列 ?? '')
      .trim()
      // メールやチャットに貼ると改行や空白が混ざることがあるので落とす
      .replace(/\s+/g, '');
    if (整えた === '') throw new Error('セーブデータが空です');

    const 部分 = 整えた.split('.');
    // 頭が合っているなら「このゲームのものではあるが欠けている」と分かる。
    // 選び損ねて途中までコピーすると、たいてい末尾の検査値ごと落ちる。
    if (部分[0] !== 印) {
      throw new Error('このゲームのセーブデータではないようです');
    }
    if (部分.length !== 3) {
      throw new Error('セーブデータが途中で切れています（全部をコピーし直してください）');
    }
    const [, 本体, 検査値] = 部分;
    if (検査値を作る(本体) !== 検査値) {
      throw new Error('セーブデータが途中で切れています（全部をコピーし直してください）');
    }

    let 包み;
    try {
      包み = JSON.parse(base64を文字列に(本体));
    } catch {
      throw new Error('セーブデータを読み取れませんでした');
    }
    if (包み.形式 !== 'oll-tcg') throw new Error('このゲームのセーブデータではありません');
    if (包み.版 > 形式版) {
      throw new Error('新しい版のセーブデータです（ゲームを新しくしてから読み込んでください）');
    }

    const 入れたもの = [];
    const 飛ばしたもの = [];
    for (const [鍵, 中身] of Object.entries(包み.中身 ?? {})) {
      const 項目 = 項目表.get(鍵);
      if (!項目) {
        // 知らない項目は黙って飛ばす。
        // 先の版で増えた項目が入っていても、読める分だけ読めるようにする。
        飛ばしたもの.push(鍵);
        continue;
      }
      項目.受け取る(中身);
      入れたもの.push(項目.名前 ?? 鍵);
    }
    if (入れたもの.length === 0) {
      throw new Error('読み込めるものが入っていませんでした');
    }
    return { 入れたもの, 飛ばしたもの };
  }

  // 書き出し画面に出す「何が入るか」の一覧
  function 中身の要約() {
    const 一覧 = [];
    for (const [鍵, 項目] of 項目表) {
      let 集めたもの = null;
      try {
        集めたもの = 項目.集める();
      } catch {
        集めたもの = null;
      }
      if (集めたもの === null || 集めたもの === undefined) continue;
      let 説明 = '';
      try {
        説明 = 項目.要約 ? 項目.要約(集めたもの) : '';
      } catch {
        説明 = '';
      }
      一覧.push({ 鍵, 名前: 項目.名前 ?? 鍵, 説明 });
    }
    return 一覧;
  }

  // === 画面 ===

  function 伝える(文言) {
    if (typeof window.showToast === 'function') window.showToast(文言);
    else console.log(文言);
  }

  function パネルを開く() {
    if (document.getElementById('savePanel')) return;

    const パネル = document.createElement('div');
    パネル.id = 'savePanel';
    パネル.innerHTML = `
      <div class="save-head">
        <h2>セーブデータ</h2>
        <button id="saveClose" class="save-x" type="button" title="閉じる">✕</button>
      </div>
      <div class="save-body">
        <p class="save-lead">
          この文字列をメモ帳などに貼っておけば、あとで元に戻せます。別の端末にも移せます。
        </p>
        <div class="save-tabs">
          <button class="save-tab selected" data-tab="out" type="button">書き出す</button>
          <button class="save-tab" data-tab="in" type="button">読み込む</button>
        </div>

        <section class="save-pane" data-pane="out">
          <div id="saveContents" class="save-contents"></div>
          <textarea id="saveOut" class="save-text" readonly rows="4" spellcheck="false"></textarea>
          <div class="save-actions">
            <button id="saveCopy" class="btn-solid" type="button">コピー</button>
            <button id="saveSelect" class="btn-outline" type="button">すべて選択</button>
          </div>
        </section>

        <section class="save-pane" data-pane="in" hidden>
          <p class="save-lead">コピーしておいた文字列を貼り付けて「読み込む」を押してください。</p>
          <textarea id="saveIn" class="save-text" rows="4" spellcheck="false"
                    placeholder="BSSAVE1.… を貼り付け"></textarea>
          <div class="save-actions">
            <button id="saveLoad" class="btn-solid" type="button">読み込む</button>
            <button id="savePaste" class="btn-outline" type="button">貼り付け</button>
          </div>
        </section>
      </div>
    `;
    document.body.appendChild(パネル);

    const 閉じる = () => パネル.remove();
    document.getElementById('saveClose').addEventListener('click', 閉じる);

    for (const タブ of パネル.querySelectorAll('.save-tab')) {
      タブ.addEventListener('click', () => {
        for (const t of パネル.querySelectorAll('.save-tab')) {
          t.classList.toggle('selected', t === タブ);
        }
        for (const 面 of パネル.querySelectorAll('.save-pane')) {
          面.hidden = 面.dataset.pane !== タブ.dataset.tab;
        }
      });
    }

    // --- 書き出し側を用意する ---
    const 出力欄 = document.getElementById('saveOut');
    const 一覧欄 = document.getElementById('saveContents');
    const 一覧 = 中身の要約();
    const 文字列 = 書き出す();

    if (文字列 === null) {
      一覧欄.innerHTML = '<p class="save-empty">まだ残せるものがありません。<br>配置を調整して「保存」すると、ここに出てきます。</p>';
      出力欄.value = '';
      document.getElementById('saveCopy').disabled = true;
      document.getElementById('saveSelect').disabled = true;
    } else {
      一覧欄.innerHTML =
        '<p class="save-listtitle">入っているもの</p><ul class="save-list">' +
        一覧
          .map(項 => `<li><b>${項.名前}</b>${項.説明 ? `<span>${項.説明}</span>` : ''}</li>`)
          .join('') +
        '</ul>';
      出力欄.value = 文字列;
    }

    const すべて選択 = () => {
      出力欄.focus();
      出力欄.select();
      出力欄.setSelectionRange(0, 出力欄.value.length); // iOS Safari 対策
    };
    document.getElementById('saveSelect').addEventListener('click', すべて選択);

    document.getElementById('saveCopy').addEventListener('click', async () => {
      if (!出力欄.value) return;
      try {
        await navigator.clipboard.writeText(出力欄.value);
        伝える('セーブデータをコピーしました');
      } catch {
        // 許可が下りない場合は選択状態にして、手で「コピー」してもらう
        すべて選択();
        伝える('選択しました。長押しして「コピー」を選んでください');
      }
    });

    // --- 読み込み側 ---
    const 入力欄 = document.getElementById('saveIn');

    document.getElementById('savePaste').addEventListener('click', async () => {
      try {
        入力欄.value = await navigator.clipboard.readText();
      } catch {
        入力欄.focus();
        伝える('貼り付けできませんでした。長押しして「ペースト」を選んでください');
      }
    });

    document.getElementById('saveLoad').addEventListener('click', () => {
      try {
        const { 入れたもの, 飛ばしたもの } = 読み込む(入力欄.value);
        const 飛ばした説明 =
          飛ばしたもの.length > 0 ? `（${飛ばしたもの.join('・')}は読めないので飛ばしました）` : '';
        伝える(`${入れたもの.join('・')}を読み込みました${飛ばした説明}`);
        閉じる();
      } catch (e) {
        伝える(e.message ?? '読み込めませんでした');
      }
    });
  }

  // === 外に出す ===

  window.セーブデータ = { 登録する, 書き出す, 読み込む, パネルを開く };

  // 入口のボタン。配置ボタンの隣に並ぶ。
  const 入口 = document.createElement('button');
  入口.id = 'saveDataBtn';
  入口.type = 'button';
  入口.textContent = '💾 データ';
  入口.addEventListener('click', パネルを開く);
  document.body.appendChild(入口);
})();
