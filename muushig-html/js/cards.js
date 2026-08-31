export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

export const RANK_VALUES = {
  A: 15,
  K: 14,
  Q: 13,
  J: 12,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7
};

export const SUIT_NAMES = {
  spades: 'Гил',
  hearts: 'Зүрх',
  diamonds: 'Дөрвөлжин',
  clubs: 'Цэцэг'
};

export function chooseTrumpSuit() {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}

export function createMuushigDeck(trumpSuit) {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
      value: RANK_VALUES[rank],
      isTrump: suit === trumpSuit
    }))
  );
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealFiveCards(deck, playerCount) {
  if (playerCount < 2 || playerCount > 5) {
    throw new Error('Муушиг 2-5 тоглогчтой байна.');
  }
  const need = playerCount * 5 + 1;
  if (deck.length < need) {
    throw new Error('Хөзөр хүрэлцэхгүй байна.');
  }
  const hands = Array.from({ length: playerCount }, () => []);
  let cursor = 0;
  for (let round = 0; round < 5; round++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(deck[cursor++]);
    }
  }
  const revealedCard = deck[cursor++];
  const stock = deck.slice(cursor);
  return { hands: hands.map((hand) => sortCards(hand)), stock, revealedCard };
}

export function sortCards(cards, trumpSuit) {
  return [...cards].sort((a, b) => {
    const aTrump = trumpSuit ? a.suit === trumpSuit : Boolean(a.isTrump);
    const bTrump = trumpSuit ? b.suit === trumpSuit : Boolean(b.isTrump);
    if (aTrump && !bTrump) return -1;
    if (!aTrump && bTrump) return 1;
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return b.value - a.value;
  });
}

export function suitSymbol(suit) {
  return suit === 'spades' ? '♠' : suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : '♣';
}

export function suitName(suit) {
  return SUIT_NAMES[suit];
}

export function isRedSuit(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

export function getCardLabel(card) {
  return `${suitSymbol(card.suit)}${card.rank}`;
}
