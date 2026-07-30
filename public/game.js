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
  '26RSD01-005': 'cards/26RSD01-005.png',
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

function applyState(state) {
  if (!state) return;
  lastState = state;

  if (state.試合終了か) {
    renderResult(state);
    showOnly(resultScreen);
    // パネルを非表示にする
    el('blockPanel').hidden = true;
    el('coreMovePanel').hidden = true;
    el('trashPanel').hidden = true;
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

for (const btn of document.querySelectorAll('.deck-btn')) {
  btn.addEventListener('click', () => {
    selectedDeck = btn.dataset.deck;
    const deckNames = {
      'gungata': 'グン＝ガタ',
      'genbo': 'ゲン＝ボー',
      'mushaako': 'ムーシャッコ',
    };
    const deckName = deckNames[btn.dataset.deck] || 'デッキ';
    el('modeEyebrow').textContent = `${deckName}で対戦`;
    showOnly(modeScreen);
  });
}

el('deckBack').addEventListener('click', () => {
  showOnly(deckScreen);
});

// === モード選択 ===

for (const btn of document.querySelectorAll('.mode-btn[data-mode]')) {
  btn.addEventListener('click', async () => {
    viewer = 'p1';
    const state = await api('POST', '/api/game/start', { mode: btn.dataset.mode, deck: selectedDeck });
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
  el(`${prefix}Trash`).textContent = `トラッシュ ${playerState.トラッシュ.length}`;
}

function renderField(containerId, cards, classify) {
  const container = el(containerId);
  container.innerHTML = '';
  const visibleCards = cards.filter(card => !card.待機状態 || card.待機理由 !== '消滅');
  if (visibleCards.length === 0) {
    container.innerHTML = '<span class="field-empty">フィールドにカードがありません</span>';
    return;
  }
  for (const card of visibleCards) {
    const mode = classify ? classify(card) : null;
    const cardEl = fieldCardEl(card, mode);
    if (mode === 'attackable') {
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

  // バトル中の割り込みの窓。効果を撃つか、何もしないかを選ぶ。
  const flash = state.保留中のフラッシュ;
  const flashPanel = el('flashPanel');
  if (flash) {
    flashPanel.hidden = false;
    const 場面 = flash.段階 === 'ブロック後' ? 'ブロックが宣言されました' : 'アタックが宣言されました';
    const 相手 = flash.ブロッカー名
      ? `${flash.攻撃者名} が ${flash.ブロッカー名} にブロックされています`
      : `${flash.攻撃者名} がアタックしています`;
    el('flashHint').textContent = `${場面}。${相手}。効果を使うなら今です。`;
  } else {
    flashPanel.hidden = true;
  }

  // 今撃てる【起動】効果があればボタンとして並べる
  const activatable = state.発動できる起動効果 || [];
  const activatePanel = el('activatePanel');
  if (activatable.length > 0) {
    activatePanel.hidden = false;
    const 一覧 = el('activateList');
    一覧.innerHTML = '';
    for (const 効果 of activatable) {
      const btn = document.createElement('button');
      btn.className = 'effect-target-btn';
      const タイミング = 効果.タイミング ? `［${効果.タイミング}］` : '';
      btn.textContent = `${効果.カード名}${タイミング}`;
      btn.title = 効果.テキスト;
      btn.addEventListener('click', () => activateEffect(効果.効果識別子));
      一覧.appendChild(btn);
    }
  } else {
    activatePanel.hidden = true;
  }

  // 効果が対象選択で止まっていれば、その案内と候補を出す
  const pending = state.保留中の効果;
  const effectPanel = el('effectPanel');
  if (pending && pending.選択肢) {
    // カードを選ぶのではない判断（「置くコアは相手が選ぶ」など）。
    // 相手の効果に答える場面なので、誰の効果なのかも見せる。
    effectPanel.hidden = false;
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
    effectPanel.hidden = false;

    const 何体 = pending.最小 === pending.最大
      ? `${pending.最大}体`
      : `${pending.最小}〜${pending.最大}体`;
    el('effectTitle').textContent = `${pending.トリガー元カード名} の効果`;
    el('effectHint').textContent = pending.任意
      ? `対象を${何体}まで選べます（選ばなくてもかまいません）`
      : `対象を${何体}選んでください`;

    const 対象一覧 = el('effectTargetList');
    対象一覧.innerHTML = '';
    for (const 対象 of pending.対象候補一覧) {
      const btn = document.createElement('button');
      const 選択中 = effectSelection.includes(対象.識別子);
      btn.className = 選択中 ? 'effect-target-btn selected' : 'effect-target-btn';
      btn.textContent = `${対象.名前}（BP ${対象.BP.toLocaleString()}）`;
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

  const selfHand = el('selfHand');
  selfHand.innerHTML = '';
  for (const card of state.自分.手札 || []) {
    const playable = メインステップ中 && card.支払可能;
    const cardEl = handCardEl(card, card.支払可能);
    if (playable) {
      cardEl.addEventListener('click', () => doPlayCard(card));
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
    blockPanel.hidden = false;
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

  el('coreMovePanel').hidden = true;
  el('trashPanel').hidden = true;
}

// === アクション ===

// 手札のカードは種別ごとに出し方が違う。
// スピリットは召喚、ネクサスは配置、マジックは使用。
async function doPlayCard(card) {
  const 送り先 =
    card.種別 === 'ネクサス' ? '/api/action/place'
    : card.種別 === 'マジック' ? '/api/action/use'
    : '/api/action/summon';
  const state = await api('POST', 送り先, { as: viewer, cardId: card.識別子 });
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
  el('coreMovePanel').hidden = false;
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
  el('coreMovePanel').hidden = true;
  activeCoreCard = null;
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
  el('coreMovePanel').hidden = true;
  activeCoreCard = null;
  applyState(state);
}

async function placeSoulCoreToCard() {
  if (!activeCoreCard) return;
  const state = await api('POST', '/api/action/place-soul-core', {
    as: viewer,
    cardId: activeCoreCard.識別子,
  });
  el('coreMovePanel').hidden = true;
  activeCoreCard = null;
  applyState(state);
}

el('coreMoveToCard').addEventListener('click', () => moveCore('toCard'));
el('coreMoveToReserve').addEventListener('click', () => moveCore('toReserve'));
el('coreMoveSoulBtn').addEventListener('click', () => moveCore('toReserve', true));
el('coreMoveFromReserveSoulBtn').addEventListener('click', placeSoulCoreToCard);

// === カード効果情報 ===

function showCardEffect(card) {
  el('cardEffectName').textContent = card.名前;
  el('cardEffectText').textContent = card.テキスト || '効果なし';
  el('cardEffectPanel').hidden = false;
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

el('cardEffectClose').addEventListener('click', () => {
  el('cardEffectPanel').hidden = true;
});

el('cardDetailClose').addEventListener('click', () => {
  el('cardDetailPanel').hidden = true;
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
  el('cardDetailPanel').hidden = false;
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
  el('trashPanel').hidden = false;
}

el('selfTrash').addEventListener('click', () => {
  if (lastState) openTrash(lastState.自分.トラッシュ, `${lastState.自分.名前} のトラッシュ`);
});
el('foeTrash').addEventListener('click', () => {
  if (lastState) openTrash(lastState.相手.トラッシュ, `${lastState.相手.名前} のトラッシュ`);
});
el('trashClose').addEventListener('click', () => {
  el('trashPanel').hidden = true;
});

showOnly(modeScreen);
