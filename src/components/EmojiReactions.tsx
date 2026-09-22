import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { sounds } from '../audio/SoundEffects';
import { Smile, X } from 'lucide-react';

interface EmojiReactionsProps {
  onSendEmoji: (emoji: string) => void;
}

const EMOJI_LIST = ['🎉', '😂', '🔥', '🃏', '😱', '👏', '😡', '👑'];

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({ onSendEmoji }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectEmoji = (emoji: string) => {
    sounds.playCardSelect();
    sounds.vibrate(25);
    onSendEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative z-40 flex items-center">
      {/* Floating Toggle Button */}
      <button
        onClick={() => {
          sounds.playCardSelect();
          setIsOpen((prev) => !prev);
        }}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xl border transition-all ${
          isOpen
            ? 'bg-red-600 border-red-400 text-white rotate-90 scale-105'
            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-yellow-400 hover:scale-110 active:scale-95'
        }`}
        title={t.chatReaction}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Smile className="w-5 h-5 fill-yellow-400/20" />}
      </button>

      {/* Expanded Horizontal Emoji Picker Popup */}
      {isOpen && (
        <div className="absolute bottom-11 right-0 sm:right-auto sm:left-0 flex items-center gap-1 sm:gap-1.5 p-1.5 bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn z-50">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelectEmoji(emoji)}
              className="text-xl sm:text-2xl p-1.5 rounded-xl hover:bg-slate-800 hover:scale-130 active:scale-90 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
