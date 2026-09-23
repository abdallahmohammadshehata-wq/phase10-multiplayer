import React from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../i18n/LanguageContext';
import { Check, Ban, Crown } from 'lucide-react';
import { AvatarIcon } from './AvatarIcon';

interface PlayerAvatarProps {
  player: Player;
  isActive: boolean;
  isMe: boolean;
  onSelect?: () => void;
  selectable?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isActive,
  isMe,
  onSelect,
  selectable = false
}) => {
  const { t } = useLanguage();

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={`relative flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 ${
        selectable ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      }`}
    >
      {/* Avatar Container with Active Turn Glow Ring */}
      <div className="relative">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl shadow-lg border-2 transition-all ${
            isActive
              ? 'ring-3 sm:ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-900 border-blue-300 scale-105 shadow-blue-500/50'
              : 'border-slate-700 bg-slate-800'
          }`}
          style={{ backgroundColor: player.avatarColor || '#1e293b' }}
        >
          <AvatarIcon avatar={player.avatar} className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
        </div>

        {/* Host Crown */}
        {player.isHost && (
          <div className="absolute -top-2 -left-1 text-yellow-400 drop-shadow-md">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400" />
          </div>
        )}

        {/* Bot Icon */}
        {player.isBot && (
          <div className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-md bg-purple-900 border border-purple-500 text-[8px] sm:text-[9px] font-black text-purple-200">
            BOT
          </div>
        )}

        {/* Skipped Badge */}
        {player.isSkipped && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-xs">
            <Ban className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
        )}

        {/* Cards in Hand Count Badge */}
        <div className="absolute -bottom-1 -right-1 px-1 sm:px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-[9px] sm:text-[10px] font-black text-slate-200 shadow-md">
          {player.hand?.length || 0}
        </div>
      </div>

      {/* Player Name & Current Phase */}
      <div className="flex flex-col items-center text-center leading-tight">
        <span className="font-bold text-[10px] sm:text-xs max-w-[55px] sm:max-w-[80px] truncate text-slate-200">
          {player.username} {isMe && `(${t.you})`}
        </span>
        <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-slate-400 font-semibold">
          <span className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-blue-300 font-extrabold">
            P{player.currentPhase}
          </span>
          {player.hasLaidPhaseThisRound && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
        </div>
      </div>
    </div>
  );
};
