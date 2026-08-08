// バトルスピリッツ・スタン — 対戦盤面のクライアント側ロジック
// サーバーの `試合`（バトルスピリッツスタン）を薄くラップしたAPIを叩き、視点(as)ごとの状態を描画する。

let viewer = 'p1';       // 今この画面が誰の視点として振る舞っているか（vsHumanでは手番ごとに切り替わる）
let lastState = null;
let activeCoreCard = null;
let coreMoveAmount = 1;
let selectedDeck = 'gungata'; // 選択されたデッキ

// カードナンバー → 絵柄画像のパス（絵柄が無いカードは既定のグラデーションで表示する）
const CARD_ART = {
  '26RSD01-001': 'cards/26RSD01-001.png',
  '26RSD01-002': 'cards/26RSD01-002.png',
  '26RSD01-003': 'cards/26RSD01-003.png',
  '26RSD01-004': 'cards/26RSD01-004.png',
  '26RSD01-005': 'cards/26RSD01-005.png',
  '26RSD01-006': 'cards/26RSD01-006.png',
  '26RSD01-007': 'cards/26RSD01-007.png',
  '26RSD01-008': 'cards/26RSD01-008.png',
  '26RSD01-009': 'cards/26RSD01-009.png',
  '26RSD01-010': 'cards/26RSD01-010.png',
  '26RSD01-011': 'cards/26RSD01-011.png',
  '26RSD01-012': 'cards/26RSD01-012.png',
  '26RSD01-013': 'cards/26RSD01-013.png',
  '26RSD01-014': 'cards/26RSD01-014.png',
  '26RSD01-X01': 'cards/26RSD01-X01.png',
  '26RSD01-X02': 'cards/26RSD01-X02.png',
};

const el = id => document.getElementById(id);

const deckScreen = el('deckScreen');
const modeScreen = el('modeScreen');
const handoffScreen = el('handoffScreen');
const resultScreen = el('resultScreen');
const board = el('board');

function showOnly(screen) {
  for (const s of [deckScreen, modeScreen, handoffScreen, resultScreen, board]) {
    s.hidden = s !== screen;
  }
}

function showToast(message) {
  const toast = el('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

// 配置モード（layout.js）からも知らせを出せるようにする
window.showToast = showToast;

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) {
    showToast(data.error || 'エラーが発生しました');
    return null;
  }
  return data.state;
}

// === パネルは常に1枚だけ出す ===
//
// popover はどれも画面のまん中に position:fixed で置かれ、z-index も同じ。
// 2枚出れば文字がそのまま重なり、下になったほうのボタンは押せない。
// フラッシュの窓が開いているときにフレイムハリケーンを押すと、
// 支払い画面が割り込みの窓とぴったり重なって手が進められなくなっていた。
//
// パネルには2種類ある。
//   盤面のパネル … 状態から出るもの（割り込み・ブロック・効果の対象選択・起動効果）
//   人のパネル   … 人が押して開くもの（支払い・コア移動・トラッシュ・カードの説明）
// 人のパネルは同時に1枚だけ。開いているあいだは盤面のパネルを引っ込め、
// 閉じたら盤面のパネルが戻る（状態は消えていないので描き直すだけでよい）。
const 人のパネル一覧 = [
  'payPanel',
  'coreMovePanel',
  'trashPanel',
  'cardEffectPanel',
  'cardDetailPanel',
];
let 人が開いているパネル = null;

function パネルを開く(識別子) {
  for (const 他 of 人のパネル一覧) {
    if (他 !== 識別子) el(他).hidden = true;
  }
  人が開いているパネル = 識別子;
  el(識別子).hidden = false;
  if (lastState) renderBoard(lastState); // 盤面のパネルを引っ込める
}

function パネルを閉じる(識別子) {
  el(識別子).hidden = true;
  if (人が開いているパネル === 識別子) 人が開いているパネル = null;
  if (lastState) renderBoard(lastState); // 盤面のパネルを戻す
}

function 人のパネルを全部閉じる() {
  for (const 識別子 of 人のパネル一覧) el(識別子).hidden = true;
  人が開いているパネル = null;
}

function applyState(state) {
  if (!state) return;
  lastState = state;

  if (state.試合終了か) {
    renderResult(state);
    showOnly(resultScreen);
    // パネルを非表示にする
    el('blockPanel').hidden = true;
    人のパネルを全部閉じる();
    return;
  }

  if (state.モード === 'vsHuman' && !state.自分が実行者か) {
    // 自動で次のプレイヤーに切り替え（交代画面をスキップ）
    viewer = state.実行者識別子;
    setTimeout(() => {
      api('GET', `/api/game/state?as=${viewer}`).then(applyState);
    }, 500);
    return;
  }

  renderBoard(state);
  showOnly(board);
}

// === デッキ選択 ===

// デッキ構築の画面から「この40枚で対戦」と言われたときの入口。
// game.js は組み立ての中身を知らず、選ばれたことだけを受け取る。
window.組んだデッキで対戦する = 構築 => {
  window.組んだデッキ = 構築;
  selectedDeck = 'custom';
  el('modeEyebrow').textContent = '組んだデッキで対戦';
  showOnly(modeScreen);
};

for (const btn of document.querySelectorAll('.deck-btn')) {
  btn.addEventListener('click', () => {
    selectedDeck = btn.dataset.deck;
    const deckNames = {
      'gungata': 'グン＝ガタ',
      'rowamique': 'ロワミーク',
      'genbo': 'ゲン＝ボー',
      'mushaako': 'ムーシャッコ',
      'harria': 'ハーリア',
      'cupel': 'キュペル',
      'greifer': 'グライファー',
      'seltarius': 'セルタリウス',
      'leufalus': '飛傑レウファルス',
      'fuugagan': '最奥：風牙岩',
      'ganiki': '浮遊岩域',
      'breakclaw': 'ブレイククロー',
      'offering': 'オフェリングドロー',
      'flame': 'フレイムハリケーン',
      'rensis': '飛赫レンシス',
      'akurai': '飛剛アクライ',
      'mixed': '風牙＋風牙以外（混成）',
      'effect': '効果ぜんぶ入り',
      'purple': '紫／血醒',
    };
    const deckName = deckNames[btn.dataset.deck] || 'デッキ';
    el('modeEyebrow').textContent = `${deckName}で対戦`;
    showOnly(modeScreen);
    window.dispatchEvent(new CustomEvent('デッキを選んだ', { detail: btn.dataset.deck }));
  });
}

el('deckBack').addEventListener('click', () => {
  showOnly(deckScreen);
});

// === モード選択 ===

