export function canPlayCard(card, hand, trickCards) {
  if (trickCards.length === 0) return { ok: true };
  const leadSuit = trickCards[0].card.suit;
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit && card.suit !== leadSuit) {
    return { ok: false, reason: `Эхний мод ${leadSuit}. Танд тэр мод байгаа тул заавал ижил мод дагана.` };
  }
  return { ok: true };
}

export function compareCards(a, b, leadSuit, trumpSuit) {
  const aTrump = a.suit === trumpSuit;
  const bTrump = b.suit === trumpSuit;

  if (aTrump && !bTrump) return 1;
  if (!aTrump && bTrump) return -1;

  if (a.suit === b.suit) return a.value - b.value;

  if (a.suit === leadSuit && b.suit !== leadSuit) return 1;
  if (a.suit !== leadSuit && b.suit === leadSuit) return -1;

  return 0;
}

export function getTrickWinner(trickCards, trumpSuit) {
  if (trickCards.length === 0) return null;
  const leadSuit = trickCards[0].card.suit;
  return trickCards.reduce((best, play) => (compareCards(play.card, best.card, leadSuit, trumpSuit) > 0 ? play : best), trickCards[0]);
}

export function getNextTurn(currentIndex, playerCount) {
  return (currentIndex + 1) % playerCount;
}

export function isRoundFinished(hands, stock) {
  return stock.length === 0 && hands.every((hand) => hand.length === 0);
}

export function getGameWinnerByScore(scores) {
  const index = scores.findIndex((score) => score <= 0);
  return index >= 0 ? index : null;
}
