import {
  createMuushigDeck,
  dealFiveCards,
  getCardLabel,
  shuffleDeck,
  sortCards,
  suitName,
  suitSymbol,
  isRedSuit
} from './cards.js';

import { canPlayCard, getGameWinnerByScore, getNextTurn, getTrickWinner } from './gameLogic.js';

const root = document.getElementById('game-root');

function createInitialGame() {
  const players = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];

  // Газрын модыг урьдчилж санамсаргүй сонгохгүй: анх дэлгэгдэж буй хөзрийн
  // мод нь өөрөө газрын мод (trump) болно - яг тэр хөзөр л давуутай.
  const deck = shuffleDeck(createMuushigDeck('spades'));
  const { hands, stock, revealedCard } = dealFiveCards(deck, players.length);

  const trumpSuit = revealedCard.suit;
  const markTrump = (card) => ({ ...card, isTrump: card.suit === trumpSuit });

  return {
    players,
    trumpSuit,
    hands: hands.map((hand) => sortCards(hand.map(markTrump), trumpSuit)),
    stock: stock.map(markTrump),
    revealedCard: markTrump(revealedCard)
  };
}

// --- state -----------------------------------------------------------

const state = {
  players: [],
  trumpSuit: 'spades',
  hands: [],
  stock: [],
  revealedCard: null,

  decisionPlayer: 0,
  decisionPending: false,
  decisionFromTrick: false,
  nextLeader: null, // ажил хийсний дараа дараагийн ажлыг эхлүүлэх хүн (ажил хийсэн хүн биш, түүний дараагийнх)

  // -- дэлгэсэн (trump) хөзрийг авсны дараа гараа 5 болгож 1 хөзөр буцаах --
  postAcceptDiscardPending: false,
  postAcceptDiscardPlayer: null,
  pendingStockReturn: [], // энэ мөчлөгт буцаагдсан ч нууц пулд шууд орохгүй хөзрүүд

  trickCards: [],
  selected: null,
  turn: 0,

  message: 'Тоглоом ачааллаж байна...',
  scores: [],
  tricks: [],
  winner: '',
  revealedCount: 1,

  // -- huzur solih (card exchange) round, run after a trick is won --
  exchangeActive: false,
  exchangeQueue: [],
  exchangeIndex: 0,
  exchangeAsking: null,
  exchangeForced: false,
  exchangeStage: null, // 'ask' | 'select'
  exchangeMax: 0,
  exchangeSelected: [],
  exchangeReturned: [] // энэ үед солигдож гарсан хөзрүүд, үе дуусахад л нөөцөд буцаж нэгдэнэ
};

function startNewGame() {
  const initial = createInitialGame();

  state.players = initial.players;
  state.trumpSuit = initial.trumpSuit;
  state.hands = initial.hands;
  state.stock = initial.stock;
  state.revealedCard = initial.revealedCard;

  state.decisionPlayer = 0;
  state.decisionPending = true;
  state.decisionFromTrick = false;
  state.nextLeader = null;
  state.postAcceptDiscardPending = false;
  state.postAcceptDiscardPlayer = null;
  state.pendingStockReturn = [];
  state.trickCards = [];
  state.selected = null;
  state.turn = 0;

  state.scores = initial.players.map(() => 15);
  state.tricks = initial.players.map(() => 0);
  state.winner = '';
  state.revealedCount = 1;

  state.exchangeActive = false;
  state.exchangeQueue = [];
  state.exchangeIndex = 0;
  state.exchangeAsking = null;
  state.exchangeForced = false;
  state.exchangeStage = null;
  state.exchangeMax = 0;
  state.exchangeSelected = [];
  state.exchangeReturned = [];

  state.message = `Газрын мод ${suitSymbol(initial.trumpSuit)} ${suitName(initial.trumpSuit)}. ${initial.players[0]} дэлгэсэн хөзрийг авах эсэхээ шийднэ.`;

  render();
}

// --- trick logic ------------------------------------------------------

