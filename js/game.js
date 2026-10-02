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

function dealNewHand(players) {
  // Газрын модыг урьдчилж санамсаргүй сонгохгүй: анх дэлгэгдэж буй хөзрийн
  // мод нь өөрөө газрын мод (trump) болно - яг тэр хөзөр л давуутай.
  const deck = shuffleDeck(createMuushigDeck('spades'));
  const { hands, stock, revealedCard } = dealFiveCards(deck, players.length);

  const trumpSuit = revealedCard.suit;
  const markTrump = (card) => ({ ...card, isTrump: card.suit === trumpSuit });

  return {
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
  revealedCard: null, // зөвхөн газрын модыг заах индикатор хөзөр - гарт орохгүй

  trickCards: [],
  selected: null,
  turn: 0,

  message: 'Тоглоом ачааллаж байна...',
  scores: [],
  tricks: [],
  dealTricks: [], // энэ тараалтад тус тоглогч тус бүр хэдэн ажил авсныг тоолно (тараалт бүрт 0-ээс шинээр эхэлнэ)
  deadCards: [], // тухайн тараалтад дахин ашиглагдахгүй болсон хөзрүүд (ж: дэлгэсэн хөзөр авсны дараа хаясан хөзөр)
  winner: '',
  dealStarter: 0, // тараалт бүрт эхлэгч ээлжлэн шилждэг

  // -- дэлгэсэн (жороо) хөзрийг авах эсэх шийдвэр - тараалт бүрийн эхэнд,
  // тоглолт эхлэхээс ӨМНӨ, эхлүүлэгчид (dealStarter) яг 1 л удаа гарна --
  decisionPending: false,
  decisionPlayer: null,
  postAcceptDiscardPending: false,
  postAcceptDiscardPlayer: null,

  // -- huzur solih (хөзөр солих) - тоглогч "орно" гэж шийдмэгц шууд тэр
  // хүнээс асуугддаг болсон (тоглолтонд орох эсэх ээлжтэй нэгтгэгдсэн) --
  exchangeAsking: null,
  exchangeStage: null, // 'ask' | 'select'
  exchangeMax: 0,
  exchangeSelected: [],
  exchangeReturned: [], // энэ үед солигдож гарсан хөзрүүд, тараалт дуусахад нөөцөд буцаж нэгдэнэ

  // -- тоглолтонд орох эсэх - тараалт бүрийн ХАМГИЙН ЭХЭНД (тараасны дараа,
  // дэлгэсэн хөзрийн шийдвэрээс ч өмнө), нэг л удаа явагдана. Эхлүүлэгч
  // (queue-ийн 1-р) болон queue-ийн СҮҮЛИЙН хүн үргэлж заавал орно, дунд
  // хүмүүс (2,3,4-р ээлж) орох эсэхээ өөрсдөө шийднэ. Орохгүй бол тухайн
  // тараалтад огт оролцохгүй (хөзөр нь нөөцөд буцна, оноо хөдлөхгүй).
  // Хэрэв нэг хүн 3 тараалт дараалан орохгүй бол 4 дэх тараалтад заавал орно.
  activePlayers: [], // энэ тараалтад орсон эсэх, тоглогч тус бүрээр
  declineStreak: [], // тоглогч бүрийн дараалан орохгүй гэж шийдсэн тоо (тоглоом даяар хадгалагдана)
  joinQueue: [],
  joinIndex: 0,
  joinAsking: null,
  joinStage: null // 'ask' | null
};

function startNewGame() {
  state.players = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
  state.scores = state.players.map(() => 15);
  state.tricks = state.players.map(() => 0);
  state.declineStreak = state.players.map(() => 0);
  state.winner = '';
  state.dealStarter = 0;

  startNewDeal(0, 'Тоглоом эхэллээ.');
}

// Тараалт (5 хөзөр тус бүрд, 5 ажил) дуусаад хэн ч 15 оноогоо 0 болгоогүй бол
// оноог хэвээр авч үлдээгээд шинэ тараалт хийнэ - тоглоом ганцхан тараалтаар
// дуусахгүй, харин хэн нэгний оноо 0 хүрэх хүртэл үргэлжилнэ. Шинэ тараалтыг
// сүүлийн ажлыг хийсэн (хожсон) хүн БИШ, харин түүний дараагийн ээлжтэй хүн
// эхлүүлнэ (dealStarter = getNextTurn(winnerIndex, ...)).
//
// Яг тараасны дараа, ЭХЛҮҮЛЭГЧ (dealStarter) хамгийн эхэнд дэлгэсэн (жороо)
// хөзрийг авах эсэхээ шийднэ. Зөвхөн үүний дараа, ЭХЛҮҮЛЭГЧИЙН ДАРААГИЙН
// хүнээс эхлээд (dealStarter өөрөө сүүлд нь орно) "тоглолтонд орох эсэх"
// үе явагдана, дараа нь мөн ЭХЛҮҮЛЭГЧИЙН ДАРААГИЙН хүнээс эхлээд "хөзөр
// солих" үе, эцэст нь ажил (трик) тоглолт эхэлнэ.
function startNewDeal(startPlayer, introMessage) {
  const initial = dealNewHand(state.players);

  state.trumpSuit = initial.trumpSuit;
  state.hands = initial.hands;
  state.stock = initial.stock;
  state.revealedCard = initial.revealedCard;

  state.dealStarter = startPlayer;
  state.decisionPending = false;
  state.decisionPlayer = null;
  state.postAcceptDiscardPending = false;
  state.postAcceptDiscardPlayer = null;
  state.trickCards = [];
  state.selected = null;
  state.turn = startPlayer;
  state.dealTricks = state.players.map(() => 0); // энэ тараалтад тус тус хэдэн ажил авсныг тоолно
  state.deadCards = [];

  const intro = introMessage ? `${introMessage} ` : '';
  const trumpLine = `Газрын мод ${suitSymbol(initial.trumpSuit)} ${suitName(initial.trumpSuit)}.`;

  if (state.revealedCard) {
    state.decisionPending = true;
    state.decisionPlayer = startPlayer;
    state.message = `${intro}${trumpLine} ${state.players[startPlayer]} дэлгэсэн хөзрийг авах эсэхээ шийднэ.`;
  } else {
    state.message = `${intro}${trumpLine} Тоглолтонд орох эсэхийг шийдэж эхэлж байна.`;
    startJoinRound(getNextTurn(startPlayer, state.players.length));
  }

  render();
}

// --- toglolt-nd oroh esekh (тоглолтонд орох эсэх) round -----------------
// Trump (дэлгэсэн) хөзрийн шийдвэр гарсны дараа, хөзөр солихоос ч өмнө,
// нэг л удаа явагдана:
// - ЭХЛҮҮЛЭГЧИЙН (dealStarter) ДАРААГИЙН хүнээс эхэлж, ээлжлэн бүх 5
//   тоглогч (эхлүүлэгчийг оролцуулаад, тэр СҮҮЛД нь) орох уу үгүйгээ
//   өөрсдөө шийднэ.
// - Хэн нэг нь 3 тараалт дараалан орохгүй гэж шийдсэн бол, 4 дэх тараалтад
//   заавал орно (declineStreak тоглоом даяар хадгалагдана).
// - Тоглолт болохын тулд ХАМГИЙН БАГАДАА 2 хүн орсон байх ёстой. Хэрэв
//   бүгд шийдсэний дараа орсон тоо 2-оос цөөн бол, жагсаалтын СҮҮЛЭЭС эхлээд
//   орохгүй гэсэн хүмүүсийг эргүүлж заавал оруулна.
// - Орохгүй гэж шийдсэн хүний гар тухайн тараалтад бүрэн хасагдаж (нөөцөд
//   буцна), тэр хүн энэ тараалтад огт оролцохгүй бөгөөд оноо нь хөдлөхгүй.
// - Хэрэв эхлүүлэгч (dealStarter) өөрөө орохгүй гэж шийдвэл, дараагийн
//   идэвхтэй (орсон) хүн түүнийг залгамжлан тэргүүлж ажлаа эхлүүлнэ.
function startJoinRound(startPlayer) {
  const n = state.players.length;
  const queue = [];
  for (let i = 0; i < n; i++) queue.push((startPlayer + i) % n);

  state.joinQueue = queue;
  state.joinIndex = 0;
  state.activePlayers = state.players.map(() => false);
  state.exchangeReturned = [];

  askJoin();
}

function askJoin() {
  const idx = state.joinQueue[state.joinIndex];

  if (state.declineStreak[idx] >= 3) {
    state.message = `${state.players[idx]} 3 тараалт дараалан ороогүй тул энэ удаад заавал орно.`;
    resolveJoin(idx, true);
    return;
  }

  state.joinAsking = idx;
  state.joinStage = 'ask';
  state.message = `${state.players[idx]} энэ тараалтад тоглох уу, эсвэл түр гарах уу?`;
}

// Орсон бол шууд ТЭР ХҮНЭЭС хөзрөө СОЛИХ эсэхийг асууна (proceedToExchangeForPlayer),
// зөвхөн орохгүй бол дараагийн хүн рүү (advanceJoin) шилжинэ.
function resolveJoin(idx, joined) {
  state.joinAsking = null;
  state.joinStage = null;
  state.activePlayers[idx] = joined;

  if (joined) {
    state.declineStreak[idx] = 0;
    proceedToExchangeForPlayer(idx);
  } else {
    state.declineStreak[idx] += 1;
    state.stock = state.stock.concat(state.hands[idx]);
    state.hands = state.hands.map((h, i) => (i === idx ? [] : h));
    state.message = `${state.players[idx]} энэ тараалтад ороогүй.`;
    advanceJoin();
  }
}

function joinYes() {
  if (state.joinStage !== 'ask') return;
  resolveJoin(state.joinAsking, true);
  render();
}

function joinNo() {
  if (state.joinStage !== 'ask') return;
  resolveJoin(state.joinAsking, false);
  render();
}

function advanceJoin() {
  state.joinIndex += 1;

  if (state.joinIndex < state.joinQueue.length) {
    askJoin();
  } else {
    enforceMinimumJoin();
    finishJoinRound();
  }
}

// Тоглолт болохын тулд хамгийн багадаа 2 хүн орсон байх ёстой. Дутуу бол
// жагсаалтын сүүлээс (5,4,3...) эхлээд орохгүй гэсэн хүмүүсийг эргүүлж
// заавал оруулна. (Ийнхүү сүүлд заавал орсон хүмүүс хөзөр солих сонголт
// авахгүй - тэд аль хэдийн бусдын дараа "хожимдож" орж байгаа тул.)
function enforceMinimumJoin() {
  let activeCount = state.activePlayers.filter(Boolean).length;

  for (let i = state.joinQueue.length - 1; i >= 0 && activeCount < 2; i--) {
    const idx = state.joinQueue[i];
    if (!state.activePlayers[idx]) {
      state.activePlayers[idx] = true;
      state.declineStreak[idx] = 0;
      activeCount += 1;
      state.message = `${state.message} Тоглолт болохын тулд ${state.players[idx]} заавал орлоо.`;
    }
  }
}

function firstActiveFrom(startIndex) {
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    const idx = (startIndex + i) % n;
    if (state.activePlayers[idx]) return idx;
  }
  return startIndex;
}