for (const btn of document.querySelectorAll('.mode-btn[data-mode]')) {
  btn.addEventListener('click', async () => {
    viewer = 'p1';
    // 組んだデッキを使うときは、その中身も一緒に送る（デッキ構築.js が入れる）
    const 送るもの = { mode: btn.dataset.mode, deck: selectedDeck };
    if (selectedDeck === 'custom') 送るもの.構築 = window.組んだデッキ ?? null;
    // ?seed=123 を付けて開くと、同じ引きの試合を何度でも作れる。
    // 画面の不具合を「直す前」「直した後」で比べるには、同じ試合である必要がある。
    const 種 = new URLSearchParams(location.search).get('seed');
    if (種 !== null && 種 !== '' && Number.isFinite(Number(種))) 送るもの.seed = Number(種);
    const state = await api('POST', '/api/game/start', 送るもの);
    applyState(state);
  });
}

// === 受け渡し画面 ===

function renderHandoff(state) {
  el('handoffName').textContent = state.相手.名前;
  el('handoffReason').textContent = 'の番です';
  handoffScreen.dataset.nextViewer = state.実行者識別子;
}

el('handoffReady').addEventListener('click', async () => {
  viewer = handoffScreen.dataset.nextViewer || viewer;
  const state = await api('GET', `/api/game/state?as=${viewer}`);
  applyState(state);
});

// === 決着画面 ===

function renderResult(state) {
  const 結果 = state.勝敗結果;
  if (!結果) {
    el('resultEyebrow').textContent = '終了';
    el('resultHeadline').textContent = '試合終了';
    el('resultReason').textContent = '';
    return;
  }
  const 自分が勝者 = 結果.勝者 && 結果.勝者.識別子 === viewer;
  el('resultEyebrow').textContent = '決着';
  el('resultHeadline').textContent = state.モード === 'vsAI'
    ? (自分が勝者 ? 'あなたの勝ち' : 'AIの勝ち')
    : `${結果.勝者 ? 結果.勝者.名前 : '?'} の勝ち`;
  el('resultReason').textContent = 結果.理由 || '';
}

el('resultRestart').addEventListener('click', () => {
  viewer = 'p1';
  lastState = null;
  showOnly(modeScreen);
});

// === 盤面描画 ===

function pipsHTML(reserve) {
  const 通常 = reserve.通常;
  const parts = [];
  for (let i = 0; i < 通常; i++) {
    parts.push('<span class="pip"></span>');
  }
  if (reserve.ソウルコア) {
    parts.push('<span class="pip pip-soul" title="ソウルコア"></span>');
  }
  return parts.join('') || '<span class="pip" style="visibility:hidden"></span>';
}

function cardPipsHTML(count, hasSoul) {
  const 通常 = hasSoul ? count - 1 : count;
  const parts = [];
  for (let i = 0; i < 通常; i++) parts.push('<span class="pip"></span>');
  if (hasSoul) parts.push('<span class="pip pip-soul"></span>');
  return `<div class="card-pips">${parts.join('')}</div>`;
}

// デッキ構築の画面からも同じ絵柄を引けるようにする
window.CARD_ART_URL = cardNumber => (cardNumber && CARD_ART[cardNumber]) || null;

function artURL(cardNumber) {
  return cardNumber && CARD_ART[cardNumber] ? CARD_ART[cardNumber] : null;
}

function applyArt(div, cardNumber) {
  const art = artURL(cardNumber);
  if (!art) return;
  const artLayer = document.createElement('div');
  artLayer.className = 'card-art';
  artLayer.style.backgroundImage = `url('${art}')`;
  div.appendChild(artLayer);
}

// 選ぶボタンの先頭に、カードの形をした小さな絵を置く。
//
// 元は横長のボタン全面に絵柄を敷いていた。cover で切り取るので縦横の比は
// 保たれるが、縦長のカード絵から横長の帯だけを抜くことになり、
// 何のカードか分からないうえ絵の比率がおかしく見えていた。
// デッキ構築の一覧と同じく、カードの形のまま縮めて置く。
function 絵柄の縮小を付ける(親, cardNumber) {
  const art = artURL(cardNumber);
  const 縮小 = document.createElement('span');
  縮小.className = art ? 'target-thumb' : 'target-thumb target-thumb-none';
  if (art) 縮小.style.backgroundImage = `url('${art}')`;
  else 縮小.textContent = '？';
  親.appendChild(縮小);
}

function fieldCardEl(card, mode) {
  const div = document.createElement('div');
  div.className = `card state-${card.表示形式}`;
  if (mode) div.classList.add(mode);
  if (card.待機状態) div.classList.add(`waiting-${card.待機理由}`);
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー); // 背景として一番下に積む

  const lvTitle = card.次のLvに必要な総コア数
    ? `次のLv${card.Lv + 1}には合計${card.次のLvに必要な総コア数}コア必要`
    : '最大Lv';
  const lvBadge = document.createElement('span');
  lvBadge.className = 'card-lv';
  lvBadge.title = lvTitle;
  lvBadge.textContent = `Lv${card.Lv}`;
  div.appendChild(lvBadge);

  const nameRow = artURL(card.カードナンバー) ? '' : `<span class="card-name">${card.名前}</span>`;
  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = `
    ${nameRow}
    ${cardPipsHTML(card.コア数, card.ソウルコア)}
    <span class="card-bp">${card.BP.toLocaleString()}</span>
  `;
  div.appendChild(scrim);

  // 右クリックでカード詳細を拡大表示
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function handCardEl(card, playable) {
  const div = document.createElement('div');
  div.className = 'card hand-card';
  div.classList.add(playable ? 'playable' : 'unaffordable');
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー); // 背景として一番下に積む

  const hasArt = !!artURL(card.カードナンバー);
  const costClass = card.コスト < card.基本コスト ? 'card-cost reduced' : 'card-cost';
  const costBadge = document.createElement('span');
  costBadge.className = costClass;
  costBadge.textContent = card.コスト;
  div.appendChild(costBadge);

  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = `
    ${hasArt ? '' : `<span class="card-name">${card.名前}</span>`}
  `;
  div.appendChild(scrim);

  // 右クリックでカード詳細を拡大表示
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function renderZoneRow(prefix, playerState) {
  el(`${prefix}Name`).textContent = playerState.名前;
  el(`${prefix}Life`).textContent = `Life ${playerState.ライフ}`;
  el(`${prefix}Pips`).innerHTML = pipsHTML(playerState.リザーブ);
  el(`${prefix}Deck`).textContent = `デッキ ${playerState.デッキ枚数}`;
  // トラッシュはカードだけでなくコアも溜まる。
  // 「自分のトラッシュのコアを置く」効果の撃ちどきが分かるよう、コア数も出す。
  const トラッシュのコア = playerState.トラッシュのコア ?? { 通常: 0, ソウルコア: false };
  const コアの内訳 =
    トラッシュのコア.通常 + (トラッシュのコア.ソウルコア ? 1 : 0) > 0
      ? ` ／ コア${トラッシュのコア.通常}${トラッシュのコア.ソウルコア ? '+ソウル' : ''}`
      : '';
  el(`${prefix}Trash`).textContent = `トラッシュ ${playerState.トラッシュ.length}${コアの内訳}`;
}