function finishTrick(nextTrickCards, nextHands) {
  const winnerPlay = getTrickWinner(nextTrickCards, state.trumpSuit);
  if (!winnerPlay) return;

  const winnerIndex = winnerPlay.playerIndex;

  state.tricks = state.tricks.map((value, index) => (index === winnerIndex ? value + 1 : value));
  state.scores = state.scores.map((value, index) => (index === winnerIndex ? Math.max(0, value - 1) : value));

  const gameWinner = getGameWinnerByScore(state.scores);

  if (gameWinner !== null) {
    state.winner = state.players[gameWinner];
    state.message = `${state.players[gameWinner]} 15 оноогоо дуусгаж яллаа.`;
    return;
  }

  const nextStockCard = state.stock[0] ?? null;
  const restStock = state.stock.slice(1);

  state.stock = restStock;
  state.trickCards = [];
  state.selected = null;
  state.decisionPlayer = winnerIndex;
  // Ажил хийсэн хүн зөвхөн дэлгэсэн хөзрийг авах эсэхээ шийднэ; дараагийн
  // ажлыг тэр биш, түүний яг дараах хүн эхэлнэ.
  state.nextLeader = getNextTurn(winnerIndex, state.players.length);
  state.turn = state.nextLeader;

  if (nextStockCard) {
    state.revealedCard = nextStockCard;
    state.revealedCount += 1;
    state.decisionPending = true;
    state.decisionFromTrick = true;
    state.message = `${state.players[winnerIndex]} ажил хийлээ. Дэлгэсэн ${getCardLabel(nextStockCard)} хөзрийг авах эсэхээ шийднэ.`;
  } else {
    state.revealedCard = null;
    state.decisionPending = false;

    if (nextHands.every((hand) => hand.length === 0)) {
      const maxTricks = Math.max(...state.tricks);
      const bestPlayerIndex = state.tricks.indexOf(maxTricks);
      state.winner = state.players[bestPlayerIndex];
      state.message = `${state.players[bestPlayerIndex]} хамгийн олон ажил хийж яллаа.`;
    } else {
      state.message = `${state.players[winnerIndex]} ажил хийлээ. Нөөц хөзөр дууссан тул үргэлжлүүлнэ.`;
    }
  }
}

function acceptRevealed() {
  if (!state.revealedCard || !state.decisionPending) return;

  state.hands = state.hands.map((hand, index) =>
    index === state.decisionPlayer ? sortCards([...hand, state.revealedCard], state.trumpSuit) : hand
  );

  const acceptedPlayer = state.decisionPlayer;

  state.message = `${state.players[acceptedPlayer]} дэлгэсэн ${getCardLabel(state.revealedCard)} (газрын мод, давуутай хөзөр) хөзрийг авлаа. Гараа 5-даа буцаахын тулд 1 хөзрөө сонгож тавина уу.`;

  state.revealedCard = null;
  state.decisionPending = false;
  state.turn = state.nextLeader !== null ? state.nextLeader : acceptedPlayer;

  // Авсан хөзрөөр гар нь 6 болсон тул шууд 1-ийг нь буцааж 5-даа орно.
  state.postAcceptDiscardPending = true;
  state.postAcceptDiscardPlayer = acceptedPlayer;

  render();
}

function confirmPostAcceptDiscard(cardId) {
  if (!state.postAcceptDiscardPending) return;
  const idx = state.postAcceptDiscardPlayer;
  const hand = state.hands[idx];
  const discard = hand.find((c) => c.id === cardId);
  if (!discard) return;

  state.hands = state.hands.map((h, i) => (i === idx ? h.filter((c) => c.id !== cardId) : h));
  // Энэ хөзөр нэн даруй нууц пулд ороход шинэ ажлын тоо буруудуулах тул
  // тухайн үе (шаардлагатай бол дараах хөзөр солих үе) дуустал хүлээнэ.
  state.pendingStockReturn.push(discard);

  state.message = `${state.players[idx]} ${getCardLabel(discard)} хөзрөө буцааж 5 хөзөртэй боллоо.`;

  state.postAcceptDiscardPending = false;
  state.postAcceptDiscardPlayer = null;

  afterDecisionResolved();
}

function declineRevealed() {
  if (!state.decisionPending) return;

  state.message = `${state.players[state.decisionPlayer]} дэлгэсэн хөзрийг авахгүй гэж шийдлээ.`;

  state.revealedCard = null;
  state.decisionPending = false;
  state.turn = state.nextLeader !== null ? state.nextLeader : state.decisionPlayer;

  afterDecisionResolved();
}

