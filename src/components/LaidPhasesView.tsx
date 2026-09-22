import React from 'react';
import { Card, GameState, Player, LaidPhasePart } from '../types/game';
import { CardView } from './CardView';
import { useLanguage } from '../i18n/LanguageContext';
import { PlusCircle, Sparkles, Layers } from 'lucide-react';
import { sounds } from '../audio/SoundEffects';
import { PhaseValidator } from '../engine/PhaseValidator';

interface LaidPhasesViewProps {
  gameState: GameState;
  myPlayerId: string;
  selectedCardId?: string;
  onHitPhase: (targetPlayerId: string, partIndex: number) => void;
}

export const LaidPhasesView: React.FC<LaidPhasesViewProps> = ({
  gameState,
  myPlayerId,
  selectedCardId,
  onHitPhase
}) => {
  const { t, isRTL } = useLanguage();

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const playerHasLaid = myPlayer?.hasLaidPhaseThisRound || false;
  const selectedCard = myPlayer?.hand?.find((c) => c.id === selectedCardId);

  // Collect all players who have laid phases
  const playersWithPhases = (gameState.players || []).filter(
    (p) => p.hasLaidPhaseThisRound && p.laidPhases && p.laidPhases.length > 0
  );

  if (playersWithPhases.length === 0) {
    return null;
  }

  const getPartLabel = (part: LaidPhasePart) => {
    if (part.type === 'SET') {
      return isRTL ? `مجموعة رقم ${part.targetValue || ''}` : `Set of ${part.targetValue || ''}s`;
    }
    if (part.type === 'RUN') {
      return isRTL ? 'متتالية أرقام' : 'Run Sequence';
    }
    if (part.type === 'COLOR') {
      return isRTL ? `لون ${part.targetColor || ''}` : `Color ${part.targetColor || ''}`;
    }
    return '';
  };

  // Helper to check if a specific part can be hit
  const checkPartCanHit = (part: LaidPhasePart): { canHit: boolean; matchingCardId?: string } => {
    if (!isMyTurn || !playerHasLaid || gameState.turnStage !== 'PLAY_OR_DISCARD' || !myPlayer) {
      return { canHit: false };
    }

    try {
      if (selectedCard) {
        const res = PhaseValidator.canHitOnPhase(selectedCard, part);
        if (res.canHit) return { canHit: true, matchingCardId: selectedCard.id };
      } else {
        const eligibleCard = (myPlayer.hand || []).find((c) => PhaseValidator.canHitOnPhase(c, part).canHit);
        if (eligibleCard) return { canHit: true, matchingCardId: eligibleCard.id };
      }
    } catch {
      return { canHit: false };
    }

    return { canHit: false };
  };

  return (
    <div className="w-full max-w-5xl flex flex-col gap-2 p-2.5 rounded-3xl glass-panel-glow animate-fadeIn">
      {/* Table Phases Section Header */}
      <div className="flex items-center justify-between text-xs font-black text-slate-200 px-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-amber-300 font-black tracking-wide">{t.tablePhases}</span>
        </div>
        {isMyTurn && playerHasLaid && gameState.turnStage === 'PLAY_OR_DISCARD' && (
          <span className="text-emerald-400 font-black animate-bounceShort text-[11px] sm:text-xs">
            {isRTL
              ? '✨ اضغط على زر (+ إلعب هنا) لإضافة أوراقك!'
              : '✨ Tap (+ Hit Here) to add your cards!'}
          </span>
        )}
      </div>

      {/* Grid of Laid Phase Boxes */}
      <div className="w-full flex items-stretch justify-start overflow-x-auto gap-3.5 py-1 px-1 scrollbar-thin scrollbar-thumb-slate-700">
        {playersWithPhases.map((player) => {
          const isMe = player.id === myPlayerId;
          return (
            <div
              key={player.id}
              className={`flex-shrink-0 rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 shadow-2xl min-w-[270px] sm:min-w-[320px] border transition-all ${
                isMe
                  ? 'border-blue-400/80 bg-gradient-to-b from-blue-950/70 via-slate-900/90 to-slate-950/95 shadow-blue-500/20'
                  : 'border-white/10 bg-slate-900/90'
              }`}
            >
              {/* Player Owner Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-md border border-white/30"
                    style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
                  >
                    {player.avatar}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-black text-xs sm:text-sm text-white flex items-center gap-1">
                      {player.username}
                      {isMe && <span className="text-[10px] text-cyan-400 font-bold">({t.you})</span>}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-0.5 rounded-full bg-blue-950 border border-blue-400/60 text-blue-300 font-black text-xs shadow-sm">
                  {t.phase} {player.currentPhase}
                </span>
              </div>

              {/* Laid Groups in this Phase */}
              <div className="flex flex-col gap-2">
                {(player.laidPhases || []).map((part, partIdx) => {
                  const hitStatus = checkPartCanHit(part);

                  return (
                    <div
                      key={partIdx}
                      onClick={() => {
                        if (hitStatus.canHit) {
                          sounds.playCardSelect();
                          onHitPhase(player.id, partIdx);
                        }
                      }}
                      className={`flex flex-col rounded-xl p-2.5 border transition-all ${
                        hitStatus.canHit
                          ? 'bg-emerald-950/60 border-emerald-400 hover:bg-emerald-900/70 cursor-pointer shadow-xl ring-2 ring-emerald-400 animate-pulse'
                          : 'bg-slate-950/80 border-white/5 shadow-inner'
                      }`}
                    >
                      {/* Group Type Subtitle & Hit Action Button */}
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 px-0.5">
                        <span className="text-cyan-300 font-black flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          {getPartLabel(part)}
                        </span>

                        {/* Interactive Hit Button on this specific group */}
                        {hitStatus.canHit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sounds.playCardSelect();
                              onHitPhase(player.id, partIdx);
                            }}
                            className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 animate-bounceShort ring-1 ring-white"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>{t.hitOnPhase}</span>
                          </button>
                        )}
                      </div>

                      {/* Cards inside this group */}
                      <div className="flex items-center flex-wrap gap-1 sm:gap-1.5">
                        {(part.cards || []).map((card, cIdx) => (
                          <div key={card.id || `${partIdx}_${cIdx}`} className="hover:scale-108 transition-transform flex-shrink-0">
                            <CardView card={card} mini={true} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
