import React from 'react';
import { PHASE_REQUIREMENTS } from '../engine/PhaseValidator';
import { useLanguage } from '../i18n/LanguageContext';
import { X, CheckCircle2, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

interface PhaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhase: number;
}

export const PhaseGuideModal: React.FC<PhaseGuideModalProps> = ({
  isOpen,
  onClose,
  currentPhase
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl max-h-[85vh] glass-panel-glow rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-1.5">
                <span>{t.phaseGuide}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <span className="text-[11px] text-slate-400 font-bold">
                {isRTL ? `أنت حالياً في المرحلة ${currentPhase}` : `You are currently on Phase ${currentPhase}`}
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

        {/* Phase Roadmap List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {PHASE_REQUIREMENTS.map((req) => {
            const isCurrent = req.phaseNumber === currentPhase;
            const isCompleted = req.phaseNumber < currentPhase;

            return (
              <div
                key={req.phaseNumber}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-blue-900/60 border-blue-400 shadow-xl shadow-blue-500/20 ring-2 ring-blue-400/50 scale-[1.01]'
                    : isCompleted
                    ? 'bg-slate-950/50 border-emerald-500/40 opacity-75'
                    : 'bg-slate-950/70 border-white/10 opacity-90'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Phase Number Badge */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md ${
                      isCurrent
                        ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white ring-2 ring-white/50 animate-bounceShort'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {req.phaseNumber}
                  </div>

                  {/* Descriptions */}
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-white flex items-center gap-1.5">
                      {isRTL ? req.nameAr : req.nameEn}
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 font-extrabold animate-pulse">
                          {isRTL ? 'مرحلتك الحالية' : 'Your Goal'}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-300 font-medium mt-0.5">
                      {isRTL ? req.descriptionAr : req.descriptionEn}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="p-1 rounded-full bg-emerald-950 border border-emerald-500/60">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Rules Footer Alert */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-400/40 text-xs text-indigo-200 flex items-center gap-2.5 shadow-md">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-cyan-400" />
          <span className="leading-relaxed font-semibold">
            {isRTL
              ? '✨ نصيحة: بطاقة الوايلد (W) تعوض أي رقم أو لون، وبطاقة التخطي (S) تمنع الخصم من اللعب في دوره!'
              : '✨ Tip: Wild cards (W) can replace any number or color, and Skip cards (S) make an opponent lose their turn!'}
          </span>
        </div>
      </div>
    </div>
  );
};
