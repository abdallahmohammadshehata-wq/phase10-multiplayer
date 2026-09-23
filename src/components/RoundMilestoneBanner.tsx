import React from 'react';
import { Player, GameState } from '../types/game';
import { PHASE_REQUIREMENTS } from '../engine/PhaseValidator';
import { useLanguage } from '../i18n/LanguageContext';
import { Sparkles, CheckCircle2, Clock, HelpCircle, Layers, Flame } from 'lucide-react';
import { sounds } from '../audio/SoundEffects';

interface RoundMilestoneBannerProps {
  gameState: GameState;
  myPlayer?: Player;
  onOpenPhaseGuide: () => void;
}

export const RoundMilestoneBanner: React.FC<RoundMilestoneBannerProps> = ({
  gameState,
  myPlayer,
  onOpenPhaseGuide
}) => {
  const { isRTL, t } = useLanguage();

  if (!gameState.isStarted) return null;

  const currentPhaseNum = myPlayer?.currentPhase || 1;
  const currentReq = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === currentPhaseNum) || PHASE_REQUIREMENTS[0];
  const hasLaidThisRound = myPlayer?.hasLaidPhaseThisRound || false;

  return (
    <div className="w-full max-w-4xl px-2 sm:px-4 py-1 flex items-center justify-between gap-2 z-20">
      {/* Estimation / Casino-Style Round Milestone Glass Panel */}
      <div className="w-full bg-slate-950/70 border border-amber-500/30 rounded-2xl p-2 sm:px-4 sm:py-2.5 backdrop-blur-xl shadow-xl flex items-center justify-between gap-2 sm:gap-4 transition-all">
        {/* Left: Round Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-current animate-bounceShort" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
              {t.round} {gameState.roundNumber} / 10
            </span>
            <span className="text-xs sm:text-sm font-black text-white leading-tight">
              {isRTL ? `المرحلة ${currentPhaseNum}` : `Phase ${currentPhaseNum}`}
            </span>
          </div>
        </div>

        {/* Center: Phase Requirement Name & Part Badges */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-1 min-w-0">
          <span className="text-[11px] sm:text-xs md:text-sm font-black text-white truncate max-w-full drop-shadow">
            {isRTL ? currentReq.nameAr : currentReq.nameEn}
          </span>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
            {currentReq.parts.map((part, pIdx) => (
              <span
                key={pIdx}
                className={`px-1.5 sm:px-2 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight border flex items-center gap-1 shadow-sm ${
                  part.type === 'SET'
                    ? 'bg-blue-950/80 border-blue-400/60 text-blue-300'
                    : part.type === 'RUN'
                    ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300'
                    : 'bg-purple-950/80 border-purple-400/60 text-purple-300'
                }`}
              >
                <Layers className="w-2.5 h-2.5" />
                <span>
                  {part.type === 'SET'
                    ? isRTL ? `مجموعة x${part.count}` : `Set x${part.count}`
                    : part.type === 'RUN'
                    ? isRTL ? `متتالية x${part.count}` : `Run x${part.count}`
                    : isRTL ? `لون x${part.count}` : `Color x${part.count}`}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: Player Round Status & Phase Guide Quick Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div
            className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1 border shadow-md transition-all ${
              hasLaidThisRound
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-slate-300'
            }`}
          >
            {hasLaidThisRound ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">{t.phaseCompleted}</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">{t.phasePending}</span>
              </>
            )}
          </div>

          {/* Quick Help Modal Button */}
          <button
            onClick={() => {
              sounds.playCardSelect();
              onOpenPhaseGuide();
            }}
            className="p-1 sm:p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
            title={t.phaseGuide}
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
