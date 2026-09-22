export type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'WILD' | 'SKIP';
export type CardType = 'NUMBER' | 'WILD' | 'SKIP';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number; // 1-12 for NUMBER, 0 for WILD/SKIP
}

export type PhaseType =
  | 'SETS'
  | 'RUNS'
  | 'SET_AND_RUN'
  | 'COLOR_SET'
  | 'TWO_RUNS';

export interface PhaseRequirement {
  phaseNumber: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  // Specifications for automatic validation
  parts: Array<{
    type: 'SET' | 'RUN' | 'COLOR';
    count: number; // e.g. 3 cards in set, 4 cards in run, 7 cards in color
  }>;
}

export interface LaidPhasePart {
  type: 'SET' | 'RUN' | 'COLOR';
  cards: Card[];
  targetValue?: number; // For sets, the number being matched
  targetColor?: CardColor; // For color phases, the color being matched
}

export interface Player {
  id: string;
  username: string;
  avatar: string;
  avatarColor: string;
  isHost: boolean;
  isBot: boolean;
  botDifficulty?: 'EASY' | 'MEDIUM' | 'MASTER';
  hand: Card[];
  currentPhase: number; // 1 to 10
  hasLaidPhaseThisRound: boolean;
  laidPhases: LaidPhasePart[];
  score: number; // Total penalty points across rounds
  roundScore: number;
  isSkipped: boolean;
  connected: boolean;
}

export type TurnStage = 'DRAW' | 'PLAY_OR_DISCARD' | 'ROUND_OVER' | 'GAME_OVER';

export interface GameState {
  roomId: string;
  roomName: string;
  players: Player[];
  activePlayerIndex: number;
  turnStage: TurnStage;
  roundNumber: number;
  drawPileCount: number;
  discardPile: Card[];
  turnTimerSeconds: number;
  lastActionMessage?: {
    en: string;
    ar: string;
  };
  winnerId?: string;
  isStarted: boolean;
  roundWinnerId?: string;
  drawnFromDiscardCardId?: string;
}

export interface RoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isStarted: boolean;
}

export interface EmojiReaction {
  id: string;
  playerId: string;
  emoji: string;
  timestamp: number;
}
