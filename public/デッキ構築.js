// デッキ構築 — 40枚・同名3枚までのデッキを、指で組む
//
// 決まりの判定はサーバー側（判定/デッキ構築判定.ts）にしかない。
// この画面は「あと何枚か」を出して押せる範囲を狭めるだけで、
// 組めるかどうかを自分で決めない。押せてしまっても最後は API が弾く。
//
// 組んだ中身は セーブデータ に相乗りするので、コピペで持ち運べる。

(() => {
  const 決まり = { 枚数: 40, 同名の上限: 3 };

  let 見出し一覧 = [];      // カード帳から取ってくる
  let 番号の索引 = new Map();
  let 構築 = {};             // カードナンバー → 枚数
  let 読み込み済み = false;

  const 要素 = id => document.getElementById(id);

  // === 数える ===

  const 合計 = () =>
    Object.values(構築).reduce((和, 枚) => 和 + (Number.isInteger(枚) && 枚 > 0 ? 枚 : 0), 0);

  // 同名はカード名で数える。カードナンバーで数えると、
  // 同じ名前が別番号で出たときに4枚以上入ってしまう。
  function カード名ごとの枚数() {
    const 集計 = new Map();
    for (const [番号, 枚] of Object.entries(構築)) {
      if (!枚) continue;
      const 名 = 番号の索引.get(番号)?.カード名;
      if (!名) continue;
      集計.set(名, (集計.get(名) ?? 0) + 枚);
    }
    return 集計;
  }

  function あと何枚足せるか(番号) {
    const 項 = 番号の索引.get(番号);
    if (!項) return 0;
    const 同名の残り = 決まり.同名の上限 - (カード名ごとの枚数().get(項.カード名) ?? 0);
    const 全体の残り = 決まり.枚数 - 合計();
    return Math.max(0, Math.min(同名の残り, 全体の残り));
  }

  // === 出し入れ ===

  function 足す(番号) {
    if (あと何枚足せるか(番号) <= 0) return;
    構築[番号] = (構築[番号] ?? 0) + 1;
    描き直す();
  }

  function 減らす(番号) {
    if (!構築[番号]) return;
    構築[番号] -= 1;
    if (構築[番号] <= 0) delete 構築[番号];
    描き直す();
  }

  function 空にする() {
    if (合計() > 0 && !window.confirm('組みかけのデッキを空にします。よろしいですか？')) return;
    構築 = {};
    描き直す();
  }

  // 40枚まで、上から順に3枚ずつ入れる。何もないところから始めるのは大変なので。
  function 見本を入れる() {
    構築 = {};
    let 残り = 決まり.枚数;
    for (const 項 of 見出し一覧) {
      if (残り <= 0) break;
      const 入れる = Math.min(決まり.同名の上限, 残り);
      構築[項.カードナンバー] = 入れる;
      残り -= 入れる;
    }
    描き直す();
  }

  // === 描く ===

  const 絵柄 = 番号 =>
    window.CARD_ART_URL ? window.CARD_ART_URL(番号) : `cards/${番号}.png`;

  // 行の作り直しはしない。
  // ＋を押すたびに一覧を組み直すと、スクロール位置が先頭に戻ってしまう。
  // 一覧の下のほうにあるカードを増やせなくなるので、中身だけ書き換える。
  const 行の控え = new Map(); // カードナンバー → { 行, 数の欄, 増やす, 減らす }

  function 一覧を組み立てる() {
    const 置き場 = 要素('deckCardList');
    if (!置き場) return;
    置き場.innerHTML = '';
    行の控え.clear();

    for (const 項 of 見出し一覧) {
      const 行 = document.createElement('div');
      行.className = 'deck-card';
      行.dataset.number = 項.カードナンバー;

      const 絵 = 項.カードナンバー.startsWith('26RSD01-')
        ? `<div class="deck-card-art" style="background-image:url('${絵柄(項.カードナンバー)}')"></div>`
        : `<div class="deck-card-art deck-card-noart">${項.カード種別[0]}</div>`;

      行.innerHTML = `
        ${絵}
        <div class="deck-card-body">
          <div class="deck-card-name">${項.表示名}</div>
          <div class="deck-card-sub">${項.カード種別}・コスト${項.コスト}${
            項.系統.length ? `・${項.系統.join('/')}` : ''
          }</div>
        </div>
        <div class="deck-card-count">
          <button class="deck-minus" type="button" aria-label="減らす">−</button>
          <span class="deck-num">0</span>
          <button class="deck-plus" type="button" aria-label="増やす">＋</button>
        </div>
      `;

      const 増やす = 行.querySelector('.deck-plus');
      const 減らすボタン = 行.querySelector('.deck-minus');
      増やす.addEventListener('click', () => 足す(項.カードナンバー));
      減らすボタン.addEventListener('click', () => 減らす(項.カードナンバー));

      行の控え.set(項.カードナンバー, {
        行,
        数の欄: 行.querySelector('.deck-num'),
        増やす,
        減らす: 減らすボタン,
      });
      置き場.appendChild(行);
    }
  }

  function 一覧の中身を合わせる() {
    for (const [番号, 部品] of 行の控え) {
      const 枚数 = 構築[番号] ?? 0;
      部品.数の欄.textContent = String(枚数);
      部品.行.classList.toggle('picked', 枚数 > 0);
      部品.増やす.disabled = あと何枚足せるか(番号) <= 0;
      部品.減らす.disabled = 枚数 <= 0;
    }
  }

  function 足元を描く() {
    const 数 = 合計();
    const 数の欄 = 要素('deckTotal');
    if (数の欄) {
      数の欄.textContent = `${数} / ${決まり.枚数}`;
      数の欄.classList.toggle('deck-ok', 数 === 決まり.枚数);
      数の欄.classList.toggle('deck-over', 数 > 決まり.枚数);
    }

    // 組めない理由を出す。出すのは1つだけ（並べても読まないので）。
    const 理由の欄 = 要素('deckWhy');
    const 対戦ボタン = 要素('deckPlay');
    const 多すぎる名 = [...カード名ごとの枚数()].find(([, 枚]) => 枚 > 決まり.同名の上限);

    let 理由 = '';
    if (多すぎる名) 理由 = `「${多すぎる名[0]}」が${多すぎる名[1]}枚（同じ名前は${決まり.同名の上限}枚まで）`;
    else if (数 < 決まり.枚数) 理由 = `あと${決まり.枚数 - 数}枚`;
    else if (数 > 決まり.枚数) 理由 = `${数 - 決まり.枚数}枚多いです`;

    if (理由の欄) 理由の欄.textContent = 理由;
    if (対戦ボタン) 対戦ボタン.disabled = 理由 !== '';
  }

  function 描き直す() {
    if (行の控え.size === 0) 一覧を組み立てる();
    一覧の中身を合わせる();
    足元を描く();
  }

  // === 出入り口 ===

  async function カード帳を取り寄せる() {
    if (読み込み済み) return true;
    try {
      const 応答 = await fetch('/api/cards');
      const 結果 = await 応答.json();
      if (!結果.ok) throw new Error(結果.error ?? 'カード一覧を取れません');
      見出し一覧 = 結果.カード;
      番号の索引 = new Map(見出し一覧.map(項 => [項.カードナンバー, 項]));
      if (結果.決まり) Object.assign(決まり, 結果.決まり);
      読み込み済み = true;
      return true;
    } catch (e) {
      伝える(e.message ?? 'カード一覧を取れませんでした');
      return false;
    }
  }

  function 伝える(文言) {
    if (typeof window.showToast === 'function') window.showToast(文言);
    else console.log(文言);
  }

  async function 開く() {
    if (!(await カード帳を取り寄せる())) return;
    要素('deckBuildScreen').hidden = false;
    // 画面の隅に居座っているもの（版表示・データ・配置）を引っ込める。
    // この画面は下まで使うので、重なって押せなくなる。
    document.body.classList.add('deck-building');
    描き直す();
  }

  function 閉じる() {
    要素('deckBuildScreen').hidden = true;
    document.body.classList.remove('deck-building');
  }

  function 対戦へ() {
    // 押せないようにはしてあるが、念のためここでも見る
    if (合計() !== 決まり.枚数) return;
    閉じる();
    window.組んだデッキで対戦する({ ...構築 });
  }

  // === 組み立て ===

  function 画面を作る() {
    const 幕 = document.createElement('section');
    幕.id = 'deckBuildScreen';
    幕.className = 'overlay-screen';
    幕.hidden = true;
    幕.innerHTML = `
      <div class="deck-build">
        <div class="deck-build-head">
          <h2>デッキを組む</h2>
          <p class="deck-build-lead">ちょうど${決まり.枚数}枚。同じ名前は${決まり.同名の上限}枚まで。</p>
          <button id="deckBuildClose" class="btn-outline" type="button">← 戻る</button>
        </div>
        <div id="deckCardList" class="deck-card-list"></div>
        <div class="deck-build-foot">
          <div class="deck-foot-left">
            <span id="deckTotal" class="deck-total">0 / ${決まり.枚数}</span>
            <span id="deckWhy" class="deck-why"></span>
          </div>
          <div class="deck-foot-right">
            <button id="deckSample" class="btn-outline" type="button">見本を入れる</button>
            <button id="deckClear" class="btn-outline" type="button">空にする</button>
            <button id="deckPlay" class="btn-solid" type="button" disabled>この40枚で対戦</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(幕);

    要素('deckBuildClose').addEventListener('click', 閉じる);
    要素('deckSample').addEventListener('click', 見本を入れる);
    要素('deckClear').addEventListener('click', 空にする);
    要素('deckPlay').addEventListener('click', 対戦へ);
  }

  // デッキ選択画面に入口を足す
  function 入口を足す() {
    const 置き場 = document.querySelector('#deckScreen .mode-choices');
    if (!置き場) return;
    const ボタン = document.createElement('button');
    ボタン.className = 'mode-btn deck-build-btn';
    ボタン.type = 'button';
    ボタン.innerHTML =
      '<span class="mode-btn-title">🛠 デッキを組む</span>' +
      `<span class="mode-btn-desc">${決まり.枚数}枚のデッキを自分で組む（同じ名前は${決まり.同名の上限}枚まで）</span>`;
    ボタン.addEventListener('click', 開く);
    置き場.appendChild(ボタン);
  }

  // === セーブデータに相乗りする ===

  function セーブデータに登録する() {
    if (!window.セーブデータ) return;
    window.セーブデータ.登録する({
      鍵: 'デッキ',
      名前: '組んだデッキ',
      集める: () => (合計() > 0 ? 構築 : null),
      受け取る: 受け取った => {
        if (!受け取った || typeof 受け取った !== 'object') {
          throw new Error('デッキの形が正しくありません');
        }
        // 数として読めるものだけ受け取る。中身の正しさは開いたときに画面が示す。
        const 直した = {};
        for (const [番号, 枚] of Object.entries(受け取った)) {
          const 数 = Number(枚);
          if (Number.isInteger(数) && 数 > 0) 直した[番号] = 数;
        }
        構築 = 直した;
        if (読み込み済み) 描き直す();
      },
      要約: 中身 =>
        `${Object.values(中身).reduce((和, 枚) => 和 + 枚, 0)}枚 / ${Object.keys(中身).length}種`,
    });
  }

  画面を作る();
  入口を足す();
  セーブデータに登録する();

  window.デッキ構築 = { 開く, 閉じる };
})();
