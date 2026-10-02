export function calculateHandPenalty(cards) {
  return cards.reduce((sum, card) => sum + Math.min(card.value, 10), 0);
}

export function calculateFinalScores(hands, winnerId) {
  const scores = {};
  for (const [userId, cards] of Object.entries(hands)) {
    scores[userId] = userId === winnerId ? 50 : -calculateHandPenalty(cards);
  }
  return scores;
}