function renderField(containerId, cards, classify) {
  const container = el(containerId);
  container.innerHTML = '';
  // かつてここで待機理由「消滅」のカードを画面から隠していた。
  // 中身では場に残っていたので、消えたように見えるのに軽減シンボルが
  // 満たされたまま、という食い違いが起きていた。
  // 消滅はルール処理でトラッシュへ行くようになったので、隠さずそのまま描く。
  // 隠すと、また同じ壊れ方をしたときに画面から気づけなくなる。
  if (cards.length === 0) {
    container.innerHTML = '<span class="field-empty">フィールドにカードがありません</span>';
    return;
  }
  for (const card of cards) {
    const mode = classify ? classify(card) : null;
    const cardEl = fieldCardEl(card, mode);
    if (mode === 'core-destination') {
      cardEl.addEventListener('click', () => 移し先を決める(card.識別子));
    } else if (mode === 'attackable') {
      cardEl.addEventListener('click', () => doAttack(card.識別子));
    } else if (mode === 'editable') {
      cardEl.addEventListener('click', () => openCoreMove(card));
    } else if (mode === 'effect-target' || mode === 'effect-selected') {
      const pending = lastState && lastState.保留中の効果;
      if (pending) {
        cardEl.addEventListener('click', () => toggleEffectTarget(card.識別子, pending));
      }
    }
    container.appendChild(cardEl);
  }
}

// 効果の対象選択で、今どのカードを選んでいるか
let effectSelection = [];

// 【起動】効果を撃つ
async function activateEffect(effectId) {
  const state = await api('POST', '/api/action/activate-effect', { as: viewer, effectId });
  applyState(state);
}

async function submitEffectSelection(cardIds) {
  effectSelection = [];
  const state = await api('POST', '/api/action/select-effect-target', {
    as: viewer,
    targetCardIds: cardIds,
  });
  applyState(state);
}

// 1体だけ選ぶ効果ならクリックで即決、複数選ぶ効果なら選択を貯めて確定ボタンで送る
function toggleEffectTarget(cardId, pending) {
  if (pending.最大 === 1 && pending.最小 === 1) {
    submitEffectSelection([cardId]);
    return;
  }
  const 既に選択中 = effectSelection.indexOf(cardId);
  if (既に選択中 >= 0) {
    effectSelection.splice(既に選択中, 1);
  } else if (effectSelection.length < pending.最大) {
    effectSelection.push(cardId);
  }
  renderBoard(lastState);
}