function afterDecisionResolved() {
  if (state.decisionFromTrick) {
    state.decisionFromTrick = false;
    startExchangeRound(state.decisionPlayer);
  } else if (state.pendingStockReturn.length) {
    state.stock = state.stock.concat(state.pendingStockReturn);
    state.pendingStockReturn = [];
  }
  render();
}

// --- huzur solih (card exchange) round --------------------------------
// Тоглоомын дүрэм (тодруулга хэрэгтэй бол засварлаж болно):
// - Ажил хийсэн хүний дараах тоглогчдоос эхлээд ээлжлэн "хөзөр солихдоо
//   оролцох уу?" гэж асууна.
// - Ээлжийн сүүлийн 2 хүн үргэлж заавал орно (солилт зайлшгүй болно).
// - Орсон хүн бүр гараасаа 1-ээс (нөөцийн хэмжээнээс хамаараад хамгийн ихдээ
//   5) хөзрөө сонгож нөөцийн шинэ хөзрөөр нэг удаа солино.

function startExchangeRound(winnerIndex) {
  const n = state.players.length;
  const queue = [];
  for (let i = 1; i < n; i++) queue.push((winnerIndex + i) % n);

  state.exchangeQueue = queue;
  state.exchangeIndex = 0;
  state.exchangeActive = queue.length > 0;
  state.exchangeSelected = [];
  state.exchangeReturned = [];

  if (state.exchangeActive) {
    askExchange();
  } else {
    finishExchangeRound();
  }
}

function askExchange() {
  const idx = state.exchangeQueue[state.exchangeIndex];
  const remaining = state.exchangeQueue.length - state.exchangeIndex;

  state.exchangeAsking = idx;
  state.exchangeForced = remaining <= 2;
  state.exchangeSelected = [];

  if (state.exchangeForced) {
    state.message = `${state.players[idx]} хөзөр солих ээлжид заавал орно.`;
    beginExchangeSelection(idx);
  } else {
    state.exchangeStage = 'ask';
    state.message = `${state.players[idx]} хөзөр солихдоо оролцох уу?`;
  }
}

function beginExchangeSelection(idx) {
  // 6 нууц хөзрийн пул үе даяар зөвхөн багасна (дараагийн хүнд өмнөх хүний
  // сольсон хэмжээгээр багассан үлдэгдэл л ноогдоно) - эргэж дүүргэгдэхгүй.
  const maxSwap = Math.min(5, state.stock.length);
  state.exchangeMax = maxSwap;
  state.exchangeSelected = [];

  if (maxSwap < 1) {
    state.message = `Нууц хөзөр дууссан тул ${state.players[idx]} хөзөр солих боломжгүй.`;
    advanceExchange();
    return;
  }

  state.exchangeStage = 'select';
  state.message = `${state.players[idx]} хамгийн ихдээ ${maxSwap} хөзөр сонгож соль.`;
}

function joinExchange() {
  if (state.exchangeStage !== 'ask' || state.exchangeForced) return;
  beginExchangeSelection(state.exchangeAsking);
  render();
}

function declineExchange() {
  if (state.exchangeStage !== 'ask' || state.exchangeForced) return;
  const idx = state.exchangeAsking;
  state.message = `${state.players[idx]} хөзөр солихгүй гэж шийдлээ.`;
  advanceExchange();
  render();
}

function toggleExchangeCard(cardId) {
  if (state.exchangeStage !== 'select') return;
  const set = state.exchangeSelected;
  const pos = set.indexOf(cardId);
  if (pos >= 0) {
    set.splice(pos, 1);
  } else if (set.length < state.exchangeMax) {
    set.push(cardId);
  }
  render();
}

function confirmExchange() {
  if (state.exchangeStage !== 'select') return;
  const idx = state.exchangeAsking;
  const count = state.exchangeSelected.length;

  if (count === 0) {
    state.message = 'Хамгийн багадаа 1 хөзөр сонгоно уу.';
    render();
    return;
  }

  const hand = state.hands[idx];
  const chosen = hand.filter((c) => state.exchangeSelected.includes(c.id));
  const remainHand = hand.filter((c) => !state.exchangeSelected.includes(c.id));
  const drawn = state.stock.slice(0, count);

  state.hands = state.hands.map((h, i) => (i === idx ? sortCards([...remainHand, ...drawn], state.trumpSuit) : h));
  state.stock = state.stock.slice(count); // нууц пул зөвхөн багасна
  state.exchangeReturned = state.exchangeReturned.concat(chosen); // үе дуусахад л буцна
  state.message = `${state.players[idx]} ${count} хөзөр сольлоо. (Үлдсэн нууц: ${state.stock.length})`;

  advanceExchange();
  render();
}

