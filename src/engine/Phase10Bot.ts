import { Card, GameState, Player } from '../types/game';
import { PhaseValidator, PHASE_REQUIREMENTS } from './PhaseValidator';

export class Phase10Bot {
  /**
   * Decides whether the Bot should draw from the Draw Pile or Discard Pile.
   */
  public static decideDraw(
    bot: Player,
    topDiscard: Card,
    state: GameState
  ): 'DRAW' | 'DISCARD' {
    if (topDiscard.type === 'SKIP') return 'DRAW'; // Cannot draw Skip from discard

    // If bot hasn't laid phase, check if discard card helps complete it
    if (!bot.hasLaidPhaseThisRound) {
      const testHand = [...bot.hand, topDiscard];
      const possiblePhase = this.findPhaseInHand(testHand, bot.currentPhase);
      if (possiblePhase) {
        return 'DISCARD'; // Discard completes or directly helps phase!
      }

      // Check if discard is a Wild card
      if (topDiscard.type === 'WILD') {
        return 'DISCARD';
      }

      // In medium/master difficulty, check if card matches partial sets/runs
      if (bot.botDifficulty !== 'EASY') {
        const matchesCount = bot.hand.filter((c) => c.value === topDiscard.value && c.type !== 'WILD').length;
        if (matchesCount >= 2) return 'DISCARD';
      }
    } else {
      // If already laid phase, check if top discard can be hit on table
      for (const p of state.players) {
        if (p.hasLaidPhaseThisRound) {
          for (const part of p.laidPhases) {
            if (PhaseValidator.canHitOnPhase(topDiscard, part).canHit) {
              return 'DISCARD';
            }
          }
        }
      }
    }

    return 'DRAW';
  }

  /**
   * Evaluates if the Bot's hand can satisfy their current phase.
   * Returns card groups if found.
   */
  public static findPhaseInHand(hand: Card[], phaseNumber: number): Card[][] | null {
    const req = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === phaseNumber);
    if (!req) return null;

    // Filter out Skips
    const playableCards = hand.filter((c) => c.type !== 'SKIP');
    if (playableCards.length < 3) return null;

    if (req.parts.length === 1) {
      const part = req.parts[0];
      const combinations = this.getCombinations(playableCards, part.count);

      for (const comb of combinations) {
        let valid = false;
        if (part.type === 'SET') valid = PhaseValidator.isValidSet(comb, part.count).valid;
        else if (part.type === 'RUN') valid = PhaseValidator.isValidRun(comb, part.count).valid;
        else if (part.type === 'COLOR') valid = PhaseValidator.isValidColorSet(comb, part.count).valid;

        if (valid) return [comb];
      }
    } else if (req.parts.length === 2) {
      const p1 = req.parts[0];
      const p2 = req.parts[1];

      // Generate all combinations for first part
      const comb1List = this.getCombinations(playableCards, p1.count);

      for (const c1 of comb1List) {
        let valid1 = false;
        if (p1.type === 'SET') valid1 = PhaseValidator.isValidSet(c1, p1.count).valid;
        else if (p1.type === 'RUN') valid1 = PhaseValidator.isValidRun(c1, p1.count).valid;
        else if (p1.type === 'COLOR') valid1 = PhaseValidator.isValidColorSet(c1, p1.count).valid;

        if (!valid1) continue;

        // Remaining cards for second part
        const c1Ids = new Set(c1.map((c) => c.id));
        const remaining = playableCards.filter((c) => !c1Ids.has(c.id));

        const comb2List = this.getCombinations(remaining, p2.count);
        for (const c2 of comb2List) {
          let valid2 = false;
          if (p2.type === 'SET') valid2 = PhaseValidator.isValidSet(c2, p2.count).valid;
          else if (p2.type === 'RUN') valid2 = PhaseValidator.isValidRun(c2, p2.count).valid;
          else if (p2.type === 'COLOR') valid2 = PhaseValidator.isValidColorSet(c2, p2.count).valid;

          if (valid2) {
            // Verify Phase 1 / Phase 7 / Phase 9 / Phase 10 sets don't overlap target values
            if (p1.type === 'SET' && p2.type === 'SET') {
              const set1 = PhaseValidator.isValidSet(c1).targetValue;
              const set2 = PhaseValidator.isValidSet(c2).targetValue;
              if (set1 !== undefined && set2 !== undefined && set1 === set2) {
                // Must be two DIFFERENT numbers for 2 sets!
                continue;
              }
            }
            return [c1, c2];
          }
        }
      }
    }