function renderBoard(state) {
  renderZoneRow('foe', state.相手);
  renderZoneRow('self', state.自分);

  // 人のパネルが開いているあいだ、盤面のパネルは引っ込む（重ねない）
  const 盤面のパネルを隠す = 人が開いているパネル !== null;

  // バトル中の割り込みの窓。効果を撃つか、何もしないかを選ぶ。
  const flash = state.保留中のフラッシュ;
  const flashPanel = el('flashPanel');
  if (flash) {
    flashPanel.hidden = 盤面のパネルを隠す;
    const 場面 = flash.段階 === 'ブロック後' ? 'ブロックが宣言されました' : 'アタックが宣言されました';
    const 相手 = flash.ブロッカー名
      ? `${flash.攻撃者名} が ${flash.ブロッカー名} にブロックされています`
      : `${flash.攻撃者名} がアタックしています`;
    el('flashHint').textContent = `${場面}。${相手}。効果を使うなら今です。`;
  } else {
    flashPanel.hidden = true;
  }

  // 今撃てる【起動】効果をボタンとして並べる。
  //
  // 窓が開いているあいだは、割り込みパネルの中へ入れる。
  // 別々のパネルを重ねて出していたため、起動効果のパネルが
  // 「何もしない」を覆い、撃たずに見送ることができなかった。
  const activatable = state.発動できる起動効果 || [];
  const activatePanel = el('activatePanel');
  const 効果ボタンを並べる = (host) => {
    host.innerHTML = '';
    for (const 効果 of activatable) {
      const btn = document.createElement('button');
      btn.className = 'effect-target-btn';
      const タイミング = 効果.タイミング ? `［${効果.タイミング}］` : '';
      btn.textContent = `${効果.カード名}${タイミング}`;
      btn.title = 効果.テキスト;
      btn.addEventListener('click', () => activateEffect(効果.効果識別子));
      host.appendChild(btn);
    }
  };

  if (flash) {
    効果ボタンを並べる(el('flashActivateList'));
    el('activateList').innerHTML = '';
    activatePanel.hidden = true;
  } else {
    el('flashActivateList').innerHTML = '';
    activatePanel.hidden = activatable.length === 0 || 盤面のパネルを隠す;
    効果ボタンを並べる(el('activateList'));
  }

  // 効果が対象選択で止まっていれば、その案内と候補を出す
  const pending = state.保留中の効果;
  const effectPanel = el('effectPanel');
  if (pending && pending.選択肢) {
    // カードを選ぶのではない判断（「置くコアは相手が選ぶ」など）。
    // 相手の効果に答える場面なので、誰の効果なのかも見せる。
    effectPanel.hidden = 盤面のパネルを隠す;
    el('effectTitle').textContent = `${pending.トリガー元カード名} の効果`;
    el('effectHint').textContent = pending.問い || 'どちらかを選んでください';

    const 選択肢一覧 = el('effectTargetList');
    選択肢一覧.innerHTML = '';
    for (const 選択肢 of pending.選択肢) {
      const btn = document.createElement('button');
      btn.className = 'effect-target-btn';
      btn.textContent = 選択肢.表示;
      btn.addEventListener('click', () => submitEffectSelection([選択肢.識別子]));
      選択肢一覧.appendChild(btn);
    }

    // 選択肢はボタンを押した時点で決まるので、決定・見送りは出さない
    el('effectConfirm').hidden = true;
    el('effectSkip').hidden = true;
  } else if (pending) {
    effectPanel.hidden = 盤面のパネルを隠す;

    const 何体 = pending.最小 === pending.最大
      ? `${pending.最大}体`
      : `${pending.最小}〜${pending.最大}体`;
    el('effectTitle').textContent = `${pending.トリガー元カード名} の効果`;
    // 「好きな順で」の並べ替えは、選ぶ／選ばないではなく順番を決める場面。
    // 押した順がそのまま並び順になるので、その旨と何番目かを見せる。
    el('effectHint').textContent = pending.順番を決める
      ? pending.問い || '置く順番に押してください（先に押したものが上）'
      : pending.任意
        ? `対象を${何体}まで選べます（選ばなくてもかまいません）`
        : `対象を${何体}選んでください`;

    const 対象一覧 = el('effectTargetList');
    対象一覧.innerHTML = '';
    for (const 対象 of pending.対象候補一覧) {
      const btn = document.createElement('button');
      const 順番 = effectSelection.indexOf(対象.識別子);
      btn.className = 順番 >= 0 ? 'effect-target-btn has-thumb selected' : 'effect-target-btn has-thumb';
      // デッキの上をめくって選ぶ効果は、名前だけだと何を拾うのか分かりにくい。
      // カードの形のまま縮めた絵を先頭に置く。
      絵柄の縮小を付ける(btn, 対象.カードナンバー);
      const 番号 = pending.順番を決める && 順番 >= 0 ? `${順番 + 1}. ` : '';
      const ラベル = document.createElement('span');
      ラベル.className = 'effect-target-label';
      ラベル.textContent = `${番号}${対象.名前}（BP ${対象.BP.toLocaleString()}）`;
      btn.appendChild(ラベル);
      btn.addEventListener('click', () => toggleEffectTarget(対象.識別子, pending));
      対象一覧.appendChild(btn);
    }

    // 複数選ぶ効果には確定ボタン、任意の効果には見送りボタンを出す
    const 複数選択 = pending.最大 > 1 || pending.最小 !== pending.最大;
    const 確定ボタン = el('effectConfirm');
    確定ボタン.hidden = !複数選択;
    確定ボタン.disabled = effectSelection.length < pending.最小;
    確定ボタン.textContent = `決定（${effectSelection.length}/${pending.最大}）`;

    el('effectSkip').hidden = pending.最小 > 0;
  } else {
    effectPanel.hidden = true;
    effectSelection = [];
  }

  renderField('foeField', state.相手.フィールド, card => {
    if (pending && pending.対象候補一覧.some(c => c.識別子 === card.識別子)) {
      return effectSelection.includes(card.識別子) ? 'effect-selected' : 'effect-target';
    }
    return null;
  });

  const 自分のターンで随意ステップ =
    state.ターンプレイヤー識別子 === viewer && !state.保留中のブロック && !state.保留中の効果;
  const アタックステップ中 = 自分のターンで随意ステップ && state.ステップ === 'アタックステップ';
  const メインステップ中 =
    自分のターンで随意ステップ && (state.ステップ === 'メインステップ' || state.ステップ === '第2メインステップ');

  renderField('selfField', state.自分.フィールド, card => {
    // コアの移し先を選んでいる最中は、移し先だけを押せるようにする。
    // 入れ替えの相手は「通常コアを持っているカード」だけ（無い相手は出す物が無い）。
    if (コアの移し先を選んでいる && activeCoreCard) {
      if (card.識別子 === activeCoreCard.識別子) return null;
      if (コアの移し先を選んでいる === 'swap' && card.コア数 - (card.ソウルコア ? 1 : 0) < 1) {
        return null;
      }
      return 'core-destination';
    }
    if (pending && pending.対象候補一覧.some(c => c.識別子 === card.識別子)) {
      return effectSelection.includes(card.識別子) ? 'effect-selected' : 'effect-target';
    }
    if (アタックステップ中 && card.種別 === 'スピリット' && card.表示形式 === '回復') return 'attackable';
    if (メインステップ中) return 'editable';
    return null;
  });

  // 相手の手札を表示（公開形式）
  const foeHand = el('foeHand');
  foeHand.innerHTML = '';
  for (const card of state.相手.手札 || []) {
    const cardEl = handCardEl(card, false);
    foeHand.appendChild(cardEl);
  }

  // 割り込みの窓が自分に回っているあいだは、［フラッシュ］のマジックを押せる。
  // ここを見ずにメインステップ中だけ押せるようにしていたため、
  // ブレイククロー／オフェリングドロー／フレイムハリケーンの
  // ［フラッシュ］が一度も使えなかった。
  const 割り込みで使える = !!state.保留中のフラッシュ && !state.保留中の効果;

  const selfHand = el('selfHand');
  selfHand.innerHTML = '';
  for (const card of state.自分.手札 || []) {
    // 《ソウルマジック》はコストを丸ごと飛ばしてソウルコア1個で済ませるので、
    // コアが足りているかとは別に押せなければならない。
    // ここを見ていなかったため、リザーブが空のときフレイムハリケーンが
    // 押せず、支払い画面まで辿り着けなかった（＝一度も撃てなかった）。
    // ［フラッシュ］しか持たないマジック（フレイムハリケーン）はメインステップでは撃てない。
    // 押せてしまうと、支払いまで進んだのに何も起きない行き止まりになる。
    const playable =
      (card.支払可能 || card.場のコアも使えば支払えるか || card.ソウルマジックで使えるか) &&
      ((メインステップ中 && card.メインで使えるか !== false) ||
        (割り込みで使える && card.フラッシュで使えるか));
    const cardEl = handCardEl(card, playable);
    if (playable) {
      cardEl.addEventListener('click', () => doPlayCard(card));
    } else {
      // 押せない札も押せるようにして、なぜ出せないのかを答える。
      // 何も起きないと、コアが足りないのか、タイミングが違うのか、
      // 《ソウルマジック》の条件が欠けているのかを見分けられない。
      cardEl.addEventListener('click', () => showToast(出せない訳(card)));
    }
    selfHand.appendChild(cardEl);
  }

  // ターンバナー
  const banner = el('turnBanner');
  const 自分のターンか = state.ターンプレイヤー識別子 === viewer;
  banner.className = 'turn-banner ' + (自分のターンか ? 'acting-self' : 'acting-foe');
  const 表示相手名 = 自分のターンか ? 'あなた' : state.相手.名前;
  el('turnLabel').textContent = `${表示相手名}のターン ・ ${state.ステップ || ''}`;

  const endBtn = el('endStepBtn');
  endBtn.hidden = !(自分のターンで随意ステップ && ['メインステップ', 'アタックステップ', '第2メインステップ'].includes(state.ステップ));

  // ブロック判断
  const blockPanel = el('blockPanel');
  if (state.保留中のブロック) {
    blockPanel.hidden = 盤面のパネルを隠す;
    const attackerHost = el('blockAttacker');
    attackerHost.innerHTML = '';
    attackerHost.appendChild(fieldCardEl(state.保留中のブロック.攻撃者, null));

    const candidates = state.自分.フィールド.filter(
      c => c.種別 === 'スピリット' && c.表示形式 === '回復'
    );
    renderField('blockCandidates', candidates, () => 'blockable');
    const candidateContainer = el('blockCandidates');
    for (const cardEl of candidateContainer.children) {
      const id = cardEl.dataset.cardId;
      if (!id) continue;
      cardEl.addEventListener('click', () => doBlock(id));
    }
  } else {
    blockPanel.hidden = true;
  }


  // 直近に効果が何をしたかを短く出す。
  // 何も起きなかったときの理由もここに出るので、
  // 「効果が働かない」と「条件を満たさなかった」を利用者が見分けられる。
  効果ログを出す(state.効果ログ);
}

