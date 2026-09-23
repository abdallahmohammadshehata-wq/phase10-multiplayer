import React from 'react';
import { TableTheme } from '../types/game';
import { useLanguage } from '../i18n/LanguageContext';
import { sounds } from '../audio/SoundEffects';
import { Palette, Check, Sparkles, X } from 'lucide-react';

interface TableThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: TableTheme;
  onSelectTheme: (theme: TableTheme) => void;
}

interface ThemeOption {
  id: TableTheme;
  titleKey: 'themeCasinoEmerald' | 'themeRoyalSapphire' | 'themeCrimsonRuby' | 'themeObsidianWood' | 'themeCyberNeon' | 'themeAutoRound';
  previewGradient: string;
  borderColor: string;
  descriptionEn: string;
  descriptionAr: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'CASINO_EMERALD',
    titleKey: 'themeCasinoEmerald',
    previewGradient: 'from-emerald-700 via-emerald-800 to-green-950',
    borderColor: 'border-emerald-500',
    descriptionEn: 'Authentic casino green felt with damask pattern and royal gold trims.',
    descriptionAr: 'السجادة الخضراء الكلاسيكية للكازينو مع زخرفة أنيقة ولمسات ذهبية.'
  },
  {
    id: 'ROYAL_SAPPHIRE',
    titleKey: 'themeRoyalSapphire',
    previewGradient: 'from-blue-700 via-blue-900 to-slate-950',
    borderColor: 'border-blue-500',
    descriptionEn: 'Deep navy sapphire velvet felt for luxury private table play.',
    descriptionAr: 'مخمل كحلي ملكي عميق يمنحك تجربة طاولات كبار الشخصيات.'
  },
  {
    id: 'CRIMSON_RUBY',
    titleKey: 'themeCrimsonRuby',
    previewGradient: 'from-rose-700 via-rose-900 to-slate-950',
    borderColor: 'border-rose-500',
    descriptionEn: 'Monte Carlo VIP velvet lounge with warm dramatic contrast.',
    descriptionAr: 'صالون مونتي كارلو المخملي العنابي للمواجهات التكتيكية الحماسية.'
  },
  {
    id: 'OBSIDIAN_WOOD',
    titleKey: 'themeObsidianWood',
    previewGradient: 'from-slate-700 via-slate-800 to-zinc-950',
    borderColor: 'border-amber-600',
    descriptionEn: 'Matte executive leather center framed by dark mahogany wood.',
    descriptionAr: 'طاولة الجلد الأسود الفاخر محاطة بإطار خشب الماهوجني الداكن.'
  },
  {
    id: 'CYBER_NEON',
    titleKey: 'themeCyberNeon',
    previewGradient: 'from-purple-700 via-indigo-900 to-cyan-950',
    borderColor: 'border-cyan-400',
    descriptionEn: 'High-energy e-sports tournament table with glowing neon cyan edge.',
    descriptionAr: 'طاولة البطولات العصرية مع إضاءات نيون مشعة وتأثيرات مستقبلية.'
  },
  {
    id: 'AUTO_ROUND',
    titleKey: 'themeAutoRound',
    previewGradient: 'from-emerald-600 via-blue-700 to-purple-800',
    borderColor: 'border-amber-400',
    descriptionEn: 'Atmosphere dynamically evolves each round (Emerald -> Sapphire -> Ruby -> Gold).',
    descriptionAr: 'أجواء الطاولة تتغير تلقائياً مع كل جولة تصاعدياً مثل بطولات استميشن.'
  }
];

export const TableThemeModal: React.FC<TableThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-slate-900/95 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">{t.tableTheme}</h2>
              <p className="text-[11px] text-slate-400">
                {isRTL ? 'اختر ثيم طاولة اللعب أو فعّل التغيير التلقائي للجولات' : 'Choose your table felt or enable auto-round atmosphere'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playCardSelect();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => {
                  sounds.playCardSelect();
                  onSelectTheme(theme.id);
                }}
                className={`relative rounded-2xl p-3.5 border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2 overflow-hidden shadow-lg ${
                  isSelected
                    ? `${theme.borderColor} ring-2 ring-amber-400 shadow-xl scale-[1.02] bg-slate-800/90`
                    : 'border-white/10 hover:border-white/30 bg-slate-900/70 hover:scale-[1.01]'
                }`}
              >
                {/* Visual Swatch Preview Strip */}
                <div
                  className={`w-full h-10 rounded-xl bg-gradient-to-r ${theme.previewGradient} border border-white/20 shadow-inner flex items-center justify-between px-3`}
                >
                  <span className="text-xs font-black text-white/90 drop-shadow">
                    {t[theme.titleKey]}
                  </span>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-md animate-bounceShort">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Theme Description */}
                <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold leading-relaxed">
                  {isRTL ? theme.descriptionAr : theme.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playCardSelect();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all"
        >
          {isRTL ? 'حفظ وتطبيق الثيم' : 'Apply & Save Theme'}
        </button>
      </div>
    </div>
  );
};
