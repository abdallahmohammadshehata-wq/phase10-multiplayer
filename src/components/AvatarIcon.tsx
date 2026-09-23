import React from 'react';
import {
  Crown,
  Gamepad2,
  Layers,
  Rocket,
  Flame,
  Diamond,
  Compass,
  Shield,
  Bot,
  Zap,
  Star,
  Wand2,
  User
} from 'lucide-react';

interface AvatarIconProps {
  avatar: string;
  className?: string;
}

export const AVATAR_KEYS = [
  'crown',
  'gamepad',
  'cards',
  'rocket',
  'flame',
  'gem',
  'fox',
  'lion',
  'bot',
  'zap',
  'star',
  'wand'
] as const;

export const AvatarIcon: React.FC<AvatarIconProps> = ({ avatar, className = 'w-6 h-6' }) => {
  switch (avatar) {
    case 'crown':
    case '👑':
      return <Crown className={className} />;
    case 'gamepad':
    case '🎮':
      return <Gamepad2 className={className} />;
    case 'cards':
    case '🃏':
      return <Layers className={className} />;
    case 'rocket':
    case '🚀':
      return <Rocket className={className} />;
    case 'flame':
    case '🔥':
      return <Flame className={className} />;
    case 'gem':
    case '💎':
      return <Diamond className={className} />;
    case 'fox':
    case '🦊':
      return <Compass className={className} />;
    case 'lion':
    case '🦁':
      return <Shield className={className} />;
    case 'bot':
    case '🤖':
      return <Bot className={className} />;
    case 'zap':
    case '⚡':
      return <Zap className={className} />;
    case 'star':
    case '🌟':
      return <Star className={className} />;
    case 'wand':
    case '🦄':
      return <Wand2 className={className} />;
    default:
      if (avatar && avatar.length > 2) {
        return <User className={className} />;
      }
      return <span className="leading-none text-current font-black">{avatar}</span>;
  }
};