// 効果のログのうち、まだ見せていないぶんだけをトーストで出す
let 見せたログ数 = 0;
function 効果ログを出す(ログ) {
  if (!Array.isArray(ログ)) return;
  if (ログ.length < 見せたログ数) 見せたログ数 = 0; // 新しい試合で巻き戻った
  const 新しい行 = ログ.slice(見せたログ数);
  見せたログ数 = ログ.length;
  if (新しい行.length > 0) {
    showToast(新しい行.join(" / "));
  }
}

// === アクション ===

// 手札のカードは種別ごとに出し方が違う。
// スピリットは召喚、ネクサスは配置、マジックは使用。
const カードの送り先 = card =>
  card.種別 === 'ネクサス' ? '/api/action/place'
  : card.種別 === 'マジック' ? '/api/action/use'
  : '/api/action/summon';

// 押せない札を押されたときに返す一言。
// タイミングの理由は画面側でしか分からないので、ここで足す。
function 出せない訳(card) {
  const s = lastState;
  const メイン中 =
    s && s.ターンプレイヤー識別子 === viewer && ['メインステップ', '第2メインステップ'].includes(s.ステップ);
  const 割り込み中 = !!(s && s.保留中のフラッシュ) && !(s && s.保留中の効果);

  if (メイン中 && card.メインで使えるか === false) {
    return `${card.名前} は［フラッシュ］専用です。アタックやブロックの割り込みのときに使えます`;
  }
  if (!メイン中 && !(割り込み中 && card.フラッシュで使えるか)) {
    return card.フラッシュで使えるか
      ? `${card.名前} は今は使えません（メインステップか、割り込みの窓が開いているとき）`
      : `${card.名前} は今は出せません（自分のメインステップで出せます）`;
  }
  return card.出せない理由 ? `${card.名前}：${card.出せない理由}` : `${card.名前} は今は出せません`;
}

// 支払い方を毎回自分で決めるか。押すたびに切り替わり、次に開いたときも残る。
//
// これが無かったころは window.設定.毎回支払いを選ぶ を見ていたが、
// その 設定 を誰も作っていなかった（＝いつも自動）。そのため
// リザーブだけで払えるカードは通常コアで黙って払われ、ソウルコアを
// 狙ってトラッシュへ送ることができなかった。ソウルコアがトラッシュに無いと
// 「トラッシュのソウルコアを置く」効果を試す手立てが無い。
const 支払いを毎回選ぶ鍵 = 'bs-支払いを毎回選ぶ';
let 支払いを毎回選ぶ = localStorage.getItem(支払いを毎回選ぶ鍵) === '1';

function 支払いの選び方を描く() {
  const btn = el('payChoiceBtn');
  btn.textContent = 支払いを毎回選ぶ ? '支払い：自分で選ぶ' : '支払い：自動';
  btn.setAttribute('aria-pressed', 支払いを毎回選ぶ ? 'true' : 'false');
  btn.title = 支払いを毎回選ぶ
    ? 'カードを出すたび、どこのコアで払うかを選びます（ソウルコアも指定できます）'
    : 'リザーブから自動で払います。押すと毎回自分で選べます';
}

el('payChoiceBtn').addEventListener('click', () => {
  支払いを毎回選ぶ = !支払いを毎回選ぶ;
  localStorage.setItem(支払いを毎回選ぶ鍵, 支払いを毎回選ぶ ? '1' : '0');
  支払いの選び方を描く();
  showToast(支払いを毎回選ぶ ? '支払い方を毎回選びます' : '支払いは自動に戻しました');
});

支払いの選び方を描く();

// 支払い方を人が決める必要がある場面か。
// ここに当てはまらなければ、これまで通り黙ってリザーブから払う。
function 支払いを尋ねるべきか(card) {
  if (支払いを毎回選ぶ) return true;
  if (!card.支払可能) return true;                 // リザーブだけでは足りない
  if (card.継召で軽減できる枚数 > 0) return true;    // 《継召》が使える
  if (card.ソウルマジックで使えるか) return true;    // 《ソウルマジック》が使える
  return false;
}

async function doPlayCard(card) {
  if (支払いを尋ねるべきか(card)) {
    openPayPanel(card);
    return;
  }
  const state = await api('POST', カードの送り先(card), { as: viewer, cardId: card.識別子 });
  applyState(state);
}

async function doAttack(cardId) {
  const state = await api('POST', '/api/action/attack', { as: viewer, cardId });
  applyState(state);
}

async function doBlock(cardId) {
  const state = await api('POST', '/api/action/block', { as: viewer, cardId });
  applyState(state);
}

el('blockSkip').addEventListener('click', async () => {
  const state = await api('POST', '/api/action/block', { as: viewer, cardId: null });
  applyState(state);
});

el('endStepBtn').addEventListener('click', async () => {
  const state = await api('POST', '/api/action/end-step', { as: viewer });
  applyState(state);
});

// === 支払い画面 ===
//
// 「どこから何個出すか」を人が決める。開くのは決められないと困る場面だけ。
// これが無かったので、支払い元はいつもリザーブ固定で、
// カードの上のコアも、ソウルコアの指定も、《継召》も《ソウルマジック》も使えなかった。

let 支払い中のカード = null;
let 支払いの内訳 = { コスト: [], 初期コア: [], 継召除外: [], ソウルマジック: false };

// 出せる場所の一覧（リザーブと、自分の場のカード）
function 支払い元の候補() {
  const 候補 = [
    {
      鍵: 'リザーブ',
      名前: 'リザーブ',
      通常: lastState.自分.リザーブ.通常,
      ソウル: lastState.自分.リザーブ.ソウルコア ? 1 : 0,
    },
  ];
  for (const c of lastState.自分.フィールド) {
    const ソウル = c.ソウルコア ? 1 : 0;
    候補.push({
      鍵: `カード:${c.識別子}`,
      カードID: c.識別子,
      名前: c.名前,
      通常: c.コア数 - ソウル,
      ソウル,
    });
  }
  return 候補;
}

const 内訳の合計 = 一覧 => 一覧.reduce((合計, x) => 合計 + x.通常 + x.ソウル, 0);

// ソウルコアは1人に1個しかない。どこにあるかを1か所で求める。
//
// 《ソウルマジック》で「どのソウルコアで払うか」を人に選ばせても、
// 選択肢は常に1つしかないので意味がない。しかも、リザーブにあるときだけ
// 自動で選ぶようにしていたため、スピリットの上に乗っているときは
// 何も選ばれず「これで出す」が押せないままになっていた
// （リザーブの行はボタンが1つも無い空の行として出るので、何を押せばよいかも分からない）。
function ソウルコアの居場所() {
  return 支払い元の候補().find(候補 => 候補.ソウル > 0) ?? null;
}

