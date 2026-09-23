import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { sounds } from '../audio/SoundEffects';
import { PwaInstallButton } from './PwaInstallButton';
import { Moon, Sun, Volume2, VolumeX, BookOpen, Trophy, Globe, LogOut, Sparkles, Copy, Check, Palette } from 'lucide-react';

interface HeaderControlsProps {
  roundNumber?: number;
  roomId?: string;
  onOpenPhaseGuide: () => void;
  onOpenScoreboard?: () => void;
  onOpenThemeModal?: () => void;
  onLeaveGame?: () => void;
  isInGame?: boolean;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  roundNumber,
  roomId,
  onOpenPhaseGuide,
  onOpenScoreboard,
  onOpenThemeModal,
  onLeaveGame,
  isInGame = false
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [muted, setMuted] = React.useState(sounds.isMuted);
  const [copiedCode, setCopiedCode] = React.useState(false);

  const handleToggleMute = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
  };

  const handleToggleLanguage = () => {
    sounds.playCardSelect();
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleCopyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    sounds.playCardSelect();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <header className="w-full flex-shrink-0 flex items-center justify-between px-3 py-1.5 sm:px-6 sm:py-2.5 bg-slate-950/70 border-b border-white/10 backdrop-blur-xl z-30 transition-all shadow-md">
      {/* Brand & Round Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-red-500 via-amber-400 via-emerald-500 to-blue-500 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="font-black text-xs sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow">
              10
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-black text-xs sm:text-base tracking-tight text-white leading-tight flex items-center gap-1.5">
            {t.appTitle}
            <Sparkles className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {isInGame && roundNumber && (
              <span className="px-2 py-0.2 rounded-full bg-blue-950/90 border border-blue-400/50 text-[10px] sm:text-xs font-black text-blue-300 shadow-inner">
                {t.round} {roundNumber}
              </span>
            )}
            {roomId && (
              <button
                onClick={handleCopyRoomCode}
                className="px-2 py-0.2 rounded-full bg-indigo-950/90 border border-indigo-400/60 hover:border-cyan-400 text-[10px] sm:text-xs font-mono font-black text-cyan-300 flex items-center gap-1 shadow-sm transition-all active:scale-95"
                title="Click to copy Room Code"
              >
                <span className="text-slate-400 font-sans text-[9px]">{t.roomCode}:</span>
                <span className="text-white font-bold">{roomId}</span>
                {copiedCode ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-cyan-400" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* PWA App Install Button */}
        <PwaInstallButton />

        {/* Phase Guide Button */}
        <button
          onClick={() => {
            sounds.playCardSelect();
            onOpenPhaseGuide();
          }}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all active:scale-95 shadow-md flex items-center gap-1"
          title={t.phaseGuide}
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="hidden md:inline text-xs font-bold">{t.phaseGuide}</span>
        </button>

        {/* Scoreboard Button (if in game) */}
        {isInGame && onOpenScoreboard && (
          <button
            onClick={() => {
              sounds.playCardSelect();
              onOpenScoreboard();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/50 text-yellow-400 hover:text-yellow-300 transition-all active:scale-95 shadow-md flex items-center gap-1"
            title={t.scoreboard}
          >
            <Trophy className="w-4 h-4 text-yellow-400 animate-bounceShort" />
            <span className="hidden md:inline text-xs font-bold">{t.scoreboard}</span>
          </button>
        )}

        {/* Table Felt Theme Button */}
        {onOpenThemeModal && (
          <button
            onClick={() => {
              sounds.playCardSelect();
              onOpenThemeModal();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-amber-400 hover:text-amber-300 transition-all active:scale-95 shadow-md flex items-center gap-1"
            title={t.tableTheme}
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline text-xs font-bold">{t.tableTheme}</span>
          </button>
        )}

        {/* Language Switcher */}
        <button
          onClick={handleToggleLanguage}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white font-black text-[10px] sm:text-xs flex items-center gap-1 transition-all active:scale-95 shadow-md"
          title="Change Language"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={() => {
            sounds.playCardSelect();
            toggleTheme();
          }}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
          title={isDark ? t.lightMode : t.darkMode}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        {/* Sound Toggle */}
        <button
          onClick={handleToggleMute}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
          title={muted ? t.soundOn : t.soundOff}
        >
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Leave Game Button (if in game) */}
        {isInGame && onLeaveGame && (
          <button
            onClick={() => {
              sounds.playSkipSound();
              onLeaveGame();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/50 text-red-300 transition-all active:scale-95 shadow-md"
            title={t.backToLobby}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
