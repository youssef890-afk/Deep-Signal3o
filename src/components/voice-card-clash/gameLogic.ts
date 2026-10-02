export type Team = 'alpha' | 'beta';
export type Suit = '♠' | '♥' | '♦' | '♣';
export type GamePhase = 'lobby' | 'bidding' | 'playing' | 'round_end' | 'match_end';

export interface ClashCard {
  id: string;
  suit: Suit;
  rank: number;
  label: string;
}

export interface PlayedCard {
  playerId: string;
  seat: number;
  team: Team;
  card: ClashCard;
}

export interface ClashState {
  phase: GamePhase;
  hostId: string;
  round: number;
  trick: number;
  turnSeat: number;
  turnStartedAt: number;
  seatUserIds: string[];
  hands: Record<string, ClashCard[]>;
  bids: Record<string, number>;
  playedCards: PlayedCard[];
  tricksWon: Record<Team, number>;
  score: Record<Team, number>;
  lastTrickWinner: Team | null;
  lastRoundBids: Record<Team, number> | null;
  lastRoundTricks: Record<Team, number> | null;
}

export type ClashAction =
  | { type: 'bid'; value: number }
  | { type: 'play'; cardId: string };

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const labels: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export function createLobbyState(hostId: string): ClashState {
  return {
    phase: 'lobby',
    hostId,
    round: 0,
    trick: 0,
    turnSeat: 0,
    turnStartedAt: Date.now(),
    seatUserIds: [],
    hands: {},
    bids: {},
    playedCards: [],
    tricksWon: { alpha: 0, beta: 0 },
    score: { alpha: 0, beta: 0 },
    lastTrickWinner: null,
    lastRoundBids: null,
    lastRoundTricks: null,
  };
}

export function startClashRound(state: ClashState, seatUserIds: string[]): ClashState {
  if (seatUserIds.length !== 8 || new Set(seatUserIds).size !== 8) return state;

  const deck: ClashCard[] = suits.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => {
      const rank = index + 2;
      return { id: `${suit}-${rank}`, suit, rank, label: labels[rank] ?? String(rank) };
    })
  );

  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  const hands = Object.fromEntries(seatUserIds.map((id) => [id, [] as ClashCard[]]));
  for (let cardIndex = 0; cardIndex < 3; cardIndex++) {
    for (const userId of seatUserIds) hands[userId].push(deck.pop()!);
  }

  return {
    ...state,
    phase: 'bidding',
    round: state.round + 1,
    trick: 0,
    turnSeat: 0,
    turnStartedAt: Date.now(),
    seatUserIds: [...seatUserIds],
    hands,
    bids: {},
    playedCards: [],
    tricksWon: { alpha: 0, beta: 0 },
    lastTrickWinner: null,
    lastRoundBids: null,
    lastRoundTricks: null,
  };
}

export function applyClashAction(
  state: ClashState,
  actorId: string,
  action: ClashAction
): ClashState | null {
  if (state.phase !== 'bidding' && state.phase !== 'playing') return null;
  if (state.seatUserIds[state.turnSeat] !== actorId) return null;

  const seat = state.turnSeat;
  const team: Team = seat < 4 ? 'alpha' : 'beta';
  const nextSeat = (seat + 1) % 8;
  const now = Date.now();

  if (state.phase === 'bidding') {
    if (action.type !== 'bid' || !Number.isInteger(action.value) || action.value < 0 || action.value > 3) return null;
    const bids = { ...state.bids, [actorId]: action.value };
    const allBidsPlaced = state.seatUserIds.every((id) => bids[id] !== undefined);
    return {
      ...state,
      phase: allBidsPlaced ? 'playing' : 'bidding',
      bids,
      turnSeat: allBidsPlaced ? 0 : nextSeat,
      turnStartedAt: now,
    };
  }

  if (action.type !== 'play') return null;
  const hand = state.hands[actorId] ?? [];
  const card = hand.find((item) => item.id === action.cardId);
  if (!card) return null;

  const hands = { ...state.hands, [actorId]: hand.filter((item) => item.id !== card.id) };
  const playedCards = [...state.playedCards, { playerId: actorId, seat, team, card }];
  if (playedCards.length < 8) {
    return { ...state, hands, playedCards, turnSeat: nextSeat, turnStartedAt: now };
  }

  const leadSuit = playedCards[0].card.suit;
  const winner = playedCards
    .filter((played) => played.card.suit === leadSuit)
    .reduce((best, played) => played.card.rank > best.card.rank ? played : best);
  const tricksWon = { ...state.tricksWon, [winner.team]: state.tricksWon[winner.team] + 1 };
  const trick = state.trick + 1;

  if (trick < 3) {
    return {
      ...state,
      hands,
      playedCards: [],
      tricksWon,
      trick,
      turnSeat: winner.seat,
      turnStartedAt: now,
      lastTrickWinner: winner.team,
    };
  }

  const roundBids: Record<Team, number> = { alpha: 0, beta: 0 };
  state.seatUserIds.forEach((userId, index) => {
    roundBids[index < 4 ? 'alpha' : 'beta'] += state.bids[userId] ?? 0;
  });
  const score = {
    alpha: state.score.alpha + (tricksWon.alpha >= roundBids.alpha ? 10 + tricksWon.alpha : tricksWon.alpha),
    beta: state.score.beta + (tricksWon.beta >= roundBids.beta ? 10 + tricksWon.beta : tricksWon.beta),
  };

  return {
    ...state,
    phase: score.alpha >= 50 || score.beta >= 50 ? 'match_end' : 'round_end',
    hands,
    playedCards,
    tricksWon,
    score,
    trick,
    turnSeat: winner.seat,
    turnStartedAt: now,
    lastTrickWinner: winner.team,
    lastRoundBids: roundBids,
    lastRoundTricks: tricksWon,
  };
}