function openPayPanel(card) {
  支払い中のカード = card;
  支払いの内訳 = { コスト: [], 初期コア: [], 継召除外: [], ソウルマジック: false };

  el('payTitle').textContent = `${card.名前} を出す`;

  // 《ソウルマジック》
  el('paySoulMagic').hidden = !card.ソウルマジックで使えるか;
  el('paySoulMagicCheck').checked = false;

  // 《継召》。トラッシュのEXシンボル持ちを、軽減できる枚数まで選べる。
  const 継召候補 = lastState.自分.トラッシュ.filter(c => c.EXシンボル);
  el('payKeishou').hidden = !(card.継召で軽減できる枚数 > 0 && 継召候補.length > 0);

  // 初期コアが要るのはスピリットとネクサスだけ（マジックは場に出ない）
  el('payInitial').hidden = card.種別 === 'マジック';

  renderPayPanel();
  パネルを開く('payPanel');
}

function renderPayPanel() {
  const card = 支払い中のカード;
  if (!card) return;

  const ソウルマジック = el('paySoulMagicCheck').checked;
  支払いの内訳.ソウルマジック = ソウルマジック;

  const 軽減枚数 = 支払いの内訳.継召除外.length;
  // 《ソウルマジック》はソウルコアちょうど1個。それ以外は軽減後のコストちょうど。
  const 必要コスト = ソウルマジック ? 1 : Math.max(0, card.コスト - 軽減枚数);
  const 必要初期コア = card.種別 === 'マジック' ? 0 : card.最低必要数;

  const ソウルコアの場所 = ソウルマジック ? ソウルコアの居場所() : null;
  el('payHint').textContent = ソウルマジック
    ? ソウルコアの場所
      ? `《ソウルマジック》で払います。${ソウルコアの場所.名前} のソウルコア1個だけで使えます。`
      : '《ソウルマジック》で払えるソウルコアが、リザーブにも場のカードの上にもありません。'
    : `コストは${必要コスト}個ちょうど。カードには${必要初期コア}個以上置きます。`;

  // 《継召》の候補
  const 継召候補 = lastState.自分.トラッシュ.filter(c => c.EXシンボル);
  const 継召一覧 = el('payKeishouList');
  継召一覧.innerHTML = '';
  for (const t of 継召候補) {
    const 選択済み = 支払いの内訳.継召除外.includes(t.識別子);
    const btn = document.createElement('button');
    btn.className = 選択済み ? 'effect-target-btn has-thumb selected' : 'effect-target-btn has-thumb';
    絵柄の縮小を付ける(btn, t.カードナンバー);
    const ラベル = document.createElement('span');
    ラベル.className = 'effect-target-label';
    ラベル.textContent = t.名前;
    btn.appendChild(ラベル);
    btn.disabled =
      !選択済み && 支払いの内訳.継召除外.length >= card.継召で軽減できる枚数;
    btn.addEventListener('click', () => {
      const i = 支払いの内訳.継召除外.indexOf(t.識別子);
      if (i >= 0) 支払いの内訳.継召除外.splice(i, 1);
      else 支払いの内訳.継召除外.push(t.識別子);
      // 軽減が変われば必要コストも変わるので、指定を白紙に戻す
      支払いの内訳.コスト = [];
      renderPayPanel();
    });
    継召一覧.appendChild(btn);
  }

  el('payCostTitle').textContent = `コストに使うコア（${内訳の合計(支払いの内訳.コスト)}/${必要コスト}）`;
  el('payInitialTitle').textContent =
    `カードに置くコア（${内訳の合計(支払いの内訳.初期コア)}/${必要初期コア}以上）`;
  // 《ソウルマジック》のときも支払い元は隠さない。
  // ソウルコアはリザーブとは限らず、スピリットの上に乗っていることも多い。
  // 隠していたころは、どこのソウルコアで払うかを伝える手立てが無く、
  // APIがリザーブ決め打ちで払おうとして失敗していた。
  el('payCost').hidden = false;

  描く支払い元('payCostList', 'コスト', 必要コスト, ソウルマジック);
  描く支払い元('payInitialList', '初期コア', null, false);

  const 合計コスト = 内訳の合計(支払いの内訳.コスト);
  el('payConfirm').disabled =
    合計コスト !== 必要コスト || 内訳の合計(支払いの内訳.初期コア) < 必要初期コア;
}

// 支払い元ごとに「通常コア」「ソウルコア」の増減ボタンを並べる。
// 同じコアを2箇所に割り当てないよう、残り在庫はコストと初期コアを合わせて数える。
// ソウルコアだけを選ばせたいとき（《ソウルマジック》）は ソウルコアだけ を立てる。
// そのときは、ソウルコアを持っている場所だけを出す。
// 持っていない場所まで並べると、ボタンが1つも無い空の行が出て、
// 何を押せばよいのか分からなくなる。
function 描く支払い元(host識別子, 欄, 上限, ソウルコアだけ = false) {
  const host = el(host識別子);
  host.innerHTML = '';

  const 一覧 = ソウルコアだけ
    ? 支払い元の候補().filter(候補 => 候補.ソウル > 0)
    : 支払い元の候補();
  for (const 候補 of 一覧) {
    const 取る = 名 =>
      支払いの内訳[名].find(x => x.鍵 === 候補.鍵) ?? { 鍵: 候補.鍵, 通常: 0, ソウル: 0 };
    const この欄 = 取る(欄);
    const 別の欄 = 取る(欄 === 'コスト' ? '初期コア' : 'コスト');
    const 残り通常 = 候補.通常 - この欄.通常 - 別の欄.通常;
    const 残りソウル = 候補.ソウル - この欄.ソウル - 別の欄.ソウル;

    const 行 = document.createElement('div');
    行.className = 'pay-source';
    行.innerHTML = `<span class="pay-source-name">${候補.名前}</span>`;

    if (!ソウルコアだけ) {
      行.appendChild(
        増減ボタン('通常', この欄.通常, 残り通常 > 0 && (上限 === null || 内訳の合計(支払いの内訳[欄]) < 上限), 差分 => {
          変更する(欄, 候補, '通常', 差分);
        })
      );
    }
    if (候補.ソウル > 0) {
      行.appendChild(
        増減ボタン('ソウル', この欄.ソウル, 残りソウル > 0 && この欄.ソウル < 1 && (上限 === null || 内訳の合計(支払いの内訳[欄]) < 上限), 差分 => {
          変更する(欄, 候補, 'ソウル', 差分);
        })
      );
    }
    host.appendChild(行);
  }
}

