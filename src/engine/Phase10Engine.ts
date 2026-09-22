import { Card, CardColor, GameState, LaidPhasePart, Player } from '../types/game';
import { PhaseValidator, PHASE_REQUIREMENTS } from './PhaseValidator';

export class Phase10Engine {
  /**
   * Generates a standard official 108-card Phase 10 deck with globally unique card IDs per round.
   */
  public static createDeck(roundNumber: number = 1): Card[] {
    const deck: Card[] = [];
    const colors: CardColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

    let cardSeq = 1;
    const salt = Math.random().toString(36).substring(2, 7);
    const prefix = `r${roundNumber}_${salt}_`;

    // Number cards: 1-12 in 4 colors, 2 of each (96 cards)
    colors.forEach((color) => {
      for (let num = 1; num <= 12; num++) {
        deck.push({ id: `${prefix}c_${cardSeq++}`, type: 'NUMBER', color, value: num });
        deck.push({ id: `${prefix}c_${cardSeq++}`, type: 'NUMBER', color, value: num });
      }
    });

    // 8 Wild Cards
    for (let i = 0; i < 8; i++) {
      deck.push({ id: `${prefix}c_${cardSeq++}`, type: 'WILD', color: 'WILD', value: 0 });
    }

    // 4 Skip Cards
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `${prefix}c_${cardSeq++}`, type: 'SKIP', color: 'SKIP', value: 0 });
    }

    return this.shuffle(deck);
  }

  /**
   * Cryptographically / Uniformly shuffles an array of cards (Fisher-Yates).
   */
  public static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Initializes a brand new round for existing players.
   */
  public static startRound(
    players: Player[],
    roundNumber: number,
    roomId: string,
    roomName: string,
    startingPlayerIndex: number = 0
  ): { state: GameState; drawPile: Card[] } {
    let deck = this.createDeck(roundNumber);

    // Deal 10 cards to each player
    const updatedPlayers: Player[] = players.map((p) => {
      const hand = deck.splice(0, 10);
      return {
        ...p,
        hand,
        hasLaidPhaseThisRound: false,
        laidPhases: [],
        roundScore: 0,
        isSkipped: false
      };
    });

    // Flip top card to start discard pile (if Wild or Skip, flip until a number card appears)
    let firstDiscard = deck.pop()!;
    while (firstDiscard.type !== 'NUMBER' && deck.length > 0) {
      deck.unshift(firstDiscard);
      firstDiscard = deck.pop()!;
    }

    const state: GameState = {
      roomId,
      roomName,
      players: updatedPlayers,
      activePlayerIndex: startingPlayerIndex % updatedPlayers.length,
      turnStage: 'DRAW',
      roundNumber,
      drawPileCount: deck.length,
      discardPile: [firstDiscard],
      turnTimerSeconds: 30,
      isStarted: true,
      drawnFromDiscardCardId: undefined,
      lastActionMessage: {
        en: `Round ${roundNumber} Started! Turn: ${updatedPlayers[startingPlayerIndex % updatedPlayers.length].username}`,
        ar: `بدأت الجولة ${roundNumber}! دور: ${updatedPlayers[startingPlayerIndex % updatedPlayers.length].username}`
      }
    };

    return { state, drawPile: deck };
  }

  /**
   * Handles player drawing a card (from DRAW pile or DISCARD pile).
   */
  public static handleDraw(
    state: GameState,
    drawPile: Card[],
    source: 'DRAW' | 'DISCARD'
  ): { newState: GameState; newDrawPile: Card[]; drawnCard: Card } {
    const activePlayer = state.players[state.activePlayerIndex];
    let card: Card;
    let newDrawPile = [...drawPile];
    let newDiscardPile = [...state.discardPile];

    if (source === 'DISCARD') {
      if (newDiscardPile.length === 0) throw new Error('Discard pile is empty');
      card = newDiscardPile.pop()!;
    } else {
      if (newDrawPile.length === 0) {
        // Recycle discard pile (leave top card)
        if (newDiscardPile.length <= 1) {
          throw new Error('No cards left to draw');
        }
        const top = newDiscardPile.pop()!;
        newDrawPile = this.shuffle(newDiscardPile);
        newDiscardPile = [top];
      }
      card = newDrawPile.pop()!;
    }

    const updatedPlayers = state.players.map((p, idx) => {
      if (idx !== state.activePlayerIndex) return p;
      return {
        ...p,
        hand: [...p.hand, card]
      };
    });

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      drawPileCount: newDrawPile.length,
      discardPile: newDiscardPile,
      turnStage: 'PLAY_OR_DISCARD',
      drawnFromDiscardCardId: source === 'DISCARD' ? card.id : undefined,
      lastActionMessage: {
        en: `${activePlayer.username} drew a card from ${source === 'DRAW' ? 'Draw Pile' : 'Discard Pile'}`,
        ar: `${activePlayer.username} سحب بطاقة من ${source === 'DRAW' ? 'كومة السحب' : 'كومة الإرمي'}`
      }
    };

    return { newState, newDrawPile, drawnCard: card };
  }

  /**
   * Handles laying down the player's phase onto the table.
   */
  public static handleLayPhase(
    state: GameState,
    groups: Card[][]
  ): { newState: GameState; success: boolean; errorEn?: string; errorAr?: string } {
    const activePlayer = state.players[state.activePlayerIndex];

    if (activePlayer.hasLaidPhaseThisRound) {
      return {
        newState: state,
        success: false,
        errorEn: 'You have already completed your phase this round!',
        errorAr: 'لقد أكملت مرحلتك بالفعل في هذه الجولة!'
      };
    }

    const validation = PhaseValidator.validatePhaseSubmission(activePlayer.currentPhase, groups);
    if (!validation.valid || !validation.laidParts) {
      return {
        newState: state,
        success: false,
        errorEn: validation.errorEn,
        errorAr: validation.errorAr
      };
    }

    // Collect IDs of cards being laid
    const usedCardIds = new Set<string>();
    groups.forEach((g) => g.forEach((c) => usedCardIds.add(c.id)));

    // Verify player actually has all these cards
    const playerCardIds = new Set(activePlayer.hand.map((c) => c.id));
    for (const id of usedCardIds) {
      if (!playerCardIds.has(id)) {
        return {
          newState: state,
          success: false,
          errorEn: 'Cards not found in your hand',
          errorAr: 'بعض البطاقات غير موجودة في يدك'
        };
      }
    }

    // Remove laid cards from player hand
    const newHand = activePlayer.hand.filter((c) => !usedCardIds.has(c.id));

    const updatedPlayers = state.players.map((p, idx) => {
      if (idx !== state.activePlayerIndex) return p;
      return {
        ...p,
        hand: newHand,
        hasLaidPhaseThisRound: true,
        laidPhases: validation.laidParts!
      };
    });

    const phaseInfo = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === activePlayer.currentPhase);

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      lastActionMessage: {
        en: `🎉 ${activePlayer.username} successfully laid Phase ${activePlayer.currentPhase}!`,
        ar: `🎉 ${activePlayer.username} وضع المرحلة ${activePlayer.currentPhase} بنجاح!`
      }
    };

    return { newState, success: true };
  }

  /**
   * Handles hitting (adding) a card from hand onto an existing laid phase on the table.
   */
  public static handleHitPhase(
    state: GameState,
    cardId: string,
    targetPlayerId: string,
    targetPartIndex: number
  ): { newState: GameState; success: boolean; errorEn?: string; errorAr?: string } {
    const activePlayer = state.players[state.activePlayerIndex];

    if (!activePlayer.hasLaidPhaseThisRound) {
      return {
        newState: state,
        success: false,
        errorEn: 'You must lay down your own phase before hitting on other cards!',
        errorAr: 'يجب أن تضع مرحلتك أولاً قبل اللعب على بطاقات الطاولة!'
      };
    }

    const card = activePlayer.hand.find((c) => c.id === cardId);
    if (!card) {
      return { newState: state, success: false, errorEn: 'Card not found in hand', errorAr: 'البطاقة غير موجودة في يدك' };
    }

    const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer || !targetPlayer.hasLaidPhaseThisRound || !targetPlayer.laidPhases[targetPartIndex]) {
      return { newState: state, success: false, errorEn: 'Target phase not found', errorAr: 'المرحلة المستهدفة غير موجودة' };
    }

    const targetPart = targetPlayer.laidPhases[targetPartIndex];
    const hitCheck = PhaseValidator.canHitOnPhase(card, targetPart);

    if (!hitCheck.canHit || !hitCheck.newCards) {
      return {
        newState: state,
        success: false,
        errorEn: 'This card cannot be played on that phase',
        errorAr: 'لا يمكن لعب هذه البطاقة على هذه المجموعة'
      };
    }

    // Apply Hit
    const updatedPlayers = state.players.map((p) => {
      let playerHand = p.hand;
      let playerLaid = p.laidPhases;

      if (p.id === activePlayer.id) {
        playerHand = p.hand.filter((c) => c.id !== cardId);
      }

      if (p.id === targetPlayerId) {
        playerLaid = p.laidPhases.map((part, pIdx) => {
          if (pIdx !== targetPartIndex) return part;
          return {
            ...part,
            cards: hitCheck.newCards!
          };
        });
      }

      return {
        ...p,
        hand: playerHand,
        laidPhases: playerLaid
      };
    });

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      lastActionMessage: {
        en: `${activePlayer.username} hit a card on ${targetPlayer.username}'s phase!`,
        ar: `${activePlayer.username} أضاف بطاقة على مرحلة ${targetPlayer.username}!`
      }
    };

    return { newState, success: true };
  }

  /**
   * Handles discarding a card to end turn, check round completion, and advance active player.
   */
  public static handleDiscard(
    state: GameState,
    cardId: string,
    targetSkipPlayerId?: string
  ): { newState: GameState; isRoundOver: boolean; isGameOver: boolean; winnerId?: string; errorEn?: string; errorAr?: string } {
    const activePlayer = state.players[state.activePlayerIndex];
    if (!activePlayer || !activePlayer.hand || activePlayer.hand.length === 0) {
      return { newState: state, isRoundOver: false, isGameOver: false };
    }

    // Rule: Cannot discard the exact card that was drawn from the Discard Pile on this turn!
    if (cardId && state.drawnFromDiscardCardId && cardId === state.drawnFromDiscardCardId) {
      return {
        newState: state,
        isRoundOver: false,
        isGameOver: false,
        errorEn: 'Rule: You cannot discard the card you just drew from the Discard Pile on the same turn!',
        errorAr: 'قانون اللعبة: لا يجوز رمي البطاقة التي سحبتها للتو من كومة الإرمي في نفس الدور!'
      };
    }

    let cardToDiscard = activePlayer.hand.find((c) => c.id === cardId);
    if (cardToDiscard && state.drawnFromDiscardCardId && cardToDiscard.id === state.drawnFromDiscardCardId) {
      return {
        newState: state,
        isRoundOver: false,
        isGameOver: false,
        errorEn: 'Rule: You cannot discard the card you just drew from the Discard Pile on the same turn!',
        errorAr: 'قانون اللعبة: لا يجوز رمي البطاقة التي سحبتها للتو من كومة الإرمي في نفس الدور!'
      };
    }

    if (!cardToDiscard) {
      // Fallback: pick the first card in hand that is NOT the drawnFromDiscardCard
      cardToDiscard = activePlayer.hand.find((c) => c.id !== state.drawnFromDiscardCardId);
      if (!cardToDiscard && activePlayer.hand.length > 0) {
        cardToDiscard = activePlayer.hand[0];
      }
    }

    if (!cardToDiscard) {
      return { newState: state, isRoundOver: false, isGameOver: false };
    }

    // Remove discarded card from active player's hand
    let updatedHand = activePlayer.hand.filter((c) => c.id !== cardToDiscard.id);

    // If Skip card played, mark target player as skipped
    let updatedPlayers = state.players.map((p, idx) => {
      if (idx === state.activePlayerIndex) {
        return { ...p, hand: updatedHand };
      }
      if (cardToDiscard.type === 'SKIP' && targetSkipPlayerId && p.id === targetSkipPlayerId) {
        return { ...p, isSkipped: true };
      }
      return p;
    });

    const newDiscardPile = [...state.discardPile, cardToDiscard];

    // Check if Active Player has Emptied Hand -> ROUND OVER!
    if (updatedHand.length === 0) {
      return this.endRound(state, updatedPlayers, newDiscardPile, activePlayer.id);
    }

    // Advance to next active player (handle skipped players)
    let nextIndex = (state.activePlayerIndex + 1) % state.players.length;
    let skippedPlayerName: string | undefined;

    // Check if next player is marked as skipped
    if (updatedPlayers[nextIndex].isSkipped) {
      skippedPlayerName = updatedPlayers[nextIndex].username;
      updatedPlayers = updatedPlayers.map((p, idx) => (idx === nextIndex ? { ...p, isSkipped: false } : p));
      nextIndex = (nextIndex + 1) % state.players.length;
    }

    const nextPlayer = updatedPlayers[nextIndex];

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      discardPile: newDiscardPile,
      activePlayerIndex: nextIndex,
      turnStage: 'DRAW',
      drawnFromDiscardCardId: undefined,
      lastActionMessage: {
        en: skippedPlayerName
          ? `${activePlayer.username} discarded and skipped ${skippedPlayerName}! Turn: ${nextPlayer.username}`
          : `${activePlayer.username} discarded. Turn: ${nextPlayer.username}`,
        ar: skippedPlayerName
          ? `${activePlayer.username} رمى بطاقة وتخطى ${skippedPlayerName}! دور: ${nextPlayer.username}`
          : `${activePlayer.username} رمى بطاقة. دور: ${nextPlayer.username}`
      }
    };

    return { newState, isRoundOver: false, isGameOver: false };
  }

  /**
   * Finalizes round scores and advances players who completed their phase.
   */
  private static endRound(
    state: GameState,
    players: Player[],
    discardPile: Card[],
    roundWinnerId: string
  ): { newState: GameState; isRoundOver: boolean; isGameOver: boolean; winnerId?: string } {
    const roundWinner = players.find((p) => p.id === roundWinnerId)!;

    // Calculate penalty points for each player and advance phases
    const scoredPlayers: Player[] = players.map((p) => {
      const penalty = PhaseValidator.calculateHandScore(p.hand);
      const nextPhase = p.hasLaidPhaseThisRound ? p.currentPhase + 1 : p.currentPhase;

      return {
        ...p,
        score: p.score + penalty,
        roundScore: penalty,
        currentPhase: Math.min(11, nextPhase) // 11 means completed all 10 phases!
      };
    });

    // Check Game Winner: Any player who completed Phase 10 (now at Phase 11)
    const finishers = scoredPlayers.filter((p) => p.currentPhase > 10);
    let isGameOver = false;
    let winnerId: string | undefined;

    if (finishers.length > 0) {
      isGameOver = true;
      // Winner is the finisher with the LOWEST score
      finishers.sort((a, b) => a.score - b.score);
      winnerId = finishers[0].id;
    }

    const winner = isGameOver ? scoredPlayers.find((p) => p.id === winnerId) : undefined;

    const newState: GameState = {
      ...state,
      players: scoredPlayers,
      discardPile,
      turnStage: isGameOver ? 'GAME_OVER' : 'ROUND_OVER',
      drawnFromDiscardCardId: undefined,
      roundWinnerId,
      winnerId,
      lastActionMessage: {
        en: isGameOver
          ? `🏆 GAME OVER! ${winner?.username} WINS THE MATCH!`
          : `🎉 ${roundWinner.username} went out! Round ${state.roundNumber} is over!`,
        ar: isGameOver
          ? `🏆 انتهت اللعبة! ${winner?.username} فاز بالمباراة!`
          : `🎉 ${roundWinner.username} أنهى أوراقه! انتهت الجولة ${state.roundNumber}!`
      }
    };

    return { newState, isRoundOver: true, isGameOver, winnerId };
  }
}