function finishJoinRound() {
  // Тоглолтонд орох эсэх, хөзөр солих эсэх хоёул бүрэн шийдэгдлээ. Хэрэв
  // анхны эхлүүлэгч өөрөө ороогүй бол дараагийн идэвхтэй хүн түүнийг
  // залгамжлан тэргүүлнэ.
  state.dealStarter = firstActiveFrom(state.dealStarter);
  state.turn = state.dealStarter;

  // Энэ үед бүх хөзөр солилтын үлдэгдэл (exchangeReturned) нөөцөд буцаж нэгдэнэ.
  state.stock = state.stock.concat(state.exchangeReturned);
  state.exchangeReturned = [];

  state.trickCards = [];
  state.selected = null;
  state.message = `Тоглолтонд орох, хөзөр солих эсэх бүгд шийдэгдлээ. ${state.players[state.dealStarter]} ажлаа эхлүүлнэ.`;
  render();
}

// --- huzur solih (card exchange) round --------------------------------
// Тараалт бүрийн эхэнд, нэг л удаа явагдана:
// - Тараалтыг эхлүүлэгч тоглогчоос эхлээд бүх 5 тоглогч ээлжлэн "хөзөр
//   солихдоо оролцох уу?" гэж асуулгад орно.
// - Ээлжийн сүүлийн 2 хүн үргэлж заавал орно (солилт зайлшгүй болно).
// - Орсон хүн бүр гараасаа 1-ээс (нөөцийн үлдэгдэлээс хамаараад хамгийн
//   ихдээ 5) хөзрөө сонгож нөөцийн шинэ хөзрөөр нэг удаа солино. Нөөцийн
//   6 хөзрийн багц энэ үе даяар зөвхөн багасна (дараагийн хүнд өмнөх
//   хүний авсны дараах үлдэгдэл л ноогдоно), харин үе дуусахад солигдож
//   гарсан хөзрүүд нөөцөд буцаж нэгдэнэ.

