import React from 'react';
import { Player } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { CardView } from './CardView';
import { useLanguage } from '../i18n/LanguageContext';
import { Check } from 'lucide-react';

interface OpponentSeatProps {
  player: Player;
  isActive: boolean;
  position?: 'top' | 'left' | 'right' | 'top-left' | 'top-right';
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isActive
}) => {
  const { isRTL } = useLanguage();
  const cardCount = player.hand?.length || 0;

  // Render a mini 3D fan of card backs representing opponent's hand
  const renderMiniCardFan = () => {
    const visualCards = Math.min(cardCount, 4); // show up to 4 stacked card backs
    if (visualCards <= 0) return null;

    return (
      <div className="flex items-center -space-x-4 sm:-space-x-5 mt-1 select-none pointer-events-none drop-shadow-md">
        {Array.from({ length: visualCards }).map((_, i) => {
          const rotation = (i - (visualCards - 1) / 2) * 8;
          return (
            <div
              key={i}
              className="transform transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg)`,
                zIndex: i + 1
              }}
            >
              <CardView faceDown={true} mini={true} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl transition-all duration-300 relative select-none ${
        isActive
          ? 'bg-blue-950/60 border border-blue-400/60 shadow-lg shadow-blue-500/20 scale-105'
          : 'bg-slate-950/40 border border-white/5'
      }`}
    >
      {/* Active Turn Spotlight Glow */}
      {isActive && (
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-md pointer-events-none animate-pulse"></div>
      )}

      {/* Main Avatar */}
      <PlayerAvatar player={player} isActive={isActive} isMe={false} />

      {/* Mini Card Back Fan & Count */}
      <div className="flex flex-col items-center">
        {renderMiniCardFan()}
        <span className="text-[9px] sm:text-[10px] text-slate-300 font-extrabold mt-0.5">
          {cardCount} {isRTL ? 'كروت' : 'cards'}
        </span>
      </div>

      {/* Laid Phase Chip if Completed */}
      {player.hasLaidPhaseThisRound && (
        <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-[8px] sm:text-[9px] font-black flex items-center gap-1 shadow-md animate-fadeIn">
          <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
          <span>{isRTL ? `المرحلة ${player.currentPhase} مكتملة` : `Phase ${player.currentPhase} Done`}</span>
        </div>
      )}
    </div>
  );
};
