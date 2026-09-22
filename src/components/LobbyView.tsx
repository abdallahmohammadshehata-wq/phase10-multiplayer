import React, { useState, useEffect } from 'react';
import { Player, RoomInfo } from '../types/game';
import { useLanguage } from '../i18n/LanguageContext';
import { sounds } from '../audio/SoundEffects';
import QRCode from 'qrcode';
import { Play, UserPlus, Trash2, Copy, Check, Sparkles, Bot, Users, Wifi, QrCode } from 'lucide-react';

interface LobbyViewProps {
  myPlayerId: string;
  roomInfo?: RoomInfo;
  players: Player[];
  onCreateRoom: (username: string, avatar: string, avatarColor: string) => void;
  onCreateOnlineRoom?: (username: string, avatar: string, avatarColor: string) => void;
  onJoinRoom: (roomId: string, username: string, avatar: string, avatarColor: string) => void;
  onAddBot: (difficulty: 'EASY' | 'MEDIUM' | 'MASTER') => void;
  onRemovePlayer: (targetPlayerId: string) => void;
  onStartGame: () => void;
  onStartSoloWithBots: (username: string, avatar: string, avatarColor: string, botCount: number) => void;
}

const AVATAR_OPTIONS = ['👑', '🎮', '🃏', '🚀', '🔥', '💎', '🦊', '🦁', '🤖', '⚡', '🌟', '🦄'];
const COLOR_OPTIONS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  myPlayerId,
  roomInfo,
  players,
  onCreateRoom,
  onCreateOnlineRoom,
  onJoinRoom,
  onAddBot,
  onRemovePlayer,
  onStartGame,
  onStartSoloWithBots
}) => {
  const { t, isRTL } = useLanguage();

  const [username, setUsername] = useState<string>(localStorage.getItem('phase10_username') || `Player_${Math.floor(100 + Math.random() * 900)}`);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('👑');
  const [selectedColor, setSelectedColor] = useState<string>('#3b82f6');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedBotDifficulty, setSelectedBotDifficulty] = useState<'EASY' | 'MEDIUM' | 'MASTER'>('MEDIUM');

  const [lanIp, setLanIp] = useState<string>('192.168.8.7');
  const [publicUrl, setPublicUrl] = useState<string | undefined>(undefined);
  const [copiedType, setCopiedType] = useState<'CODE' | 'ONLINE' | 'LAN' | null>(null);

  // Fetch LAN IP and Public Tunnel URL from server (polling until publicUrl is ready)
  useEffect(() => {
    const fetchInfo = () => {
      fetch('/api/info')
        .then((res) => res.json())
        .then((data) => {
          if (data.lanIp) setLanIp(data.lanIp);
          if (data.publicUrl) setPublicUrl(data.publicUrl);
        })
        .catch((err) => console.warn('Could not fetch server info:', err));
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  // Check URL query parameters for direct invite room join e.g. ?room=ABCD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInputRoomCode(roomParam.trim().toUpperCase());
    }
  }, []);

  // Save username
  useEffect(() => {
    localStorage.setItem('phase10_username', username);
  }, [username]);

  // Generate High-Contrast Scannable QR Code (Dark black dots on clean white background)
  useEffect(() => {
    if (roomInfo?.roomId) {
      const isPublicHttps = window.location.protocol === 'https:' || window.location.hostname.includes('trycloudflare.com');
      const bestBase = isPublicHttps ? window.location.origin : (publicUrl || window.location.origin || `http://${lanIp}:4000`);
      const joinUrl = `${bestBase}/?room=${roomInfo.roomId}`;

      QRCode.toDataURL(joinUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#0b1320', light: '#ffffff' }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [roomInfo?.roomId, publicUrl, lanIp]);

  const isHost = players.find((p) => p.id === myPlayerId)?.isHost || false;
  const canStart = isHost && players.length >= 2;

  const handleCopyCode = () => {
    if (!roomInfo?.roomId) return;
    navigator.clipboard.writeText(roomInfo.roomId);
    setCopiedType('CODE');
    sounds.playCardSelect();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyOnlineLink = () => {
    if (!roomInfo?.roomId) return;
    const isPublicHttps = window.location.protocol === 'https:' || window.location.hostname.includes('trycloudflare.com');
    const base = publicUrl || (isPublicHttps ? window.location.origin : `${window.location.protocol}//${window.location.host}`);
    const joinUrl = `${base}/?room=${roomInfo.roomId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedType('ONLINE');
    sounds.playCardSelect();
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLanLink = () => {
    if (!roomInfo?.roomId) return;
    const joinUrl = `http://${lanIp}:4000/?room=${roomInfo.roomId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedType('LAN');
    sounds.playCardSelect();
    setTimeout(() => setCopiedType(null), 2000);
  };

  // 1. IN ROOM LOBBY SCREEN
  if (roomInfo?.roomId) {
    const isPublicHttps = window.location.protocol === 'https:' || window.location.hostname.includes('trycloudflare.com');
    const displayOnlineBase = publicUrl || (isPublicHttps ? window.location.origin : '');
    return (
      <div className="w-full max-w-4xl flex flex-col items-center gap-4 sm:gap-6 p-2 sm:p-6 animate-fadeIn">
        {/* Room Header Card */}
        <div className="w-full glass-panel-glow rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex flex-col text-center sm:text-start flex-1 min-w-0 w-full">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.roomCode}</span>
            
            {/* Big Prominent Room Code & 1-Click Copy */}
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5 flex-wrap">
              <div className="px-4 py-2 rounded-2xl bg-slate-950/90 border border-blue-500/50 shadow-inner flex items-center gap-3">
                <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 tracking-widest drop-shadow">
                  {roomInfo.roomId}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  title="Copy Room Code"
                >
                  {copiedType === 'CODE' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'CODE' ? t.roomCodeCopied : t.copyRoomCode}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 font-bold flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{t.playersInRoom}:</span>
                <strong className="text-emerald-400 font-black text-sm">{players.length}/6</strong>
              </p>
            </div>

            {/* Global Online Link Box (Play across internet) */}
            <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border border-indigo-500/40 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-300">
                  <span className="text-base">🌍</span>
                  <span>{isRTL ? 'رابط اللعب عن بُعد (عبر الإنترنت):' : 'Online Global Play Link:'}</span>
                </div>
                <button
                  onClick={handleCopyOnlineLink}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  {copiedType === 'ONLINE' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'ONLINE' ? t.linkCopied : isRTL ? 'نسخ الرابط' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-purple-200 select-all break-all bg-slate-950/70 p-2 rounded-xl border border-indigo-500/20">
                {displayOnlineBase ? `${displayOnlineBase}/?room=${roomInfo.roomId}` : isRTL ? 'جاري تجهيز الرابط العالمي...' : 'Initializing global tunnel...'}
              </p>
            </div>

            {/* Local Wi-Fi / LAN Box */}
            <div className="mt-2 p-2.5 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-300 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Wifi className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
                <span className="font-bold">{isRTL ? 'الشبكة المحلية:' : 'Local LAN:'}</span>
                <span className="font-mono text-cyan-300 select-all break-all">{`http://${lanIp}:4000/?room=${roomInfo.roomId}`}</span>
              </div>
              <button
                onClick={handleCopyLanLink}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 flex-shrink-0"
              >
                {copiedType === 'LAN' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'LAN' ? '✓' : isRTL ? 'نسخ' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* QR Code for Mobile Instant Join */}
          {qrDataUrl && (
            <div className="flex flex-col items-center bg-slate-950/90 p-4 rounded-3xl border border-white/15 shadow-2xl flex-shrink-0">
              <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                <img src={qrDataUrl} alt="Room QR Code" className="w-32 h-32 sm:w-36 sm:h-36 rounded-lg" />
              </div>
              <span className="text-[11px] font-black text-slate-200 mt-2.5 text-center flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>{isRTL ? 'امسح للانضمام فوراً' : 'Scan to join instantly'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Players Slot Grid (Up to 6 Players) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, idx) => {
            const player = players[idx];
            if (player) {
              return (
                <div
                  key={player.id}
                  className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-between shadow-xl relative overflow-hidden transition-all hover:border-blue-500/50"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg border-2 border-white/30"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {player.avatar}
                    </div>
                    <span className="font-black text-sm text-white text-center truncate max-w-[120px]">
                      {player.username}
                    </span>
                    <div className="flex items-center gap-1">
                      {player.isHost && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/70 text-amber-300 text-[10px] font-black shadow-sm">
                          👑 {t.host}
                        </span>
                      )}
                      {player.isBot && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/70 text-purple-300 text-[10px] font-black shadow-sm">
                          🤖 {player.botDifficulty || 'BOT'}
                        </span>
                      )}
                      {player.id === myPlayerId && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/70 text-blue-300 text-[10px] font-black shadow-sm">
                          👤 {t.you}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kick / Remove Button (Host only) */}
                  {isHost && player.id !== myPlayerId && (
                    <button
                      onClick={() => onRemovePlayer(player.id)}
                      className="mt-3 p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.kickPlayer}</span>
                    </button>
                  )}
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={idx}
                className="border-2 border-dashed border-slate-700/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-slate-500 bg-slate-950/40 min-h-[140px]"
              >
                <Users className="w-8 h-8 opacity-30 mb-1" />
                <span className="text-xs font-bold opacity-70">
                  {isRTL ? `المقعد ${idx + 1} متاح` : `Slot ${idx + 1} Open`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Host Control Actions */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          {isHost && players.length < 6 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedBotDifficulty}
                onChange={(e) => setSelectedBotDifficulty(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-3 focus:outline-none focus:border-purple-500"
              >
                <option value="EASY">🤖 {t.botEasy}</option>
                <option value="MEDIUM">🤖 {t.botMedium}</option>
                <option value="MASTER">🧠 {t.botMaster}</option>
              </select>

              <button
                onClick={() => onAddBot(selectedBotDifficulty)}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-sm shadow-xl shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.addBot}</span>
              </button>
            </div>
          )}

          {isHost ? (
            <button
              disabled={!canStart}
              onClick={onStartGame}
              className={`px-8 py-3.5 rounded-2xl font-black text-base shadow-2xl flex items-center gap-2.5 transition-all ${
                canStart
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white hover:brightness-110 active:scale-95 shadow-emerald-500/40 animate-pulse ring-2 ring-emerald-400'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t.startGame}</span>
            </button>
          ) : (
            <div className="px-6 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 font-bold text-sm text-center shadow-lg">
              ⏳ {isRTL ? 'في انتظار المضيف لبدء اللعبة...' : 'Waiting for host to start the game...'}
            </div>
          )}
        </div>

        {!canStart && isHost && (
          <p className="text-xs text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
            ⚠️ {t.needMinPlayers}
          </p>
        )}
      </div>
    );
  }

  // 2. WELCOME / CREATE / JOIN / SOLO SCREEN
  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-4 sm:gap-5 p-3 sm:p-6 animate-fadeIn">
      {/* Title & Brand Hero */}
      <div className="text-center flex flex-col items-center">
        <div className="relative mb-2">
          <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-3xl bg-gradient-to-tr from-red-500 via-amber-400 via-emerald-500 to-blue-500 p-1 shadow-2xl shadow-blue-500/30 flex items-center justify-center animate-bounceShort">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <span className="font-black text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow">
                10
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          {t.appTitle}
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">{t.appSubtitle}</p>
      </div>

      {/* Profile & Avatar Customizer */}
      <div className="w-full glass-panel-glow rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5">
        <label className="text-xs font-black text-slate-300 uppercase tracking-wider">{t.username}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t.enterUsername}
          maxLength={14}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
        />

        {/* Avatar Picker */}
        <label className="text-xs font-black text-slate-300 uppercase tracking-wider mt-1">{t.chooseAvatar}</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                sounds.playCardSelect();
                setSelectedAvatar(emoji);
              }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all ${
                selectedAvatar === emoji
                  ? 'ring-3 ring-cyan-400 scale-110 bg-slate-800 shadow-xl'
                  : 'bg-slate-950/80 hover:bg-slate-800 opacity-70'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Color Palette Picker */}
        <div className="flex items-center gap-2 justify-between mt-1 px-1">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              onClick={() => {
                sounds.playCardSelect();
                setSelectedColor(color);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all ${
                selectedColor === color ? 'ring-3 ring-white scale-115 shadow-xl' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Main Game Mode Options */}
      <div className="w-full flex flex-col gap-3">
        {/* 1. Global Online Room (Link to play anywhere across the internet) */}
        <button
          onClick={() => (onCreateOnlineRoom ? onCreateOnlineRoom(username, selectedAvatar, selectedColor) : onCreateRoom(username, selectedAvatar, selectedColor))}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2.5 border border-blue-400/40"
        >
          <span className="text-xl">🌐</span>
          <span>{isRTL ? 'إنشاء غرفة أونلاين (لعب عن بُعد برابط)' : 'Create Online Room (Global Link)'}</span>
        </button>

        {/* 2. 1-Click Quick Solo with Bots */}
        <button
          onClick={() => onStartSoloWithBots(username, selectedAvatar, selectedColor, 3)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 hover:brightness-110 text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-500/30"
        >
          <Bot className="w-5 h-5 text-purple-300" />
          <span>{t.singlePlayer} (Solo vs 3 Bots)</span>
        </button>

        {/* 3. Create LAN Wi-Fi Room Button */}
        <button
          onClick={() => onCreateRoom(username, selectedAvatar, selectedColor)}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-700"
        >
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>{t.createRoom} (Host Local Wi-Fi)</span>
        </button>

        {/* Join Room by Code */}
        <div className="w-full glass-panel rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 shadow-xl mt-1">
          <input
            type="text"
            value={inputRoomCode}
            onChange={(e) => setInputRoomCode(e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t.enterRoomCode}
            maxLength={6}
            className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-black text-center text-sm sm:text-base tracking-widest uppercase focus:outline-none focus:border-blue-400 shadow-inner"
          />
          <button
            disabled={inputRoomCode.trim().length < 3}
            onClick={() => onJoinRoom(inputRoomCode.trim().toUpperCase(), username, selectedAvatar, selectedColor)}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              inputRoomCode.trim().length >= 3
                ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-lg shadow-blue-500/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {t.joinRoom}
          </button>
        </div>
      </div>
    </div>
  );
};