// Тоглогч "орно" гэж шийдмэгц шууд ТЭР ХҮНЭЭС "хөзрөө СОЛИХ уу?" гэж асууна -
// ингэснээр "орох эсэх" болон "солих эсэх" хоёр асуулт тухайн хүнд дараалан,
// нэгтгэгдсэн байдлаар ирнэ. Дараа нь л дараагийн хүн рүү (advanceJoin) шилжинэ.
function proceedToExchangeForPlayer(idx) {
  state.exchangeAsking = idx;
  state.exchangeStage = 'ask';
  state.exchangeSelected = [];
  state.message = `${state.players[idx]} гарынхаа хөзрийг СОЛИХ уу?`;
}

function beginExchangeSelection(idx) {
  const maxSwap = Math.min(5, state.stock.length);
  state.exchangeMax = maxSwap;
  state.exchangeSelected = [];

  if (maxSwap < 1) {
    state.message = `Нууц хөзөр дууссан тул ${state.players[idx]} хөзөр солих боломжгүй.`;
    state.exchangeAsking = null;
    state.exchangeStage = null;
    advanceJoin();
    return;
  }

  state.exchangeStage = 'select';
  state.message = `${state.players[idx]} хамгийн ихдээ ${maxSwap} хөзөр сонгож соль.`;
}

