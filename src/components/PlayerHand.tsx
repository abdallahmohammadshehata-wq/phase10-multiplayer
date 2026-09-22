import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { useLanguage } from '../i18n/LanguageContext';
import { PhaseValidator } from '../engine/PhaseValidator';
import { ArrowUpDown, Palette, Trash2, Sparkles, Check } from 'lucide-react';
import { sounds } from '../audio/SoundEffects';

interface PlayerHandProps {
  cards: Card[];
  isMyTurn: boolean;
  canPlayOrDiscard: boolean;
  hasLaidPhase: boolean;
  currentPhase: number;
  drawnFromDiscardCardId?: string;
  onSelectCard?: (cardId?: string) => void;
  onLayPhase: (selectedCards: Card[]) => void;
  onDiscard: (cardId: string) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  isMyTurn,
  canPlayOrDiscard,
  hasLaidPhase,
  currentPhase,
  drawnFromDiscardCardId,
  onSelectCard,
  onLayPhase,
  onDiscard
}) => {
  const { t, isRTL } = useLanguage();
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<'NUMBER' | 'COLOR'>('NUMBER');

  const toggleCardSelect = (card: Card) => {
    sounds.playCardSelect();
    sounds.vibrate(20);

    const newSet = new Set(selectedCardIds);
    if (newSet.has(card.id)) {
      newSet.delete(card.id);
    } else {
      newSet.add(card.id);
    }
    setSelectedCardIds(newSet);

    // If exactly 1 card selected, notify for Hit / Discard actions
    if (onSelectCard) {
      if (newSet.size === 1) {
        onSelectCard(Array.from(newSet)[0]);
      } else {
        onSelectCard(undefined);
      }
    }
  };

  const handleCardDoubleClick = (card: Card) => {
    if (!isMyTurn || !canPlayOrDiscard) return;

    if (drawnFromDiscardCardId && card.id === drawnFromDiscardCardId && cards.length > 1) {
      sounds.playSkipSound();
      sounds.vibrate(50);
      return;
    }

    onDiscard(card.id);
    setSelectedCardIds(new Set());
    if (onSelectCard) onSelectCard(undefined);
  };

  const handleClearSelection = () => {
    setSelectedCardIds(new Set());
    if (onSelectCard) onSelectCard(undefined);
  };

  const handleSortByNumber = () => {
    setSortMode('NUMBER');
    sounds.playCardSelect();
  };

  const handleSortByColor = () => {
    setSortMode('COLOR');
    sounds.playCardSelect();
  };

  // Sort display cards
  const sortedCards = [...cards].sort((a, b) => {
    if (sortMode === 'COLOR') {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.value - b.value;
    } else {
      if (a.type !== b.type) {
        if (a.type === 'NUMBER') return -1;
        if (b.type === 'NUMBER') return 1;
      }
      return a.value - b.value;
    }
  });

  const selectedCardsList = cards.filter((c) => selectedCardIds.has(c.id));
  const singleSelectedCard = selectedCardIds.size === 1 ? cards.find((c) => selectedCardIds.has(c.id)) : undefined;
  const isSelectedRestricted = isMyTurn && canPlayOrDiscard && !!drawnFromDiscardCardId && singleSelectedCard?.id === drawnFromDiscardCardId && cards.length > 1;

  // Check if hand or selection can complete current phase
  const isSelectedValidPhase = selectedCardsList.length >= 3 && PhaseValidator.findPhaseInCards(selectedCardsList, currentPhase) !== null;
  const isHandHasValidPhase = !hasLaidPhase && PhaseValidator.findPhaseInCards(cards, currentPhase) !== null;

  return (
    <div className="w-full flex flex-col items-center bg-slate-900/95 dark:bg-phase-darkCard/95 border-t border-slate-700/80 backdrop-blur-xl px-1.5 py-1.5 sm:px-4 sm:py-2.5 rounded-t-2xl sm:rounded-t-3xl shadow-2xl transition-all flex-shrink-0">
      {/* Rule Notice if holding a card drawn from discard */}
      {isMyTurn && canPlayOrDiscard && drawnFromDiscardCardId && cards.length > 1 && (
        <div className="mb-1 text-[10px] text-amber-300 font-bold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1.5 animate-fadeIn">
          <span>🔒</span>
          <span>
            {isRTL
              ? 'تنبيه: البطاقة المسحوبة من الإرمي لا يمكن رميها في نفس الدور، اختر بطاقة أخرى.'
              : 'Rule: Card drawn from discard pile cannot be discarded this turn.'}
          </span>
        </div>
      )}

      {/* Hand Action Toolbar */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-1 sm:gap-2 mb-1 px-1 text-xs">
        {/* Sort Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSortByNumber}
            className={`px-2 py-1 rounded-lg sm:rounded-xl flex items-center gap-1 font-bold text-[10px] sm:text-xs transition-all ${
              sortMode === 'NUMBER'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="hidden xs:inline">{t.sortByNumber}</span>
            <span className="xs:hidden">{isRTL ? 'رقم' : 'Num'}</span>
          </button>
          <button
            onClick={handleSortByColor}
            className={`px-2 py-1 rounded-lg sm:rounded-xl flex items-center gap-1 font-bold text-[10px] sm:text-xs transition-all ${
              sortMode === 'COLOR'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Palette className="w-3 h-3" />
            <span className="hidden xs:inline">{t.sortByColor}</span>
            <span className="xs:hidden">{isRTL ? 'لون' : 'Col'}</span>
          </button>
        </div>

        {/* Action Buttons for Selected Cards */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {selectedCardIds.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] sm:text-xs"
            >
              ✕ ({selectedCardIds.size})
            </button>
          )}

          {/* Lay Down Phase Button */}
          {!hasLaidPhase && (
            <button
              disabled={!isMyTurn || !canPlayOrDiscard}
              onClick={() => {
                onLayPhase(selectedCardsList);
                setSelectedCardIds(new Set());
                if (onSelectCard) onSelectCard(undefined);
              }}
              className={`px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center gap-1 font-black text-[10px] sm:text-xs shadow-lg transition-all ${
                isMyTurn && canPlayOrDiscard && (isSelectedValidPhase || isHandHasValidPhase)
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white hover:brightness-110 active:scale-95 shadow-emerald-500/40 animate-pulse ring-2 ring-emerald-400'
                  : isMyTurn && canPlayOrDiscard && selectedCardsList.length >= 3
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>{t.layPhase}</span>
              {isHandHasValidPhase && (
                <span className="text-[8px] sm:text-[9px] bg-white/20 px-1 py-0.5 rounded font-black">
                  ✓
                </span>
              )}
            </button>
          )}

          {/* Discard 1 Selected Card */}
          <button
            disabled={!isMyTurn || !canPlayOrDiscard || selectedCardIds.size !== 1 || isSelectedRestricted}
            onClick={() => {
              if (singleSelectedCard && !isSelectedRestricted) {
                onDiscard(singleSelectedCard.id);
                setSelectedCardIds(new Set());
                if (onSelectCard) onSelectCard(undefined);
              }
            }}
            className={`px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center gap-1 font-black text-[10px] sm:text-xs shadow-lg transition-all ${
              isMyTurn && canPlayOrDiscard && selectedCardIds.size === 1 && !isSelectedRestricted
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white hover:brightness-110 active:scale-95 shadow-red-500/40 ring-2 ring-red-400 animate-pulse'
                : isSelectedRestricted
                ? 'bg-amber-900/80 text-amber-300 border border-amber-500/50 cursor-not-allowed'
                : isMyTurn && canPlayOrDiscard && hasLaidPhase
                ? 'bg-amber-600/80 text-white border border-amber-400/80 shadow-md animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>
              {isSelectedRestricted
                ? isRTL ? '🚫 مسحوبة من الإرمي (ممنوع رميها)' : '🚫 Drawn from Discard (Forbidden)'
                : isMyTurn && canPlayOrDiscard && selectedCardIds.size === 1 && singleSelectedCard
                ? isRTL ? `إرمي (${singleSelectedCard.type === 'NUMBER' ? singleSelectedCard.value : singleSelectedCard.type})` : `Discard (${singleSelectedCard.type === 'NUMBER' ? singleSelectedCard.value : singleSelectedCard.type})`
                : isMyTurn && canPlayOrDiscard && hasLaidPhase && selectedCardIds.size !== 1
                ? isRTL ? 'حدد بطاقة للإرمي ➔' : 'Select card to Discard ➔'
                : t.discardToEndTurn}
            </span>
          </button>
        </div>
      </div>

      {/* Responsive Hand Cards Row: Safe horizontal scroll with full padding so 1st card is never cropped */}
      <div className="w-full max-w-5xl flex items-center justify-start md:justify-center overflow-x-auto py-2 px-4 sm:px-6 gap-1.5 sm:gap-2 md:gap-2.5 scrollbar-thin scrollbar-thumb-slate-700 overscroll-x-contain">
        {sortedCards.map((card) => {
          const isSelected = selectedCardIds.has(card.id);
          const isCardDrawnFromDiscard = isMyTurn && canPlayOrDiscard && !!drawnFromDiscardCardId && card.id === drawnFromDiscardCardId && cards.length > 1;

          return (
            <div key={card.id} className="flex-shrink-0 transition-transform">
              <CardView
                card={card}
                selected={isSelected}
                isDrawnFromDiscard={isCardDrawnFromDiscard}
                onClick={() => toggleCardSelect(card)}
                onDoubleClick={() => handleCardDoubleClick(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