    return null;
  }

  /**
   * Finds all possible Hits the Bot can make on laid phases.
   */
  public static findHits(
    bot: Player,
    state: GameState
  ): Array<{ cardId: string; targetPlayerId: string; targetPartIndex: number }> {
    if (!bot.hasLaidPhaseThisRound) return [];

    const hits: Array<{ cardId: string; targetPlayerId: string; targetPartIndex: number }> = [];

    for (const card of bot.hand) {
      if (card.type === 'SKIP') continue;

      for (const p of state.players) {
        if (p.hasLaidPhaseThisRound) {
          p.laidPhases.forEach((part, partIdx) => {
            if (PhaseValidator.canHitOnPhase(card, part).canHit) {
              hits.push({ cardId: card.id, targetPlayerId: p.id, targetPartIndex: partIdx });
            }
          });
        }
      }
    }

    return hits;
  }

  /**
   * Chooses the best card to discard, and target player if discarding a Skip card.
   */
  public static chooseDiscard(
    bot: Player,
    state: GameState
  ): { cardId: string; targetSkipPlayerId?: string } {
    const hand = bot.hand;
    if (hand.length === 0) throw new Error('Hand is empty');

    // Filter out the card drawn from the discard pile this turn (rule: cannot discard drawn discard card)
    let eligibleHand = hand;
    if (state.drawnFromDiscardCardId && hand.length > 1) {
      eligibleHand = hand.filter((c) => c.id !== state.drawnFromDiscardCardId);
      if (eligibleHand.length === 0) eligibleHand = hand;
    }

    // 1. If holding a SKIP card, play it against the leader or next player
    const skipCard = eligibleHand.find((c) => c.type === 'SKIP');
    if (skipCard) {
      // Find leading opponent (highest phase or lowest hand count)
      const opponents = state.players.filter((p) => p.id !== bot.id && !p.isSkipped);
      if (opponents.length > 0) {
        opponents.sort((a, b) => {
          if (b.currentPhase !== a.currentPhase) return b.currentPhase - a.currentPhase;
          return a.hand.length - b.hand.length;
        });
        return { cardId: skipCard.id, targetSkipPlayerId: opponents[0].id };
      }
    }

    // 2. Never discard Wilds if possible
    const nonWilds = eligibleHand.filter((c) => c.type !== 'WILD' && c.type !== 'SKIP');
    if (nonWilds.length === 0) {
      // Must discard wild
      return { cardId: eligibleHand[0].id };
    }

    // 3. Count frequencies of card numbers in hand to avoid breaking pairs
    const counts: Record<number, number> = {};
    nonWilds.forEach((c) => {
      counts[c.value] = (counts[c.value] || 0) + 1;
    });

    // Score cards: isolated high value cards are best to discard
    const scoredCards = nonWilds.map((card) => {
      let score = card.value * 2; // Prefer discarding higher values (10, 11, 12) for penalty reduction
      if (counts[card.value] > 1) {
        score -= counts[card.value] * 15; // Protect pairs/triples
      }
      return { card, score };
    });

    scoredCards.sort((a, b) => b.score - a.score);
    return { cardId: scoredCards[0].card.id };
  }

  /**
   * Helper: generates array combinations (k items from array).
   */
  private static getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (array.length < k) return [];

    const head = array[0];
    const tail = array.slice(1);

    const withHead = this.getCombinations(tail, k - 1).map((comb) => [head, ...comb]);
    const withoutHead = this.getCombinations(tail, k);

    return [...withHead, ...withoutHead];
  }
}