function joinExchange() {
  if (state.exchangeStage !== 'ask') return;
  beginExchangeSelection(state.exchangeAsking);
  render();
}

function declineExchange() {
  if (state.exchangeStage !== 'ask') return;
  const idx = state.exchangeAsking;
  state.message = `${state.players[idx]} хөзөр солихгүй гэж шийдлээ.`;
  state.exchangeAsking = null;
  state.exchangeStage = null;
  advanceJoin();
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
    state.message = 'Хамгийн багадаа 1 хөзөр сонгоно уу, эсвэл "Үгүй" дарж алгасна уу.';
    render();
    return;
  }

  const hand = state.hands[idx];
  const chosen = hand.filter((c) => state.exchangeSelected.includes(c.id));
  const remainHand = hand.filter((c) => !state.exchangeSelected.includes(c.id));
  const drawn = state.stock.slice(0, count);

  state.hands = state.hands.map((h, i) => (i === idx ? sortCards([...remainHand, ...drawn], state.trumpSuit) : h));
  state.stock = state.stock.slice(count); // нууц пул зөвхөн багасна
  state.exchangeReturned = state.exchangeReturned.concat(chosen); // тараалт дуусахад л буцна
  state.message = `${state.players[idx]} ${count} хөзөр сольлоо. (Үлдсэн нууц: ${state.stock.length})`;

  state.exchangeAsking = null;
  state.exchangeStage = null;
  state.exchangeSelected = [];
  advanceJoin();
  render();
}

// --- trick logic ------------------------------------------------------

function nextActiveTurn(currentIndex) {
  const n = state.players.length;
  let next = currentIndex;
  do {
    next = getNextTurn(next, n);
  } while (!state.activePlayers[next]);
  return next;
}

function activePlayerCount() {
  return state.activePlayers.filter(Boolean).length;
}

