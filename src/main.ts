import './styles.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service Worker registration failed, PWA features unavailable
  });
}

// API エンドポイント（サーバー必須、今後クライアント側化予定）
const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://api.example.com'  // 本番環境
  : '';  // 開発環境（同じドメイン）

// バトルスピリッツ・スタン — 対戦盤面のクライアント側ロジック
let viewer = 'p1';
let lastState: any = null;
let activeCoreCard: any = null;
let coreMoveAmount = 1;
let selectedDeck = 'gungata';

const CARD_ART: { [key: string]: string } = {
  '26RSD01-002': '/cards/26RSD01-002.png',
  '26RSD01-004': '/cards/26RSD01-004.png',
  '26RSD01-005': '/cards/26RSD01-005.png',
  '26RSD01-006': '/cards/26RSD01-006.png',
  '26RSD01-007': '/cards/26RSD01-007.png',
  '26RSD01-008': '/cards/26RSD01-008.png',
  '26RSD01-009': '/cards/26RSD01-009.png',
  '26RSD01-010': '/cards/26RSD01-010.png',
  '26RSD01-011': '/cards/26RSD01-011.png',
  '26RSD01-012': '/cards/26RSD01-012.png',
  '26RSD01-013': '/cards/26RSD01-013.png',
  '26RSD01-014': '/cards/26RSD01-014.png',
  '26RSD01-X01': '/cards/26RSD01-X01.png',
  '26RSD01-X02': '/cards/26RSD01-X02.png',
};

const el = (id: string): HTMLElement | null => document.getElementById(id);

const deckScreen = el('deckScreen');
const modeScreen = el('modeScreen');
const handoffScreen = el('handoffScreen');
const resultScreen = el('resultScreen');
const board = el('board');

function showOnly(screen: HTMLElement | null) {
  for (const s of [deckScreen, modeScreen, handoffScreen, resultScreen, board]) {
    if (s) s.hidden = s !== screen;
  }
}

