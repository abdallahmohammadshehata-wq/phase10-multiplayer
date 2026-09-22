import React from 'react';
import { Card } from '../types/game';
import { Sparkles, Ban, Lock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CardViewProps {
  card?: Card;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  small?: boolean;
  mini?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  isDrawnFromDiscard?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  selected = false,
  onClick,
  onDoubleClick,
  small = false,
  mini = false,
  disabled = false,
  faceDown = false,
  isDrawnFromDiscard = false
}) => {
  const { isRTL } = useLanguage();

  // --- 1. AUTHENTIC REAL PHASE 10 CARD BACK ---
  if (faceDown) {
    return (
      <div
        className={`relative rounded-xl border border-blue-400/40 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 shadow-xl flex items-center justify-center select-none transition-all duration-200 overflow-hidden ${
          mini
            ? 'w-7 h-10 sm:w-9 sm:h-13'
            : small
            ? 'w-10 h-15 sm:w-13 sm:h-19'
            : 'w-12 h-17 sm:w-16 sm:h-23 md:w-20 md:h-28'
        }`}
        style={{
          boxShadow: selected
            ? '0 10px 25px -3px rgba(59, 130, 246, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)'
            : '0 4px 10px -1px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Subtle Linen Cardstock Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:8px_8px] opacity-20"></div>

        {/* Outer White Card Inset Border */}
        <div className="absolute inset-1 rounded-lg border border-white/30 flex items-center justify-center">
          {/* Inner Golden Border */}
          <div className="w-[85%] h-[85%] rounded-md border border-amber-400/60 bg-gradient-to-b from-blue-900/60 via-slate-900/90 to-blue-950/80 flex flex-col items-center justify-center p-1 shadow-inner relative overflow-hidden">
            {/* Center Phase 10 Spiral Burst */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-400/20 pointer-events-none"></div>

            <div className="flex flex-col items-center justify-center z-10">
              <span className="font-black text-[8px] sm:text-[10px] md:text-xs tracking-widest text-amber-300 drop-shadow-md uppercase">
                PHASE
              </span>
              <span className="font-black text-xs sm:text-base md:text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tighter -mt-0.5">
                10
              </span>
            </div>
          </div>
        </div>

        {/* Real Glossy Light Sheen across card */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-gradient-to-br from-white/25 via-white/5 to-transparent rounded-full blur-sm pointer-events-none"></div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  const currentCard = card;

  // --- 2. AUTHENTIC CARD COLOR PALETTES & TEXTURES ---
  const getColorClasses = () => {
    switch (currentCard.color) {
      case 'RED':
        return {
          cardBorder: 'border-red-600',
          bgGradient: 'bg-gradient-to-b from-red-600 via-red-500 to-rose-700',
          innerPillBorder: 'border-red-500',
          text: 'text-red-600',
          glow: 'shadow-red-600/50',
          accent: '#dc2626'
        };
      case 'BLUE':
        return {
          cardBorder: 'border-blue-600',
          bgGradient: 'bg-gradient-to-b from-blue-600 via-blue-500 to-indigo-700',
          innerPillBorder: 'border-blue-500',
          text: 'text-blue-600',
          glow: 'shadow-blue-600/50',
          accent: '#2563eb'
        };
      case 'GREEN':
        return {
          cardBorder: 'border-emerald-600',
          bgGradient: 'bg-gradient-to-b from-emerald-600 via-emerald-500 to-green-700',
          innerPillBorder: 'border-emerald-500',
          text: 'text-emerald-600',
          glow: 'shadow-emerald-600/50',
          accent: '#059669'
        };
      case 'YELLOW':
        return {
          cardBorder: 'border-amber-500',
          bgGradient: 'bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-600',
          innerPillBorder: 'border-amber-400',
          text: 'text-amber-600',
          glow: 'shadow-amber-500/50',
          accent: '#d97706'
        };
      case 'WILD':
        return {
          cardBorder: 'border-purple-500',
          bgGradient: 'bg-gradient-to-br from-red-500 via-amber-400 via-emerald-500 to-blue-600',
          innerPillBorder: 'border-purple-400',
          text: 'text-purple-600',
          glow: 'shadow-purple-500/60',
          accent: '#9333ea'
        };
      case 'SKIP':
        return {
          cardBorder: 'border-slate-500',
          bgGradient: 'bg-gradient-to-b from-cyan-700 via-slate-700 to-slate-900',
          innerPillBorder: 'border-cyan-400',
          text: 'text-slate-800',
          glow: 'shadow-slate-500/40',
          accent: '#475569'
        };
      default:
        return {
          cardBorder: 'border-slate-600',
          bgGradient: 'bg-slate-700',
          innerPillBorder: 'border-slate-500',
          text: 'text-slate-800',
          glow: 'shadow-slate-500/30',
          accent: '#334155'
        };
    }
  };

  const style = getColorClasses();

  // Helper for real card 6 and 9 underlines
  const renderNumberWithUnderline = (val: number, isCorner: boolean = false) => {
    const isUnderlined = val === 6 || val === 9;
    return (
      <span className="inline-flex flex-col items-center leading-none">
        <span>{val}</span>
        {isUnderlined && (
          <span
            className={`w-full bg-current rounded-full ${
              isCorner ? 'h-[1.5px] mt-[1px]' : 'h-[2px] sm:h-[3px] mt-[2px]'
            }`}
          />
        )}
      </span>
    );
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onDoubleClick={!disabled ? onDoubleClick : undefined}
      className={`relative rounded-xl select-none cursor-pointer flex-shrink-0 transition-all duration-200 ${
        mini
          ? 'w-7 h-10 sm:w-9 sm:h-13 p-0.5'
          : small
          ? 'w-10 h-15 sm:w-13 sm:h-19 p-1'
          : 'w-13 h-18 sm:w-16 sm:h-23 md:w-20 md:h-28 p-1 sm:p-1.5'
      } ${style.bgGradient} border ${style.cardBorder} ${
        selected
          ? '-translate-y-3 sm:-translate-y-4 ring-2 sm:ring-4 ring-white shadow-2xl scale-105 z-30 ' + style.glow
          : isDrawnFromDiscard
          ? 'ring-2 sm:ring-3 ring-rose-500 shadow-lg shadow-rose-500/40 hover:-translate-y-1'
          : 'hover:-translate-y-1 hover:shadow-xl'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
      style={{
        boxShadow: selected
          ? '0 15px 30px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -4px rgba(0, 0, 0, 0.4)'
          : isDrawnFromDiscard
          ? '0 6px 15px -2px rgba(225, 29, 72, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
          : '0 4px 10px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
      }}
    >
      {/* Prominent Glowing Lock & Restriction Badge */}
      {isDrawnFromDiscard && (
        <div
          title={isRTL ? 'بطاقة مسحوبة حديثاً من كومة الإرمي (لا يمكن رميها في نفس الدور)' : 'Newly taken card from Discard Pile (cannot be discarded this turn)'}
          className="absolute -top-3 -right-2 z-40 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 border-2 border-white text-white px-1.5 py-0.5 rounded-full shadow-2xl text-[9px] font-black flex items-center gap-1 animate-bounceShort select-none"
        >
          <Lock className="w-2.5 h-2.5 fill-current text-yellow-300" />
          <span className="text-[8px] tracking-tight">{isRTL ? 'ممنوع الرمي' : 'Locked'}</span>
        </div>
      )}

      {/* Real Inner Oval/Pill Crisp White Face */}
      <div className="w-full h-full bg-gradient-to-b from-white via-slate-50 to-slate-100 rounded-lg flex flex-col justify-between p-0.5 sm:p-1 shadow-inner relative overflow-hidden">
        {/* Subtle realistic paper fiber texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none"></div>

        {/* Sub-badge at bottom of card face */}
        {isDrawnFromDiscard && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 text-[7px] sm:text-[8px] font-black flex items-center gap-0.5 shadow-sm whitespace-nowrap">
            <Lock className="w-2 h-2 text-yellow-300" />
            <span>{isRTL ? 'مسحوبة حديثاً' : 'Newly Taken'}</span>
          </div>
        )}

        {/* Top-Left Corner Index */}
        <div className="flex items-center justify-between leading-none z-10">
          <span
            className={`font-black tracking-tight leading-none ${style.text} ${
              mini ? 'text-[8px]' : small ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
            }`}
          >
            {card.type === 'WILD' ? (
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-amber-500 via-emerald-600 to-blue-600">
                W
              </span>
            ) : card.type === 'SKIP' ? (
              <span className="font-black text-slate-800">S</span>
            ) : (
              renderNumberWithUnderline(card.value, true)
            )}
          </span>
        </div>

        {/* Center Large Value / Symbol Display */}
        <div className="flex-1 flex items-center justify-center z-10">
          {card.type === 'WILD' ? (
            // Real Phase 10 WILD Center (4-color diamond burst with metallic W)
            <div className="flex flex-col items-center justify-center text-center">
              <div
                className={`rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-red-500 via-amber-400 via-emerald-500 to-blue-500 shadow-md border border-white/60 flex items-center justify-center animate-pulse ${
                  mini ? 'w-5 h-5' : small ? 'w-7 h-7' : 'w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13'
                }`}
              >
                <span className="font-black text-white text-[9px] sm:text-sm md:text-lg drop-shadow-md">
                  W
                </span>
              </div>
              {!mini && (
                <span className="font-black text-[6px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-slate-800 mt-0.5">
                  WILD
                </span>
              )}
            </div>
          ) : card.type === 'SKIP' ? (
            // Real Phase 10 SKIP Center (Universal Slashed Circle)
            <div className="flex flex-col items-center justify-center text-center">
              <div
                className={`rounded-full p-1 sm:p-1.5 bg-gradient-to-b from-cyan-600 to-slate-800 shadow-md border border-white/80 flex items-center justify-center text-white ${
                  mini ? 'w-5 h-5' : small ? 'w-7 h-7' : 'w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13'
                }`}
              >
                <Ban className={`${mini ? 'w-3 h-3' : small ? 'w-4 h-4' : 'w-5 h-5 sm:w-7 sm:h-7'}`} />
              </div>
              {!mini && (
                <span className="font-black text-[6px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-slate-800 mt-0.5">
                  SKIP
                </span>
              )}
            </div>
          ) : (
            // Real Bold Embossed Number with Underlines
            <div className={`font-black tracking-tighter ${style.text} leading-none flex items-center justify-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]`}>
              <span className={`${mini ? 'text-xs' : small ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl md:text-4xl'}`}>
                {renderNumberWithUnderline(card.value, false)}
              </span>
            </div>
          )}
        </div>

        {/* Bottom-Right Corner Inverted Index */}
        <div className="flex items-center justify-end rotate-180 leading-none z-10">
          <span
            className={`font-black tracking-tight leading-none ${style.text} ${
              mini ? 'text-[8px]' : small ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
            }`}
          >
            {card.type === 'WILD' ? (
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-amber-500 via-emerald-600 to-blue-600">
                W
              </span>
            ) : card.type === 'SKIP' ? (
              <span className="font-black text-slate-800">S</span>
            ) : (
              renderNumberWithUnderline(card.value, true)
            )}
          </span>
        </div>

        {/* Realistic Gloss Sheen Highlight */}
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-white/60 via-white/10 to-transparent rounded-full blur-[2px] pointer-events-none"></div>
      </div>
    </div>
  );
};