function finishTrick(nextTrickCards, nextHands) {
  const winnerPlay = getTrickWinner(nextTrickCards, state.trumpSuit);
  if (!winnerPlay) return;

  const winnerIndex = winnerPlay.playerIndex;

  state.tricks = state.tricks.map((value, index) => (index === winnerIndex ? value + 1 : value));
  state.dealTricks = state.dealTricks.map((value, index) => (index === winnerIndex ? value + 1 : value));
  state.scores = state.scores.map((value, index) => (index === winnerIndex ? Math.max(0, value - 1) : value));

  const gameWinner = getGameWinnerByScore(state.scores);

  if (gameWinner !== null) {
    state.winner = state.players[gameWinner];
    state.message = `${state.players[gameWinner]} 15 оноогоо дуусгаж яллаа.`;
    return;
  }

  const handsExhausted = nextHands.every((hand) => hand.length === 0);

  if (handsExhausted) {
    // Тараалт (5 ажил) бүрэн дуусав. Оноо биш "идсэн" (ажил авсан эсэх) чухал:
    // энэ тараалтад ОРСОН боловч НЭГ Ч АЖИЛ АВААГҮЙ хүн бүрд +5 оноо (шийтгэл)
    // нэмэгдэнэ - оноо бага байх тусам сайн тул энэ бол сөрөг үр дагавартай.
    let penaltyMessage = '';
    state.scores = state.scores.map((value, index) => {
      if (state.activePlayers[index] && state.dealTricks[index] === 0) {
        penaltyMessage += ` ${state.players[index]} энэ тараалтад нэг ч ажил аваагүй тул +5 оноотой боллоо.`;
        return value + 5;
      }
      return value;
    });

    // Хэн ч 15 оноогоо 0 болгоогүй тул тоглоом энд дуусахгүй - оноог хэвээр
    // авч үлдээгээд шинэ тараалт хийнэ. Сүүлийн ажлыг хийсэн (хожсон) хүн
    // БИШ, харин түүний дараагийн ээлжтэй хүн шинэ тараалтыг эхлүүлж,
    // дэлгэсэн хөзрийг хамгийн эхэнд авах эсэхээ шийднэ.
    const nextDealStarter = getNextTurn(winnerIndex, state.players.length);
    startNewDeal(
      nextDealStarter,
      `${state.players[winnerIndex]} ажил хийлээ. Энэ тараалтын хөзөр дууслаа.${penaltyMessage}`
    );
    return;
  }

  // Ажил хийсэн хүн өөрөө дараагийн ажлыг эхлүүлж дурын хөзрөө хаяна.
  state.trickCards = [];
  state.selected = null;
  state.turn = winnerIndex;
  state.message = `${state.players[winnerIndex]} ажил хийлээ.`;
}

// --- дэлгэсэн (жороо) хөзрийг авах эсэх - тараалт бүрийн хамгийн эхэнд
// (хөзөр солихоос ӨМНӨ, бүгд яг 5 хөзөртэй байх энэ мөчид), яг 1 л удаа --

function acceptRevealed() {
  if (!state.revealedCard || !state.decisionPending) return;

  state.hands = state.hands.map((hand, index) =>
    index === state.decisionPlayer ? sortCards([...hand, state.revealedCard], state.trumpSuit) : hand
  );

  const acceptedPlayer = state.decisionPlayer;
  state.message = `${state.players[acceptedPlayer]} дэлгэсэн ${getCardLabel(state.revealedCard)} (газрын мод, давуутай хөзөр) хөзрийг авлаа. Гараа 5-даа буцаахын тулд 1 хөзрөө сонгож тавина уу.`;

  state.revealedCard = null;
  state.decisionPending = false;
  state.postAcceptDiscardPending = true;
  state.postAcceptDiscardPlayer = acceptedPlayer;

  render();
}

function declineRevealed() {
  if (!state.decisionPending) return;

  state.message = `${state.players[state.decisionPlayer]} дэлгэсэн хөзрийг авахгүй гэж шийдлээ.`;
  state.decisionPending = false;

  afterRevealedDecisionResolved();
}

function confirmPostAcceptDiscard(cardId) {
  if (!state.postAcceptDiscardPending) return;
  const idx = state.postAcceptDiscardPlayer;
  const hand = state.hands[idx];
  const discard = hand.find((c) => c.id === cardId);
  if (!discard) return;

  state.hands = state.hands.map((h, i) => (i === idx ? h.filter((c) => c.id !== cardId) : h));
  // Энэ хөзөр тухайн тараалтад дахин ашиглагдахгүй тул нөөц (state.stock)
  // рүү БУЦААХГҮЙ - тусдаа "хэрэглэгдэхгүй" тоог хадгалахад л ашиглана.
  state.deadCards = state.deadCards.concat([discard]);

  state.message = `${state.players[idx]} ${getCardLabel(discard)} хөзрөө буцаалаа.`;

  state.postAcceptDiscardPending = false;
  state.postAcceptDiscardPlayer = null;

  afterRevealedDecisionResolved();
}