function 増減ボタン(見出し, 現在, 増やせるか, 変える) {
  const 枠 = document.createElement('span');
  枠.className = 'pay-stepper';
  const 減 = document.createElement('button');
  減.type = 'button';
  減.className = 'stepper-btn';
  減.textContent = '−';
  減.disabled = 現在 <= 0;
  減.addEventListener('click', () => 変える(-1));
  const 値 = document.createElement('span');
  値.className = 'stepper-value';
  値.textContent = `${見出し} ${現在}`;
  const 増 = document.createElement('button');
  増.type = 'button';
  増.className = 'stepper-btn';
  増.textContent = '＋';
  増.disabled = !増やせるか;
  増.addEventListener('click', () => 変える(1));
  枠.append(減, 値, 増);
  return 枠;
}

function 変更する(欄, 候補, 種類, 差分) {
  let 項目 = 支払いの内訳[欄].find(x => x.鍵 === 候補.鍵);
  if (!項目) {
    項目 = { 鍵: 候補.鍵, カードID: 候補.カードID, 通常: 0, ソウル: 0 };
    支払いの内訳[欄].push(項目);
  }
  項目[種類] = Math.max(0, 項目[種類] + 差分);
  支払いの内訳[欄] = 支払いの内訳[欄].filter(x => x.通常 + x.ソウル > 0);
  renderPayPanel();
}

// 画面の内訳を、APIが受け取る形に直す
const 内訳をAPIの形に = 一覧 =>
  一覧.map(x => ({
    場所: x.鍵 === 'リザーブ' ? 'リザーブ' : 'カード',
    カードID: x.カードID,
    通常: x.通常,
    ソウル: x.ソウル,
  }));

el('paySoulMagicCheck').addEventListener('change', () => {
  支払いの内訳.コスト = [];
  // ソウルコアは1個しかないので、どこにあっても自動で選ぶ（選ばせる意味がない）
  if (el('paySoulMagicCheck').checked) {
    const 居場所 = ソウルコアの居場所();
    if (居場所) {
      支払いの内訳.コスト = [{ 鍵: 居場所.鍵, カードID: 居場所.カードID, 通常: 0, ソウル: 1 }];
    }
  }
  renderPayPanel();
});

el('payCancel').addEventListener('click', () => {
  支払い中のカード = null;
  パネルを閉じる('payPanel');
});

el('payConfirm').addEventListener('click', async () => {
  const card = 支払い中のカード;
  if (!card) return;
  // 空の一覧は送らない。「0個をここから払う」と「どこから払うか決めていない」は別物で、
  // 前者のつもりで空配列を送っていたため、APIが支払い元0件で組み立ててしまい、
  // 《ソウルマジック》がソウルコアを1個も出せずに失敗していた。
  const 支払い = {};
  if (支払いの内訳.コスト.length > 0) 支払い.コスト = 内訳をAPIの形に(支払いの内訳.コスト);
  if (支払いの内訳.ソウルマジック) {
    支払い.ソウルマジック = true;
  } else {
    if (支払いの内訳.継召除外.length > 0) 支払い.継召除外 = 支払いの内訳.継召除外;
    if (card.種別 !== 'マジック' && 支払いの内訳.初期コア.length > 0) {
      支払い.初期コア = 内訳をAPIの形に(支払いの内訳.初期コア);
    }
  }
  支払い中のカード = null;
  パネルを閉じる('payPanel');
  const state = await api('POST', カードの送り先(card), {
    as: viewer,
    cardId: card.識別子,
    支払い,
  });
  applyState(state);
});

// === コア移動 ===

function openCoreMove(card) {
  activeCoreCard = card;
  coreMoveAmount = 1;
  el('coreMoveTitle').textContent = `${card.名前} のコアを移動`;
  el('coreMoveHint').textContent = card.次のLvに必要な総コア数
    ? `現在${card.コア数}コア／Lv${card.Lv + 1}には合計${card.次のLvに必要な総コア数}コア必要`
    : `現在${card.コア数}コア（最大Lvです）`;
  el('coreMoveAmount').textContent = coreMoveAmount;
  // ソウルコアを持っていれば、戻すボタンを表示
  el('coreMoveSoulBtn').hidden = !card.ソウルコア;
  // リザーブにソウルコアがあれば、乗せるボタンを表示
  el('coreMoveFromReserveSoulBtn').hidden = !lastState || !lastState.自分.リザーブ.ソウルコア;
  // ソウルコアを持っていれば、別のカードへ直に渡せる
  el('coreMoveSoulToOtherCard').hidden = !card.ソウルコア;
  // 入れ替えは、このカードがソウルコアを持っているときだけ差し出せる。
  // 相手側（通常コアを出すほう）は、押して選んだカードかリザーブ。
  const 他に通常コアがある =
    !!lastState &&
    lastState.自分.フィールド.some(c => c.識別子 !== card.識別子 && c.コア数 - (c.ソウルコア ? 1 : 0) > 0);
  el('coreSwapWithOtherCard').hidden = !card.ソウルコア || !他に通常コアがある;
  el('coreSwapWithReserve').hidden = !card.ソウルコア || !lastState || lastState.自分.リザーブ.通常 < 1;
  el('coreMoveToCardHint').hidden = true;
  コアの移し先を選んでいる = null;
  パネルを開く('coreMovePanel');
}

el('coreMoveMinus').addEventListener('click', () => {
  coreMoveAmount = Math.max(1, coreMoveAmount - 1);
  el('coreMoveAmount').textContent = coreMoveAmount;
});
el('coreMovePlus').addEventListener('click', () => {
  coreMoveAmount = Math.min(20, coreMoveAmount + 1);
  el('coreMoveAmount').textContent = coreMoveAmount;
});
el('coreMoveClose').addEventListener('click', () => {
  activeCoreCard = null;
  コアの移し先を選んでいる = null;
  パネルを閉じる('coreMovePanel');
});

async function moveCore(方向, ソウルコア = false) {
  if (!activeCoreCard) return;
  const エンドポイント = ソウルコア ? '/api/action/move-soul-core' : '/api/action/move-core';
  const state = await api('POST', エンドポイント, {
    as: viewer,
    cardId: activeCoreCard.識別子,
    方向,
    数: ソウルコア ? 1 : coreMoveAmount,
  });
  activeCoreCard = null;
  パネルを閉じる('coreMovePanel');
  applyState(state);
}

async function placeSoulCoreToCard() {
  if (!activeCoreCard) return;
  const state = await api('POST', '/api/action/place-soul-core', {
    as: viewer,
    cardId: activeCoreCard.識別子,
  });
  activeCoreCard = null;
  パネルを閉じる('coreMovePanel');
  applyState(state);
}