function showToast(message: string) {
  const toast = el('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout((showToast as any)._t);
  (showToast as any)._t = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

async function api(method: string, url: string, body?: any): Promise<any> {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const res = await fetch(fullUrl, {
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
  } catch (e) {
    console.error('API error:', e);
    showToast('ネットワークエラー');
    return null;
  }
}

function applyState(state: any) {
  if (!state) return;
  lastState = state;

  if (state.試合終了か) {
    renderResult(state);
    showOnly(resultScreen);
    if (el('blockPanel')) el('blockPanel')!.hidden = true;
    if (el('coreMovePanel')) el('coreMovePanel')!.hidden = true;
    if (el('trashPanel')) el('trashPanel')!.hidden = true;
    return;
  }

  if (state.モード === 'vsHuman' && !state.自分が実行者か) {
    viewer = state.実行者識別子;
    setTimeout(() => {
      api('GET', `/api/ゲーム/状態?as=${viewer}`).then(applyState);
    }, 500);
    return;
  }

  renderBoard(state);
  showOnly(board);
}

// === デッキ選択 ===

for (const btn of document.querySelectorAll('.deck-btn')) {
  btn.addEventListener('click', () => {
    selectedDeck = (btn as HTMLElement).dataset.deck || 'gungata';
    const deckName = selectedDeck === 'gungata' ? 'グン＝ガタ' : 'ゲン＝ボー';
    const eyebrow = el('modeEyebrow');
    if (eyebrow) eyebrow.textContent = `${deckName}で対戦`;
    showOnly(modeScreen);
  });
}

if (el('deckBack')) {
  el('deckBack')!.addEventListener('click', () => {
    showOnly(deckScreen);
  });
}

// === モード選択 ===

for (const btn of document.querySelectorAll('.mode-btn[data-mode]')) {
  btn.addEventListener('click', async () => {
    viewer = 'p1';
    const state = await api('POST', '/api/ゲーム/開始', {
      mode: (btn as HTMLElement).dataset.mode,
      deck: selectedDeck,
    });
    applyState(state);
  });
}

// === 受け渡し画面 ===

function renderHandoff(state: any) {
  if (el('handoffName')) el('handoffName')!.textContent = state.相手.名前;
  if (el('handoffReason')) el('handoffReason')!.textContent = 'の番です';
  if (handoffScreen) (handoffScreen as any).dataset.nextViewer = state.実行者識別子;
}

if (el('handoffReady')) {
  el('handoffReady')!.addEventListener('click', async () => {
    viewer = (handoffScreen as any)?.dataset.nextViewer || viewer;
    const state = await api('GET', `/api/ゲーム/状態?as=${viewer}`);
    applyState(state);
  });
}

// === 決着画面 ===

function renderResult(state: any) {
  const 結果 = state.勝敗結果;
  if (!結果) {
    if (el('resultEyebrow')) el('resultEyebrow')!.textContent = '終了';
    if (el('resultHeadline')) el('resultHeadline')!.textContent = '試合終了';
    if (el('resultReason')) el('resultReason')!.textContent = '';
    return;
  }
  const 自分が勝者 = 結果.勝者 && 結果.勝者.識別子 === viewer;
  if (el('resultEyebrow')) el('resultEyebrow')!.textContent = '決着';
  if (el('resultHeadline')) {
    el('resultHeadline')!.textContent = state.モード === 'vsAI'
      ? (自分が勝者 ? 'あなたの勝ち' : 'AIの勝ち')
      : `${結果.勝者 ? 結果.勝者.名前 : '?'} の勝ち`;
  }
  if (el('resultReason')) el('resultReason')!.textContent = 結果.理由 || '';
}

if (el('resultRestart')) {
  el('resultRestart')!.addEventListener('click', () => {
    viewer = 'p1';
    lastState = null;
    showOnly(modeScreen);
  });
}

// === 盤面描画 ===

function pipsHTML(reserve: any): string {
  const 通常 = reserve.通常;
  const parts: string[] = [];
  for (let i = 0; i < 通常; i++) {
    parts.push('<span class="pip"></span>');
  }
  if (reserve.ソウルコア) {
    parts.push('<span class="pip pip-soul" title="ソウルコア"></span>');
  }
  return parts.join('') || '<span class="pip" style="visibility:hidden"></span>';
}

function cardPipsHTML(count: number, hasSoul: boolean): string {
  const 通常 = hasSoul ? count - 1 : count;
  const parts: string[] = [];
  for (let i = 0; i < 通常; i++) parts.push('<span class="pip"></span>');
  if (hasSoul) parts.push('<span class="pip pip-soul"></span>');
  return `<div class="card-pips">${parts.join('')}</div>`;
}

function artURL(cardNumber: string): string | null {
  return cardNumber && CARD_ART[cardNumber] ? CARD_ART[cardNumber] : null;
}

function applyArt(div: HTMLElement, cardNumber: string) {
  const art = artURL(cardNumber);
  if (!art) return;
  div.classList.add('has-art');
  const artLayer = document.createElement('div');
  artLayer.className = 'card-art';
  artLayer.style.backgroundImage = `url('${art}')`;
  div.appendChild(artLayer);
}

function fieldCardEl(card: any, mode: string | null): HTMLElement {
  const div = document.createElement('div');
  div.className = `card state-${card.表示形式}`;
  if (mode) div.classList.add(mode);
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー);

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

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function handCardEl(card: any, playable: boolean): HTMLElement {
  const div = document.createElement('div');
  div.className = 'card hand-card';
  div.classList.add(playable ? 'playable' : 'unaffordable');
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー);

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

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function renderZoneRow(prefix: string, playerState: any) {
  if (el(`${prefix}Name`)) el(`${prefix}Name`)!.textContent = playerState.名前;
  if (el(`${prefix}Life`)) el(`${prefix}Life`)!.textContent = `Life ${playerState.ライフ}`;
  if (el(`${prefix}Pips`)) el(`${prefix}Pips`)!.innerHTML = pipsHTML(playerState.リザーブ);
  if (el(`${prefix}Deck`)) el(`${prefix}Deck`)!.textContent = `デッキ ${playerState.デッキ枚数}`;
  if (el(`${prefix}Trash`)) el(`${prefix}Trash`)!.textContent = `トラッシュ ${playerState.トラッシュ.length}`;
}

function renderField(containerId: string, cards: any[], classify?: ((card: any) => string | null) | null) {
  const container = el(containerId);
  if (!container) return;
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

function renderBoard(state: any) {
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

  const foeHand = el('foeHand');
  if (foeHand) {
    foeHand.innerHTML = '';
    for (const card of state.相手.手札 || []) {
      const cardEl = handCardEl(card, false);
      foeHand.appendChild(cardEl);
    }
  }

  const selfHand = el('selfHand');
  if (selfHand) {
    selfHand.innerHTML = '';
    for (const card of state.自分.手札 || []) {
      const playable = メインステップ中 && card.支払可能;
      const cardEl = handCardEl(card, card.支払可能);
      if (playable) {
        cardEl.addEventListener('click', () => doSummon(card.識別子));
      }
      selfHand.appendChild(cardEl);
    }
  }

  const banner = el('turnBanner');
  if (banner) {
    const 自分のターンか = state.ターンプレイヤー識別子 === viewer;
    banner.className = 'turn-banner ' + (自分のターンか ? 'acting-self' : 'acting-foe');
    const 表示相手名 = 自分のターンか ? 'あなた' : state.相手.名前;
    if (el('turnLabel')) el('turnLabel')!.textContent = `${表示相手名}のターン ・ ${state.ステップ || ''}`;
  }

  const endBtn = el('endStepBtn');
  if (endBtn) {
    endBtn.hidden = !(自分のターンで随意ステップ && ['メインステップ', 'アタックステップ', '第2メインステップ'].includes(state.ステップ));
  }

  const blockPanel = el('blockPanel');
  if (blockPanel) {
    if (state.保留中のブロック) {
      blockPanel.hidden = false;
      const attackerHost = el('blockAttacker');
      if (attackerHost) {
        attackerHost.innerHTML = '';
        attackerHost.appendChild(fieldCardEl(state.保留中のブロック.攻撃者, null));
      }

      const candidates = state.自分.フィールド.filter((c: any) => c.表示形式 === '回復');
      renderField('blockCandidates', candidates, () => 'blockable');
      const candidateContainer = el('blockCandidates');
      if (candidateContainer) {
        for (const cardEl of candidateContainer.children) {
          const id = (cardEl as HTMLElement).dataset.cardId;
          if (!id) continue;
          cardEl.addEventListener('click', () => doBlock(id));
        }
      }
    } else {
      blockPanel.hidden = true;
    }
  }

  if (el('coreMovePanel')) el('coreMovePanel')!.hidden = true;
  if (el('trashPanel')) el('trashPanel')!.hidden = true;
}

// === アクション ===

async function doSummon(cardId: string) {
  const state = await api('POST', '/api/アクション/召喚', { as: viewer, cardId });
  applyState(state);
}

async function doAttack(cardId: string) {
  const state = await api('POST', '/api/アクション/アタック', { as: viewer, cardId });
  applyState(state);
}

async function doBlock(cardId: string | null) {
  const state = await api('POST', '/api/アクション/ブロック', { as: viewer, cardId });
  applyState(state);
}

if (el('blockSkip')) {
  el('blockSkip')!.addEventListener('click', async () => {
    const state = await api('POST', '/api/アクション/ブロック', { as: viewer, cardId: null });
    applyState(state);
  });
}

if (el('endStepBtn')) {
  el('endStepBtn')!.addEventListener('click', async () => {
    const state = await api('POST', '/api/アクション/ステップ終了', { as: viewer });
    applyState(state);
  });
}

// === コア移動 ===

function openCoreMove(card: any) {
  activeCoreCard = card;
  coreMoveAmount = 1;
  if (el('coreMoveTitle')) el('coreMoveTitle')!.textContent = `${card.名前} のコアを移動`;
  if (el('coreMoveHint')) {
    el('coreMoveHint')!.textContent = card.次のLvに必要な総コア数
      ? `現在${card.コア数}コア／Lv${card.Lv + 1}には合計${card.次のLvに必要な総コア数}コア必要`
      : `現在${card.コア数}コア（最大Lvです）`;
  }
  if (el('coreMoveAmount')) el('coreMoveAmount')!.textContent = coreMoveAmount.toString();
  if (el('coreMovePanel')) el('coreMovePanel')!.hidden = false;
}

if (el('coreMoveMinus')) {
  el('coreMoveMinus')!.addEventListener('click', () => {
    coreMoveAmount = Math.max(1, coreMoveAmount - 1);
    if (el('coreMoveAmount')) el('coreMoveAmount')!.textContent = coreMoveAmount.toString();
  });
}

if (el('coreMovePlus')) {
  el('coreMovePlus')!.addEventListener('click', () => {
    coreMoveAmount = Math.min(20, coreMoveAmount + 1);
    if (el('coreMoveAmount')) el('coreMoveAmount')!.textContent = coreMoveAmount.toString();
  });
}

if (el('coreMoveClose')) {
  el('coreMoveClose')!.addEventListener('click', () => {
    if (el('coreMovePanel')) el('coreMovePanel')!.hidden = true;
    activeCoreCard = null;
  });
}

async function moveCore(方向: string) {
  if (!activeCoreCard) return;
  const state = await api('POST', '/api/アクション/コア移動', {
    as: viewer,
    cardId: activeCoreCard.識別子,
    方向,
    数: coreMoveAmount,
  });
  if (el('coreMovePanel')) el('coreMovePanel')!.hidden = true;
  activeCoreCard = null;
  applyState(state);
}

if (el('coreMoveToCard')) {
  el('coreMoveToCard')!.addEventListener('click', () => moveCore('toCard'));
}

if (el('coreMoveToReserve')) {
  el('coreMoveToReserve')!.addEventListener('click', () => moveCore('toReserve'));
}

// === カード詳細表示 ===

function showCardDetail(card: any) {
  const container = el('cardDetailContent');
  if (!container) return;
  container.innerHTML = '';

  const cardEl = document.createElement('div');
  cardEl.className = 'card card-detail';
  cardEl.dataset.cardId = card.識別子;

  const art = artURL(card.カードナンバー);
  if (art) {
    cardEl.classList.add('has-art');
    const artLayer = document.createElement('div');
    artLayer.className = 'card-art';
    artLayer.style.backgroundImage = `url('${art}')`;
    cardEl.appendChild(artLayer);
  }

  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = '';
  cardEl.appendChild(scrim);

  container.appendChild(cardEl);
  if (el('cardDetailPanel')) el('cardDetailPanel')!.hidden = false;
}

if (el('cardDetailClose')) {
  el('cardDetailClose')!.addEventListener('click', () => {
    if (el('cardDetailPanel')) el('cardDetailPanel')!.hidden = true;
  });
}

// === トラッシュ ===

function trashCardEl(card: any): HTMLElement {
  const div = document.createElement('div');
  div.className = 'card trash-card';
  div.dataset.cardId = card.識別子;
  applyArt(div, card.カードナンバー);

  const hasArt = !!artURL(card.カードナンバー);
  const scrim = document.createElement('div');
  scrim.className = 'card-scrim';
  scrim.innerHTML = `
    ${hasArt ? '' : `<span class="card-name">${card.名前}</span>`}
  `;
  div.appendChild(scrim);

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCardDetail(card);
  });

  return div;
}

function openTrash(list: any[], title: string) {
  if (el('trashTitle')) el('trashTitle')!.textContent = title;
  const container = el('trashList');
  if (!container) return;
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
  if (el('trashPanel')) el('trashPanel')!.hidden = false;
}

if (el('selfTrash')) {
  el('selfTrash')!.addEventListener('click', () => {
    if (lastState) openTrash(lastState.自分.トラッシュ, `${lastState.自分.名前} のトラッシュ`);
  });
}

if (el('foeTrash')) {
  el('foeTrash')!.addEventListener('click', () => {
    if (lastState) openTrash(lastState.相手.トラッシュ, `${lastState.相手.名前} のトラッシュ`);
  });
}

if (el('trashClose')) {
  el('trashClose')!.addEventListener('click', () => {
    if (el('trashPanel')) el('trashPanel')!.hidden = true;
  });
}

showOnly(modeScreen);
