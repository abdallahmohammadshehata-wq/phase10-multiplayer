import React from 'react';
import { Player } from '../types/game';
import { useLanguage } from '../i18n/LanguageContext';
import { X, Trophy, Medal, Sparkles, CheckCircle2 } from 'lucide-react';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  roundNumber: number;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  roundNumber
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  // Rank players: Highest Phase first, then Lowest Penalty Score
  const rankedPlayers = [...players].sort((a, b) => {
    if (b.currentPhase !== a.currentPhase) return b.currentPhase - a.currentPhase;
    return a.score - b.score;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/60 flex items-center justify-center text-yellow-400 shadow-md">
              <Trophy className="w-6 h-6 animate-bounceShort" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">{t.scoreboard}</h2>
              <span className="text-[11px] text-slate-400 font-bold">
                {t.round} {roundNumber}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Ranks Table */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {rankedPlayers.map((player, rank) => {
            const isFirst = rank === 0;

            return (
              <div
                key={player.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isFirst
                    ? 'bg-amber-950/50 border-amber-500/70 shadow-xl shadow-amber-500/10'
                    : 'bg-slate-950/70 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md ${
                      rank === 0
                        ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-black ring-2 ring-yellow-400/50'
                        : rank === 1
                        ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-black'
                        : rank === 2
                        ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
                  </div>

                  {/* Avatar & Name & Phase Progress Bar */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">{player.avatar}</span>
                      <span className="font-black text-sm text-white truncate">{player.username}</span>
                    </div>

                    {/* Visual Phase Progress Bar (1-10) */}
                    <div className="w-full mt-1.5 flex items-center gap-1.5">
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((player.currentPhase - 1) / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-cyan-300 flex-shrink-0">
                        P{Math.min(10, player.currentPhase)}/10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Stats */}
                <div className="text-right flex-shrink-0">
                  <span className="block text-xs font-black text-red-400">
                    +{player.score} {t.points}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-bold">
                    {player.isBot ? '🤖 Bot' : '👤 Human'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