el('coreMoveToCard').addEventListener('click', () => moveCore('toCard'));
el('coreMoveToReserve').addEventListener('click', () => moveCore('toReserve'));
el('coreMoveSoulBtn').addEventListener('click', () => moveCore('toReserve', true));
el('coreMoveFromReserveSoulBtn').addEventListener('click', placeSoulCoreToCard);

// カードからカードへ直に移す。
// これが無いと、いったんリザーブへ戻してから乗せ直すことになり、
// 「別々のスピリットの上のコアを入れ替える」ができなかった。
let コアの移し先を選んでいる = null; // 'normal' | 'soul' | 'swap' | null

const 移し先の案内 = {
  soul: 'ソウルコアを移す先のカードを押してください',
  swap: 'ソウルコアと通常コアを入れ替える相手のカードを押してください',
};

function 移し先を選び始める(種類) {
  if (!activeCoreCard) return;
  コアの移し先を選んでいる = 種類;
  el('coreMoveToCardHint').hidden = false;
  el('coreMoveToCardHint').textContent =
    移し先の案内[種類] ?? `コア${coreMoveAmount}個を移す先のカードを押してください`;
  renderBoard(lastState);
}

async function 移し先を決める(移動先カードID) {
  const 元 = activeCoreCard;
  const 種類 = コアの移し先を選んでいる;
  if (!元 || !種類) return;
  コアの移し先を選んでいる = null;
  el('coreMoveToCardHint').hidden = true;
  activeCoreCard = null;
  パネルを閉じる('coreMovePanel');

  // 入れ替えだけは別の入口。2手に分けると途中で消滅するので1回で済ませる。
  if (種類 === 'swap') {
    const state = await api('POST', '/api/action/swap-core', {
      as: viewer,
      ソウル側カードID: 元.識別子,
      通常側カードID: 移動先カードID,
    });
    applyState(state);
    return;
  }

  const エンドポイント = 種類 === 'soul' ? '/api/action/move-soul-core' : '/api/action/move-core';
  const state = await api('POST', エンドポイント, {
    as: viewer,
    cardId: 元.識別子,
    移動先カードID,
    方向: 'toCard',
    数: 種類 === 'soul' ? 1 : coreMoveAmount,
  });
  applyState(state);
}

el('coreMoveToOtherCard').addEventListener('click', () => 移し先を選び始める('normal'));
el('coreMoveSoulToOtherCard').addEventListener('click', () => 移し先を選び始める('soul'));
el('coreSwapWithOtherCard').addEventListener('click', () => 移し先を選び始める('swap'));

// リザーブの通常コアとの入れ替えは相手を選ぶ必要がないので、その場で送る
el('coreSwapWithReserve').addEventListener('click', async () => {
  if (!activeCoreCard) return;
  const 元 = activeCoreCard;
  activeCoreCard = null;
  コアの移し先を選んでいる = null;
  パネルを閉じる('coreMovePanel');
  const state = await api('POST', '/api/action/swap-core', {
    as: viewer,
    ソウル側カードID: 元.識別子,
  });
  applyState(state);
});

// リタイア（投了）。押し間違いで試合が終わらないよう1回確認する。
el('retireBtn').addEventListener('click', async () => {
  if (!confirm('リタイアしますか？　この試合は終了します。')) return;
  const state = await api('POST', '/api/action/retire', { as: viewer });
  applyState(state);
});

// === カード効果情報 ===

function showCardEffect(card) {
  el('cardEffectName').textContent = card.名前;
  el('cardEffectText').textContent = card.テキスト || '効果なし';
  パネルを開く('cardEffectPanel');
}

el('effectConfirm').addEventListener('click', () => {
  const pending = lastState && lastState.保留中の効果;
  if (pending && effectSelection.length >= pending.最小) {
    submitEffectSelection([...effectSelection]);
  }
});

el('effectSkip').addEventListener('click', () => submitEffectSelection([]));

el('flashPass').addEventListener('click', async () => {
  const state = await api('POST', '/api/action/flash-pass', { as: viewer });
  applyState(state);
});

// メインステップの【起動】効果を見送る。
// 撃たない選択肢が画面に無いと、パネルが出たまま他の操作の邪魔になる。
el('activateSkip').addEventListener('click', () => {
  el('activatePanel').hidden = true;
});

el('cardEffectClose').addEventListener('click', () => {
  パネルを閉じる('cardEffectPanel');
});

el('cardDetailClose').addEventListener('click', () => {
  パネルを閉じる('cardDetailPanel');
});

// === トラッシュ一覧 ===

function showCardDetail(card) {
  const container = el('cardDetailContent');
  container.innerHTML = '';

  const cardEl = document.createElement('div');
  cardEl.className = 'card card-detail';
  cardEl.dataset.cardId = card.識別子;

  // 背景として絵柄を積む
  const art = artURL(card.カードナンバー);
  if (art) {
    const artLayer = document.createElement('div');
    artLayer.className = 'card-art';
    artLayer.style.backgroundImage = `url('${art}')`;
    cardEl.appendChild(artLayer);
  }

  // 拡大表示では文字を非表示（画像のみ表示）
  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = '';
  cardEl.appendChild(scrim);

  container.appendChild(cardEl);
  パネルを開く('cardDetailPanel');
}

function trashCardEl(card) {
  const div = document.createElement('div');
  div.className = 'card trash-card';
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー); // 背景として一番下に積む

  const hasArt = !!artURL(card.カードナンバー);
  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = `
    ${hasArt ? '' : `<span class="card-name">${card.名前}</span>`}
  `;
  div.appendChild(scrim);

  // 右クリックでカード詳細を拡大表示
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function openTrash(list, title) {
  el('trashTitle').textContent = title;
  const container = el('trashList');
  container.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'trash-empty';
    empty.textContent = 'トラッシュは空です';
    container.appendChild(empty);
  } else {
    for (const card of list) {
      const cardEl = trashCardEl(card);
      container.appendChild(cardEl);
    }
  }
  パネルを開く('trashPanel');
}

el('selfTrash').addEventListener('click', () => {
  if (lastState) openTrash(lastState.自分.トラッシュ, `${lastState.自分.名前} のトラッシュ`);
});
el('foeTrash').addEventListener('click', () => {
  if (lastState) openTrash(lastState.相手.トラッシュ, `${lastState.相手.名前} のトラッシュ`);
});
el('trashClose').addEventListener('click', () => {
  パネルを閉じる('trashPanel');
});

// 最初に出すのはデッキ選択。
// ここを modeScreen にしていたため、デッキを選ぶ画面（＝「デッキを組む」の入口がある場所）へ
// 「← デッキを変更」を押さないと辿り着けず、組む手段が隠れていた。
// index.html でも deckScreen だけが hidden でない＝こちらが本来の入口。
showOnly(deckScreen);