function afterRevealedDecisionResolved() {
  // Дэлгэсэн (trump) хөзрийн шийдвэр гарсны дараа "тоглолтонд орох эсэх"
  // үе эхэлнэ - эхлүүлэгчийн ДАРААГИЙН хүнээс эхэлж, эхлүүлэгч сүүлд орно.
  state.decisionPlayer = null;
  state.message = `${state.message} Тоглолтонд орох эсэхийг шийдэж эхэлж байна.`;
  startJoinRound(getNextTurn(state.dealStarter, state.players.length));
  render();
}

// --- trick play actions ------------------------------------------------

// "Pass" (юу ч хийхгүй алгасах) байхгүй болсон - оронд нь тухайн ээлжийн
// хүн хөзрөө сонголгүйгээр (санамсаргүй) нөөцтэй 1ш сольж, ажлаа алгасна.
function autoSwap() {
  if (state.exchangeStage || state.decisionPending || state.postAcceptDiscardPending || state.joinStage === 'ask') {
    state.message = 'Эхлээд одоогийн шийдвэрээ гүйцээнэ үү.';
    render();
    return;
  }

  const currentPlayer = state.players[state.turn];
  const hand = state.hands[state.turn];

  if (state.stock.length < 1 || hand.length < 1) {
    state.message = `${currentPlayer} солих хөзөр байхгүй тул зүгээр алгаслаа.`;
    state.turn = nextActiveTurn(state.turn);
    state.selected = null;
    render();
    return;
  }

  const randIndex = Math.floor(Math.random() * hand.length);
  const discarded = hand[randIndex];
  const remainHand = hand.filter((_, i) => i !== randIndex);
  const drawn = state.stock[0];

  state.hands = state.hands.map((h, i) =>
    i === state.turn ? sortCards([...remainHand, drawn], state.trumpSuit) : h
  );
  state.stock = state.stock.slice(1).concat([discarded]);

  state.turn = nextActiveTurn(state.turn);
  state.selected = null;
  state.message = `${currentPlayer} хөзрөө сонголгүйгээр 1ш сольж, ажлаа алгаслаа.`;

  render();
}