function advanceExchange() {
  state.exchangeIndex += 1;
  state.exchangeAsking = null;
  state.exchangeStage = null;
  state.exchangeSelected = [];

  if (state.exchangeIndex < state.exchangeQueue.length) {
    askExchange();
  } else {
    finishExchangeRound();
  }
}

function finishExchangeRound() {
  // Энэ үед солигдож гарсан хөзрүүд одоо л нөөцөд буцаж нэгдэнэ (дараагийн
  // ажлуудад дэлгэгдэх боломжтой болно) - тухайн үедээ дахин ашиглагдахгүй.
  state.stock = state.stock.concat(state.exchangeReturned).concat(state.pendingStockReturn);
  state.exchangeReturned = [];
  state.pendingStockReturn = [];

  state.exchangeActive = false;
  state.exchangeQueue = [];
  state.exchangeIndex = 0;
  state.exchangeAsking = null;
  state.exchangeStage = null;
  state.message = `Хөзөр солих үе дууслаа. ${state.players[state.turn]} ажиллана.`;
}

// --- trick play actions ------------------------------------------------

function pass() {
  if (state.decisionPending || state.exchangeActive) {
    state.message = 'Эхлээд одоогийн шийдвэрээ гүйцээнэ үү.';
    render();
    return;
  }

  const currentPlayer = state.players[state.turn];
  const nextTurn = getNextTurn(state.turn, state.players.length);

  state.turn = nextTurn;
  state.selected = null;
  state.message = `${currentPlayer} pass хийлээ.`;

  render();
}

function play() {
  if (state.decisionPending || state.exchangeActive) {
    state.message = 'Эхлээд одоогийн шийдвэрээ гүйцээнэ үү.';
    render();
    return;
  }

  if (!state.selected) {
    state.message = 'Эхлээд хөзөр сонгоно уу.';
    render();
    return;
  }

  const validation = canPlayCard(state.selected, state.hands[state.turn], state.trickCards);

  if (!validation.ok) {
    state.message = validation.reason ?? 'Энэ хөзрийг гаргах боломжгүй.';
    render();
    return;
  }

  const selected = state.selected;

  const nextHands = state.hands.map((hand, index) =>
    index === state.turn ? hand.filter((card) => card.id !== selected.id) : hand
  );

  const playItem = { playerIndex: state.turn, playerName: state.players[state.turn], card: selected };
  const nextTrickCards = [...state.trickCards, playItem];

  state.hands = nextHands;
  state.trickCards = nextTrickCards;
  state.selected = null;
  state.message = `${state.players[state.turn]} ${getCardLabel(selected)} гаргалаа.`;

  if (nextTrickCards.length === state.players.length) {
    finishTrick(nextTrickCards, nextHands);
  } else {
    state.turn = getNextTurn(state.turn, state.players.length);
  }

  render();
}

function selectCard(card) {
  state.selected = card;
  render();
}

// --- rendering -----------------------------------------------------------

function cardHtml(card, { selected = false, compact = false, dataId = false } = {}) {
  const classes = ['card-ui'];
  if (isRedSuit(card.suit)) classes.push('red');
  if (selected) classes.push('selected');
  if (card.isTrump) classes.push('trump');
  if (compact) classes.push('compact');
  const title = `${suitName(card.suit)} ${card.rank}${card.isTrump ? ' - газрын мод' : ''}`;
  const dataAttr = dataId ? `data-card-id="${card.id}"` : '';
  return `<button type="button" class="${classes.join(' ')}" title="${title}" ${dataAttr}>
    <span>${card.rank}</span>
    <span>${getCardLabel(card).slice(0, 1)}</span>
    ${card.isTrump ? '<small>мод</small>' : ''}
  </button>`;
}

