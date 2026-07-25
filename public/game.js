// バトルスピリッツ・スタン — 対戦盤面のクライアント側ロジック
// サーバーの `試合`（バトルスピリッツスタン）を薄くラップしたAPIを叩き、視点(as)ごとの状態を描画する。

let viewer = 'p1';       // 今この画面が誰の視点として振る舞っているか（vsHumanでは手番ごとに切り替わる）
let lastState = null;
let activeCoreCard = null;
let coreMoveAmount = 1;

// カードナンバー → 絵柄画像のパス（絵柄が無いカードは既定のグラデーションで表示する）
const CARD_ART = {
  '26RSD01-005': 'cards/26RSD01-005.png',
};

const el = id => document.getElementById(id);

const modeScreen = el('modeScreen');
const handoffScreen = el('handoffScreen');
const resultScreen = el('resultScreen');
const board = el('board');

function showOnly(screen) {
  for (const s of [modeScreen, handoffScreen, resultScreen, board]) {
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

// === モード選択 ===

for (const btn of document.querySelectorAll('.mode-btn[data-mode]')) {
  btn.addEventListener('click', async () => {
    viewer = 'p1';
    const state = await api('POST', '/api/game/start', { mode: btn.dataset.mode });
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
  div.classList.add('has-art');
  const artLayer = document.createElement('div');
  artLayer.className = 'card-art';
  artLayer.style.backgroundImage = `url('${art}')`;
  div.appendChild(artLayer);
}

function fieldCardEl(card, mode) {
  const div = document.createElement('div');
  div.className = `card state-${card.表示形式}`;
  if (mode) div.classList.add(mode);
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
    ${card.テキスト ? `<span class="card-text">${card.テキスト}</span>` : ''}
  `;
  div.appendChild(scrim);
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
  if (cards.length === 0) {
    container.innerHTML = '<span class="field-empty">フィールドにカードがありません</span>';
    return;
  }
  for (const card of cards) {
    const mode = classify ? classify(card) : null;
    const cardEl = fieldCardEl(card, mode);
    if (mode === 'attackable') {
      cardEl.addEventListener('click', () => doAttack(card.識別子));
    } else if (mode === 'editable') {
      cardEl.addEventListener('click', () => openCoreMove(card));
    }
    container.appendChild(cardEl);
  }
}

function renderBoard(state) {
  renderZoneRow('foe', state.相手);
  renderZoneRow('self', state.自分);

  renderField('foeField', state.相手.フィールド, null);

  const 自分のターンで随意ステップ =
    state.ターンプレイヤー識別子 === viewer && !state.保留中のブロック;
  const アタックステップ中 = 自分のターンで随意ステップ && state.ステップ === 'アタックステップ';
  const メインステップ中 =
    自分のターンで随意ステップ && (state.ステップ === 'メインステップ' || state.ステップ === '第2メインステップ');

  renderField('selfField', state.自分.フィールド, card => {
    if (アタックステップ中 && card.表示形式 === '回復') return 'attackable';
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
      cardEl.addEventListener('click', () => doSummon(card.識別子));
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

    const candidates = state.自分.フィールド.filter(c => c.表示形式 === '回復');
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

async function doSummon(cardId) {
  const state = await api('POST', '/api/action/summon', { as: viewer, cardId });
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

async function moveCore(方向) {
  if (!activeCoreCard) return;
  const state = await api('POST', '/api/action/move-core', {
    as: viewer,
    cardId: activeCoreCard.識別子,
    方向,
    数: coreMoveAmount,
  });
  el('coreMovePanel').hidden = true;
  activeCoreCard = null;
  applyState(state);
}

el('coreMoveToCard').addEventListener('click', () => moveCore('toCard'));
el('coreMoveToReserve').addEventListener('click', () => moveCore('toReserve'));

// === トラッシュ一覧 ===

function openTrash(list, title) {
  el('trashTitle').textContent = title;
  const ul = el('trashList');
  ul.innerHTML = '';
  if (list.length === 0) {
    ul.innerHTML = '<li class="empty">トラッシュは空です</li>';
  } else {
    for (const card of list) {
      const li = document.createElement('li');
      li.textContent = card.名前;
      ul.appendChild(li);
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