function play() {
  if (state.exchangeStage || state.decisionPending || state.postAcceptDiscardPending) {
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

  if (nextTrickCards.length === activePlayerCount()) {
    finishTrick(nextTrickCards, nextHands);
  } else {
    state.turn = nextActiveTurn(state.turn);
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

function scoreBoardHtml(scoreMap, trickMap, activeMap) {
  return `<div class="grid">${Object.entries(scoreMap)
    .map(
      ([name, score]) =>
        `<div class="player"><span>${name}${
          activeMap && activeMap[name] === false ? ' <small>(ороогүй)</small>' : ''
        }</span><span class="score-pair"><small>авсан ажил: ${trickMap[name] ?? 0}</small><b>${score}</b></span></div>`
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
    <p class="muted">Энэ ажлын гарсан хөзөр: ${state.trickCards.length}</p>
  </div>`;
}

function joinBoxHtml() {
  if (state.joinStage !== 'ask' || state.joinAsking === null) return '';
  const idx = state.joinAsking;
  return `<div class="decision-box">
    <div>
      <h2>Энэ тараалтад ТОГЛОХ уу?</h2>
      <p><b>${state.players[idx]}</b> энэ тараалтад тоглох уу, эсвэл түр гарах уу?</p>
    </div>
    <div class="row">
      <button class="button" id="join-yes-btn">Тийм, тоглоно</button>
      <button class="button secondary" id="join-no-btn">Үгүй, гарлаа</button>
    </div>
  </div>`;
}

function exchangeBoxHtml() {
  const idx = state.exchangeAsking;
  if (idx === null) return '';

  if (state.exchangeStage === 'ask') {
    return `<div class="decision-box">
      <div>
        <h2>Хөзөр СОЛИХ (тоглолтонд орсон эсэхтэй хамааралгүй)</h2>
        <p><b>${state.players[idx]}</b> гарынхаа хөзрийг нууц нөөцөөр СОЛИХ уу?</p>
      </div>
      <div class="row">
        <button class="button" id="exchange-yes-btn">Тийм, солино</button>
        <button class="button secondary" id="exchange-no-btn">Үгүй, солихгүй</button>
      </div>
    </div>`;
  }

  if (state.exchangeStage === 'select') {
    return `<div class="decision-box" style="flex-direction:column;align-items:stretch">
      <div>
        <h2>Хөзөр солих</h2>
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
  const activeMap =
    state.joinQueue.length && state.joinIndex >= state.joinQueue.length
      ? Object.fromEntries(state.players.map((player, index) => [player, state.activePlayers[index]]))
      : null;

  // Хэний гарыг харуулах вэ: ердийн тоглолт бол state.turn, хөзөр солих /
  // дэлгэсэн хөзөр авах эсэх / буцаах шийдвэр гаргаж буй үед тухайн хүний гар.
  const activePlayerIndex = state.postAcceptDiscardPending
    ? state.postAcceptDiscardPlayer
    : state.joinStage === 'ask'
    ? state.joinAsking
    : state.exchangeAsking !== null
    ? state.exchangeAsking
    : state.decisionPending
    ? state.decisionPlayer
    : state.turn;
  const hand = state.hands[activePlayerIndex] ?? [];
  const isExchangeSelectMode = state.exchangeStage === 'select';
  const isPostAcceptDiscardMode = state.postAcceptDiscardPending;
  const interactionBlocked =
    Boolean(state.exchangeStage) || state.decisionPending || state.postAcceptDiscardPending || state.joinStage === 'ask';

  root.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Муушиг тоглоом</h1>
        <p class="muted">32 хөзөр, 5 тоглогч, хүн бүрт 5 хөзөр. Оноо 15-аас буурна.</p>
      </div>
      <a class="button secondary" href="lobby.html">Гарах</a>
    </div>

    <div class="success">Одоогийн ээлж: <b>${state.players[state.turn] ?? ''}</b></div>

    <div class="rule-panel">
      <b>Газрын мод:</b> ${suitSymbol(state.trumpSuit)} ${suitName(state.trumpSuit)}
      <span> · </span>
      <b>Дэлгэсэн хөзөр:</b> ${state.revealedCard ? getCardLabel(state.revealedCard) : 'байхгүй'}
      <span> · </span>
      <b>Нууц нөөц:</b> ${state.stock.length}
    </div>

    ${joinBoxHtml()}

    ${
      state.decisionPending && state.revealedCard
        ? `<div class="decision-box">
            <div>
              <h2>Шийдвэр</h2>
              <p><b>${state.players[state.decisionPlayer]}</b> дэлгэсэн хөзрийг авах эсэхээ шийднэ.</p>
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
        ${scoreBoardHtml(scoreMap, trickMap, activeMap)}
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
      <button class="button secondary" id="pass-btn" ${interactionBlocked ? 'disabled' : ''}>Санамсаргүй солих</button>
    </div>
  `;

  const acceptBtn = document.getElementById('accept-btn');
  if (acceptBtn) acceptBtn.addEventListener('click', acceptRevealed);

  const declineBtn = document.getElementById('decline-btn');
  if (declineBtn) declineBtn.addEventListener('click', declineRevealed);

  const joinYesBtn = document.getElementById('join-yes-btn');
  if (joinYesBtn) joinYesBtn.addEventListener('click', joinYes);

  const joinNoBtn = document.getElementById('join-no-btn');
  if (joinNoBtn) joinNoBtn.addEventListener('click', joinNo);

  const exchangeYesBtn = document.getElementById('exchange-yes-btn');
  if (exchangeYesBtn) exchangeYesBtn.addEventListener('click', joinExchange);

  const exchangeNoBtn = document.getElementById('exchange-no-btn');
  if (exchangeNoBtn) exchangeNoBtn.addEventListener('click', declineExchange);

  const exchangeConfirmBtn = document.getElementById('exchange-confirm-btn');
  if (exchangeConfirmBtn) exchangeConfirmBtn.addEventListener('click', confirmExchange);

  document.getElementById('play-btn').addEventListener('click', play);
  document.getElementById('pass-btn').addEventListener('click', autoSwap);

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