function scoreBoardHtml(scoreMap, trickMap) {
  return `<div class="grid">${Object.entries(scoreMap)
    .map(
      ([name, score]) =>
        `<div class="player"><span>${name}</span><span class="score-pair"><small>авсан ажил: ${trickMap[name] ?? 0}</small><b>${score}</b></span></div>`
    )
    .join('')}</div>`;
}

function gameTableHtml() {
  const cardsHtml = state.trickCards.length
    ? `<div class="table-cards">${state.trickCards
        .map(
          (play) =>
            `<div class="played-card">${cardHtml(play.card, { compact: true })}<span>${play.playerName}</span></div>`
        )
        .join('')}</div>`
    : '<p class="muted">Одоогоор хөзөр гараагүй</p>';

  return `<div class="table">
    <h2>Тоглоомын ширээ</h2>
    <p class="trump-line">Газрын мод: <b>${suitSymbol(state.trumpSuit)} ${suitName(state.trumpSuit)}</b></p>
    ${cardsHtml}
    <p class="muted">Энэ үеийн гарсан хөзөр: ${state.trickCards.length}. Дэлгэсэн хөзөр: ${state.revealedCount}</p>
  </div>`;
}

function exchangeBoxHtml() {
  const idx = state.exchangeAsking;
  if (idx === null) return '';

  if (state.exchangeStage === 'ask') {
    return `<div class="decision-box">
      <div>
        <h2>Хөзөр солих</h2>
        <p><b>${state.players[idx]}</b> хөзөр солихдоо оролцох уу?</p>
      </div>
      <div class="row">
        <button class="button" id="exchange-yes-btn">Тийм</button>
        <button class="button secondary" id="exchange-no-btn">Үгүй</button>
      </div>
    </div>`;
  }

  if (state.exchangeStage === 'select') {
    return `<div class="decision-box" style="flex-direction:column;align-items:stretch">
      <div>
        <h2>Хөзөр солих${state.exchangeForced ? ' (заавал)' : ''}</h2>
        <p><b>${state.players[idx]}</b> хамгийн ихдээ <b>${state.exchangeMax}</b> хөзөр сонгож соль (сонгосон: ${state.exchangeSelected.length}).</p>
      </div>
      <div class="row">
        <button class="button" id="exchange-confirm-btn">Солих</button>
      </div>
    </div>`;
  }

  return '';
}

