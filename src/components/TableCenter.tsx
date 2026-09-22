import React from 'react';
import { Card, GameState } from '../types/game';
import { CardView } from './CardView';
import { useLanguage } from '../i18n/LanguageContext';
import { Sparkles, RefreshCw, Layers } from 'lucide-react';
import { sounds } from '../audio/SoundEffects';

interface TableCenterProps {
  gameState: GameState;
  myPlayerId: string;
  selectedCardId?: string;
  onDraw: (source: 'DRAW' | 'DISCARD') => void;
  onDiscard?: (cardId: string) => void;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  gameState,
  myPlayerId,
  selectedCardId,
  onDraw,
  onDiscard
}) => {
  const { t, isRTL } = useLanguage();

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const isSelectedCardRestricted = !!selectedCardId && selectedCardId === gameState.drawnFromDiscardCardId;
  const canDraw = isMyTurn && gameState.turnStage === 'DRAW';
  const canDiscardOnPile = isMyTurn && gameState.turnStage === 'PLAY_OR_DISCARD' && !!selectedCardId && !isSelectedCardRestricted && !!onDiscard;

  const handleDrawFromPile = () => {
    if (!canDraw) return;
    sounds.playCardDeal();
    sounds.vibrate(30);
    onDraw('DRAW');
  };

  const handleDiscardPileClick = () => {
    if (canDraw) {
      if (topDiscard?.type === 'SKIP') return;
      sounds.playCardDeal();
      sounds.vibrate(30);
      onDraw('DISCARD');
    } else if (canDiscardOnPile && selectedCardId) {
      onDiscard(selectedCardId);
    } else if (isSelectedCardRestricted) {
      sounds.playSkipSound();
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-2 py-1">
      {/* Live Turn & Action Feedback Banner */}
      <div className="w-full max-w-lg flex flex-col items-center justify-center text-center">
        <div
          className={`px-4 py-1.5 rounded-full font-black text-[11px] sm:text-xs tracking-wide shadow-xl border flex items-center gap-2 transition-all ${
            isMyTurn
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-blue-400/80 animate-pulse ring-2 ring-blue-400/40 shadow-blue-500/30'
              : 'glass-panel text-slate-300'
          }`}
        >
          {isMyTurn ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-white drop-shadow-sm">{t.yourTurn}</span>
              <span className="opacity-90 font-normal">
                {gameState.turnStage === 'DRAW' ? `(${t.drawStage})` : `(${t.playStage})`}
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>
                {t.waitingTurn} <strong className="text-white font-black">{activePlayer?.username}</strong>
              </span>
            </>
          )}
        </div>

        {/* Action log message */}
        {gameState.lastActionMessage && (
          <p className="mt-1 text-[10px] sm:text-xs text-slate-300 font-bold truncate max-w-xs sm:max-w-md drop-shadow">
            {isRTL ? gameState.lastActionMessage.ar : gameState.lastActionMessage.en}
          </p>
        )}
      </div>

      {/* Piles Center Area: 3D Casino Table Card Trays */}
      <div className="flex items-center justify-center gap-6 sm:gap-12 py-1">
        {/* Draw Pile (Face Down Stacked Deck) */}
        <div className="flex flex-col items-center gap-1">
          <div
            onClick={handleDrawFromPile}
            className={`relative group transition-all duration-200 ${
              canDraw ? 'cursor-pointer hover:scale-108 active:scale-95' : 'opacity-90'
            }`}
          >
            {/* Multi-layered 3D Card Stack Base */}
            <div className="absolute top-1.5 left-1.5 w-12 h-17 sm:w-16 sm:h-23 md:w-20 md:h-28 rounded-xl bg-slate-900 border border-slate-700 shadow-md"></div>
            <div className="absolute top-0.5 left-0.5 w-12 h-17 sm:w-16 sm:h-23 md:w-20 md:h-28 rounded-xl bg-blue-950 border border-blue-800 shadow-md"></div>

            <div className="relative z-10">
              <CardView faceDown={true} />
            </div>

            {/* Glowing Draw Ring Button when it's your turn */}
            {canDraw && (
              <div className="absolute -inset-2 rounded-2xl bg-cyan-400/40 blur-md animate-pulse z-0 pointer-events-none"></div>
            )}

            {/* Remaining Cards Badge */}
            <div className="absolute -bottom-1 -right-1 z-20 px-2 py-0.5 rounded-full bg-slate-950 border border-blue-500/60 text-[10px] sm:text-xs font-black text-cyan-300 shadow-xl">
              {gameState.drawPileCount}
            </div>
          </div>

          <span className="text-[10px] sm:text-xs font-black text-slate-300 drop-shadow flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{t.drawFromPile}</span>
          </span>
        </div>

        {/* Discard Pile (Face Up Discarded Card) */}
        <div className="flex flex-col items-center gap-1">
          <div
            onClick={handleDiscardPileClick}
            className={`relative group transition-all duration-200 ${
              canDraw && topDiscard?.type !== 'SKIP'
                ? 'cursor-pointer hover:scale-108 active:scale-95'
                : canDiscardOnPile
                ? 'cursor-pointer hover:scale-108 active:scale-95 ring-3 ring-red-500 rounded-xl'
                : 'opacity-90'
            }`}
          >
            {topDiscard ? (
              <CardView card={topDiscard} />
            ) : (
              <div className="w-12 h-17 sm:w-16 sm:h-23 md:w-20 md:h-28 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/60 text-slate-500 font-bold text-xs">
                Empty
              </div>
            )}

            {/* Glowing Take Prompt */}
            {canDraw && topDiscard && topDiscard.type !== 'SKIP' && (
              <div className="absolute -inset-2 rounded-2xl bg-emerald-400/40 blur-md animate-pulse z-0 pointer-events-none"></div>
            )}

            {/* Glowing Discard Prompt */}
            {canDiscardOnPile && (
              <div className="absolute -inset-2 rounded-2xl bg-red-500/50 blur-md animate-pulse z-0 pointer-events-none"></div>
            )}
          </div>

          <span className="text-[10px] sm:text-xs font-black text-slate-300 drop-shadow">
            {canDiscardOnPile ? (
              <span className="text-red-400 font-black animate-pulse flex items-center gap-1">
                <span>🗑️</span>
                <span>{isRTL ? 'اضغط هنا للإرمي' : 'Tap here to Discard'}</span>
              </span>
            ) : (
              t.drawFromDiscard
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
