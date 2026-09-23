import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { useLanguage } from '../i18n/LanguageContext';
import { PhaseValidator } from '../engine/PhaseValidator';
import { ArrowUpDown, Palette, Trash2, Sparkles, Check, Lock, Ban } from 'lucide-react';
import { sounds } from '../audio/SoundEffects';

interface PlayerHandProps {
  cards: Card[];
  isMyTurn: boolean;
  canPlayOrDiscard: boolean;
  hasLaidPhase: boolean;
  currentPhase: number;
  drawnFromDiscardCardId?: string;
  drawnThisTurnCardId?: string;
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
  drawnThisTurnCardId,
  onSelectCard,
  onLayPhase,
  onDiscard
}) => {
  const { t, isRTL } = useLanguage();
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<'NUMBER' | 'COLOR'>('NUMBER');

  const restrictedCardId = drawnThisTurnCardId || drawnFromDiscardCardId;

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

    if (restrictedCardId && card.id === restrictedCardId && cards.length > 1) {
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
  const isSelectedRestricted = isMyTurn && canPlayOrDiscard && !!restrictedCardId && singleSelectedCard?.id === restrictedCardId && cards.length > 1;

  // Check if hand or selection can complete current phase
  const isSelectedValidPhase = selectedCardsList.length >= 3 && PhaseValidator.findPhaseInCards(selectedCardsList, currentPhase) !== null;
  const isHandHasValidPhase = !hasLaidPhase && PhaseValidator.findPhaseInCards(cards, currentPhase) !== null;

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Dynamic Overlap Calculation (Cards laid above each other like a real hand):
  // When card count increases, overlap increases so hand never overflows the screen!
  const getOverlapMarginClass = (idx: number) => {
    if (idx === 0) return '';
    if (sortedCards.length > 10) {
      return '-ml-5 xs:-ml-6 sm:-ml-8 md:-ml-10 lg:-ml-12';
    }
    if (sortedCards.length > 8) {
      return '-ml-4 xs:-ml-5 sm:-ml-7 md:-ml-9 lg:-ml-10';
    }
    if (sortedCards.length > 5) {
      return '-ml-3 xs:-ml-4 sm:-ml-6 md:-ml-7 lg:-ml-8';
    }
    return 'ml-1 sm:ml-2';
  };

  const midIndex = Math.max(1, (sortedCards.length - 1) / 2);

  return (
    <div className="w-full flex flex-col items-center bg-slate-950/95 dark:bg-phase-darkCard/95 border-t border-slate-700/80 backdrop-blur-xl px-1.5 py-1.5 sm:px-4 sm:py-2 rounded-t-2xl sm:rounded-t-3xl shadow-2xl transition-all flex-shrink-0">
      {/* Rule Notice if holding a card drawn this turn */}
      {isMyTurn && canPlayOrDiscard && restrictedCardId && cards.length > 1 && (
        <div className="mb-1 text-[10px] sm:text-xs text-amber-300 font-bold bg-amber-950/70 px-3 py-1 rounded-full border border-amber-500/50 flex items-center gap-1.5 animate-fadeIn shadow-md">
          <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            {isRTL
              ? 'تنبيه: البطاقة المسحوبة حديثاً لا يمكن رميها في نفس الدور، اختر بطاقة أخرى.'
              : 'Rule: The newly drawn card cannot be discarded this turn.'}
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
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800">
            {cards.length} {isRTL ? 'أوراق' : 'cards'}
          </span>
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
                ? isRTL ? 'مسحوبة حديثاً (ممنوع رميها)' : 'Newly Drawn (Locked)'
                : isMyTurn && canPlayOrDiscard && selectedCardIds.size === 1 && singleSelectedCard
                ? isRTL ? `إرمي (${singleSelectedCard.type === 'NUMBER' ? singleSelectedCard.value : singleSelectedCard.type})` : `Discard (${singleSelectedCard.type === 'NUMBER' ? singleSelectedCard.value : singleSelectedCard.type})`
                : isMyTurn && canPlayOrDiscard && hasLaidPhase && selectedCardIds.size !== 1
                ? isRTL ? 'حدد بطاقة للإرمي' : 'Select card to Discard'
                : t.discardToEndTurn}
            </span>
          </button>
        </div>
      </div>

      {/* Realistic Stacked / Overlapping Hand Cards (Always fits 100% within screen, no scroll needed) */}
      <div className="w-full max-w-5xl flex items-center justify-center pt-5 pb-2 px-2 sm:px-4 overflow-visible">
        <div className="flex items-center justify-center relative select-none">
          {sortedCards.map((card, idx) => {
            const isSelected = selectedCardIds.has(card.id);
            const isHovered = hoveredCardId === card.id;
            const isCardRestricted = isMyTurn && canPlayOrDiscard && !!restrictedCardId && card.id === restrictedCardId && cards.length > 1;

            const offset = idx - midIndex;
            const baseRotation = sortedCards.length > 4 && !isHovered && !isSelected
              ? Math.max(-5, Math.min(5, (offset / midIndex) * 3))
              : 0;
            const baseArcY = sortedCards.length > 4 && !isHovered && !isSelected
              ? Math.abs(offset) * 1.2
              : 0;

            const overlapClass = getOverlapMarginClass(idx);

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className={`flex-shrink-0 transition-all duration-200 ${overlapClass}`}
                style={{
                  zIndex: isHovered ? 55 : isSelected ? 45 : idx + 1,
                  transform: isHovered || isSelected
                    ? 'translateY(-28px) scale(1.1)'
                    : `translateY(${baseArcY}px) rotate(${baseRotation}deg)`,
                  transformOrigin: 'bottom center'
                }}
              >
                <CardView
                  card={card}
                  selected={isSelected}
                  isRestrictedDrawnCard={isCardRestricted}
                  onClick={() => toggleCardSelect(card)}
                  onDoubleClick={() => handleCardDoubleClick(card)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