function render() {
  if (state.winner) {
    const scoreMap = Object.fromEntries(state.players.map((player, index) => [player, state.scores[index] ?? 15]));
    const trickMap = Object.fromEntries(state.players.map((player, index) => [player, state.tricks[index] ?? 0]));

    root.innerHTML = `
      <h1>Тоглоом дууслаа</h1>
      <div class="success">Ялагч: ${state.winner}</div>
      ${scoreBoardHtml(scoreMap, trickMap)}
      <div class="row">
        <button class="button" id="restart-btn">Дахин тоглох</button>
        <a class="button secondary" href="lobby.html">Lobby руу буцах</a>
      </div>
    `;
    document.getElementById('restart-btn').addEventListener('click', startNewGame);
    return;
  }

  const scoreMap = Object.fromEntries(state.players.map((player, index) => [player, state.scores[index] ?? 15]));
  const trickMap = Object.fromEntries(state.players.map((player, index) => [player, state.tricks[index] ?? 0]));

  // Хэний гарыг харуулах вэ: ердийн тоглолт бол state.turn, ажил хийсний
  // дараах шийдвэр/хөзөр буцаах/хөзөр солих үед тухайн шийдвэр гаргаж буй хүний гар.
  const activePlayerIndex = state.postAcceptDiscardPending
    ? state.postAcceptDiscardPlayer
    : state.exchangeActive && state.exchangeAsking !== null
    ? state.exchangeAsking
    : state.decisionPending
    ? state.decisionPlayer
    : state.turn;
  const hand = state.hands[activePlayerIndex] ?? [];
  const isExchangeSelectMode = state.exchangeActive && state.exchangeStage === 'select';
  const isPostAcceptDiscardMode = state.postAcceptDiscardPending;
  const interactionBlocked = state.decisionPending || state.exchangeActive || state.postAcceptDiscardPending;

  root.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Муушиг тоглоом</h1>
        <p class="muted">32 хөзөр: 7, 8, 9, 10, J, Q, K, A. Хүн бүрт 5 хөзөр. Оноо 15-аас буурна.</p>
      </div>
      <a class="button secondary" href="lobby.html">Гарах</a>
    </div>

    <div class="success">Одоогийн ээлж: <b>${state.players[state.turn] ?? ''}</b></div>

    <div class="rule-panel">
      <b>Газрын мод:</b> ${suitSymbol(state.trumpSuit)} ${suitName(state.trumpSuit)}
      <span> · </span>
      <b>Дэлгэсэн хөзөр:</b> ${state.revealedCard ? getCardLabel(state.revealedCard) : 'байхгүй'}
      <span> · </span>
      <b>Нөөц:</b> ${state.stock.length}
    </div>

    ${
      state.decisionPending && state.revealedCard
        ? `<div class="decision-box">
            <div>
              <h2>Шийдвэр</h2>
              <p><b>${state.players[state.decisionPlayer]}</b> ажил хийсэн тул хамгийн сүүлд дэлгэсэн хөзрийг авах эсэхээ шийднэ.</p>
            </div>
            ${cardHtml(state.revealedCard)}
            <div class="row">
              <button class="button" id="accept-btn">Авах</button>
              <button class="button secondary" id="decline-btn">Авахгүй</button>
            </div>
          </div>`
        : ''
    }

    ${
      isPostAcceptDiscardMode
        ? `<div class="decision-box">
            <div>
              <h2>Хөзөр буцаах</h2>
              <p><b>${state.players[activePlayerIndex]}</b> дэлгэсэн хөзрийг авсан тул одоо доорх гараасаа 1 хөзөр сонгож (дарж) буцаана.</p>
            </div>
          </div>`
        : ''
    }

    ${exchangeBoxHtml()}

    <div class="grid2" style="margin-top:16px">
      ${gameTableHtml()}
      <div class="stat">
        <h2>Оноо / ажил</h2>
        ${scoreBoardHtml(scoreMap, trickMap)}
      </div>
    </div>

    <p class="message">${state.message}</p>

    <h2>${state.players[activePlayerIndex] ?? ''}-ийн гар (${hand.length})</h2>

    <div class="hand" id="hand-container">
      ${hand
        .map((card) =>
          cardHtml(card, {
            selected: isExchangeSelectMode
              ? state.exchangeSelected.includes(card.id)
              : isPostAcceptDiscardMode
              ? false
              : state.selected?.id === card.id,
            dataId: true
          })
        )
        .join('')}
    </div>

    <div class="row">
      <button class="button" id="play-btn" ${interactionBlocked ? 'disabled' : ''}>Хөзөр гаргах</button>
      <button class="button secondary" id="pass-btn" ${interactionBlocked ? 'disabled' : ''}>Pass</button>
    </div>
  `;

  const acceptBtn = document.getElementById('accept-btn');
  if (acceptBtn) acceptBtn.addEventListener('click', acceptRevealed);

  const declineBtn = document.getElementById('decline-btn');
  if (declineBtn) declineBtn.addEventListener('click', declineRevealed);

  const exchangeYesBtn = document.getElementById('exchange-yes-btn');
  if (exchangeYesBtn) exchangeYesBtn.addEventListener('click', joinExchange);

  const exchangeNoBtn = document.getElementById('exchange-no-btn');
  if (exchangeNoBtn) exchangeNoBtn.addEventListener('click', declineExchange);

  const exchangeConfirmBtn = document.getElementById('exchange-confirm-btn');
  if (exchangeConfirmBtn) exchangeConfirmBtn.addEventListener('click', confirmExchange);

  document.getElementById('play-btn').addEventListener('click', play);
  document.getElementById('pass-btn').addEventListener('click', pass);

  document.getElementById('hand-container').querySelectorAll('[data-card-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = hand.find((c) => c.id === btn.dataset.cardId);
      if (!card) return;
      if (isPostAcceptDiscardMode) {
        confirmPostAcceptDiscard(card.id);
      } else if (isExchangeSelectMode) {
        toggleExchangeCard(card.id);
      } else if (!interactionBlocked) {
        selectCard(card);
      }
    });
  });
}

startNewGame();
