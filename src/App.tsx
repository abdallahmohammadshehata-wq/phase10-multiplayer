import React, { useState, useEffect } from 'react';
import { Card, GameState, Player, RoomInfo, EmojiReaction } from './types/game';
import { network } from './network/NetworkClient';
import { sounds } from './audio/SoundEffects';
import { useLanguage } from './i18n/LanguageContext';
import { PhaseValidator, PHASE_REQUIREMENTS } from './engine/PhaseValidator';
import confetti from 'canvas-confetti';

import { HeaderControls } from './components/HeaderControls';
import { LobbyView } from './components/LobbyView';
import { TableCenter } from './components/TableCenter';
import { LaidPhasesView } from './components/LaidPhasesView';
import { PlayerHand } from './components/PlayerHand';
import { PlayerAvatar } from './components/PlayerAvatar';
import { PhaseGuideModal } from './components/PhaseGuideModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { EmojiReactions } from './components/EmojiReactions';
import { Trophy, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const { t, isRTL } = useLanguage();

  const [myPlayerId, setMyPlayerId] = useState<string>(network.playerId);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | undefined>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | undefined>();

  // Modals & Panels
  const [isPhaseGuideOpen, setIsPhaseGuideOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState<EmojiReaction[]>([]);
  const [errorMessage, setErrorMessage] = useState<{ en: string; ar: string } | null>(null);
  const [successToast, setSuccessToast] = useState<{ en: string; ar: string } | null>(null);

  // Selected card in hand for Hit actions
  const [selectedHitCardId, setSelectedHitCardId] = useState<string | undefined>();

  // Skip card target modal selection
  const [pendingSkipCardId, setPendingSkipCardId] = useState<string | null>(null);

  // Register Network Event Handlers
  useEffect(() => {
    const handleInit = (msg: any) => {
      if (msg.playerId) setMyPlayerId(msg.playerId);
    };

    const handleRoomCreated = (msg: any) => {
      setRoomInfo(msg.room);
      sounds.playPhaseSuccess();
    };

    const handleRoomJoined = (msg: any) => {
      setRoomInfo(msg.room);
      sounds.playPhaseSuccess();
    };

    const handleRoomState = (msg: any) => {
      setRoomInfo(msg.room);
      setPlayers(msg.players || []);
    };

    const handleGameState = (msg: any) => {
      const state: GameState = msg.gameState;
      setGameState(state);
      setPlayers(state.players);

      if (state.turnStage === 'ROUND_OVER' || state.turnStage === 'GAME_OVER') {
        sounds.playVictory();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    };

    const handleEmojiReaction = (msg: any) => {
      const rx: EmojiReaction = msg.reaction;
      setActiveReactions((prev) => [...prev, rx]);
      sounds.playCardSelect();
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== rx.id));
      }, 2300);
    };

    const handleError = (msg: any) => {
      setErrorMessage({
        en: msg.messageEn || 'Action cannot be completed',
        ar: msg.messageAr || 'تعذر إكمال هذا الإجراء'
      });
      sounds.playSkipSound();
      setTimeout(() => setErrorMessage(null), 3500);
    };

    network.on('INIT', handleInit);
    network.on('ROOM_CREATED', handleRoomCreated);
    network.on('ROOM_JOINED', handleRoomJoined);
    network.on('ROOM_STATE', handleRoomState);
    network.on('GAME_STATE', handleGameState);
    network.on('EMOJI_REACTION', handleEmojiReaction);
    network.on('ERROR', handleError);

    return () => {
      network.off('INIT', handleInit);
      network.off('ROOM_CREATED', handleRoomCreated);
      network.off('ROOM_JOINED', handleRoomJoined);
      network.off('ROOM_STATE', handleRoomState);
      network.off('GAME_STATE', handleGameState);
      network.off('EMOJI_REACTION', handleEmojiReaction);
      network.off('ERROR', handleError);
    };
  }, []);

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId) || players.find((p) => p.id === myPlayerId);
  const isHost = myPlayer?.isHost || false;
  const isMyTurn = gameState ? gameState.players[gameState.activePlayerIndex]?.id === myPlayerId : false;

  // --- ACTIONS ---

  const handleCreateRoom = (username: string, avatar: string, avatarColor: string) => {
    network.createRoom(username, avatar, avatarColor);
  };

  const handleCreateOnlineRoom = (username: string, avatar: string, avatarColor: string) => {
    network.createOnlineRoom(username, avatar, avatarColor);
  };

  const handleJoinRoom = (roomId: string, username: string, avatar: string, avatarColor: string) => {
    network.joinRoom(roomId, username, avatar, avatarColor);
  };

  const handleStartSoloWithBots = (username: string, avatar: string, avatarColor: string, botCount: number = 3) => {
    network.createRoom(username, avatar, avatarColor);
    for (let i = 0; i < botCount; i++) {
      network.addBot('MEDIUM');
    }
    setTimeout(() => {
      network.startGame();
    }, 100);
  };

  const handleAddBot = (difficulty: 'EASY' | 'MEDIUM' | 'MASTER') => {
    network.addBot(difficulty);
    sounds.playCardSelect();
  };

  const handleRemovePlayer = (targetId: string) => {
    network.removePlayer(targetId);
  };

  const handleStartGame = () => {
    network.startGame();
    sounds.playCardDeal();
  };

  const handleNextRound = () => {
    network.nextRound();
    sounds.playCardDeal();
  };

  const handleDraw = (source: 'DRAW' | 'DISCARD') => {
    network.drawCard(source);
  };

  const handleLayPhase = (selectedCards: Card[]) => {
    if (!myPlayer) return;
    const phaseNum = myPlayer.currentPhase;

    let foundGroups: Card[][] | null = null;
    if (selectedCards.length >= 3) {
      foundGroups = PhaseValidator.findPhaseInCards(selectedCards, phaseNum);
    }

    if (!foundGroups) {
      foundGroups = PhaseValidator.findPhaseInCards(myPlayer.hand, phaseNum);
    }

    if (foundGroups) {
      network.layPhase(foundGroups);
      sounds.playPhaseSuccess();
      setSuccessToast({
        en: `🎉 Phase ${phaseNum} Laid Down! Now select 1 card & Discard to end your turn ➔`,
        ar: `🎉 تم إنزال المرحلة ${phaseNum} بنجاح! حدد بطاقة واضغط (إرمي لإنهاء الدور) لنقل الدور ➔`
      });
      setTimeout(() => setSuccessToast(null), 5000);
    } else {
      const req = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === phaseNum);
      setErrorMessage({
        en: `Cards do not complete ${req?.nameEn || 'Phase'}. Check required cards!`,
        ar: `البطاقات لا تكمل ${req?.nameAr || 'المرحلة'}. تأكد من اكتمال المتطلبات!`
      });
      sounds.playSkipSound();
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const handleHitPhase = (targetPlayerId: string, partIndex: number) => {
    if (!myPlayer || (myPlayer.hand || []).length === 0) return;

    let cardToHitId = selectedHitCardId;

    if (!cardToHitId) {
      const targetPlayer = gameState?.players.find((p) => p.id === targetPlayerId);
      const targetPart = targetPlayer?.laidPhases[partIndex];
      if (targetPart) {
        const eligibleCard = (myPlayer.hand || []).find((c) => PhaseValidator.canHitOnPhase(c, targetPart).canHit);
        if (eligibleCard) {
          cardToHitId = eligibleCard.id;
        }
      }
    }

    if (!cardToHitId) {
      setErrorMessage({
        en: 'Please select a matching card from your hand first!',
        ar: 'يرجى تحديد بطاقة متوافقة من يدك أولاً!'
      });
      sounds.playSkipSound();
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    network.hitPhase(cardToHitId, targetPlayerId, partIndex);
    setSelectedHitCardId(undefined);
    sounds.playCardSelect();
  };

  const handleDiscard = (cardId: string) => {
    if (gameState?.drawnFromDiscardCardId && cardId === gameState.drawnFromDiscardCardId) {
      setErrorMessage({
        en: 'Rule: You cannot discard the card you just drew from the Discard Pile on the same turn!',
        ar: 'قانون اللعبة: لا يجوز رمي البطاقة التي سحبتها للتو من كومة الإرمي في نفس الدور!'
      });
      sounds.playSkipSound();
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    const card = myPlayer?.hand?.find((c) => c.id === cardId);
    if (card?.type === 'SKIP') {
      setPendingSkipCardId(cardId);
    } else {
      network.discardCard(cardId);
      setSelectedHitCardId(undefined);
      sounds.playDiscard();
      sounds.vibrate(40);
    }
  };

  const handleConfirmSkipTarget = (targetPlayerId: string) => {
    if (!pendingSkipCardId) return;
    network.discardCard(pendingSkipCardId, targetPlayerId);
    setPendingSkipCardId(null);
    setSelectedHitCardId(undefined);
    sounds.playSkipSound();
  };

  const handleSendEmoji = (emoji: string) => {
    network.sendEmoji(emoji);
  };

  const handleLeaveGame = () => {
    setGameState(undefined);
    setRoomInfo(undefined);
    setPlayers([]);
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col game-table-felt text-white select-none overflow-hidden">
      {/* Top Navbar */}
      <HeaderControls
        roundNumber={gameState?.roundNumber}
        roomId={gameState?.roomId || roomInfo?.roomId}
        onOpenPhaseGuide={() => setIsPhaseGuideOpen(true)}
        onOpenScoreboard={() => setIsScoreboardOpen(true)}
        onLeaveGame={handleLeaveGame}
        isInGame={!!gameState?.isStarted}
      />

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-red-600/95 text-white font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-bounceShort border border-red-400 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4" />
          <span>{isRTL ? errorMessage.ar : errorMessage.en}</span>
        </div>
      )}

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600/95 text-white font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-bounceShort border border-emerald-400 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isRTL ? successToast.ar : successToast.en}</span>
        </div>
      )}

      {/* Full-Screen Unclipped Floating Emoji Reactions Portal */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map((rx) => {
          const sender = gameState?.players.find((p) => p.id === rx.playerId) || players.find((p) => p.id === rx.playerId);
          return (
            <div
              key={rx.id}
              className="absolute left-1/2 top-20 sm:top-24 -translate-x-1/2 flex flex-col items-center animate-floatUpFade"
            >
              <span className="text-5xl sm:text-6xl md:text-7xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] filter">
                {rx.emoji}
              </span>
              {sender && (
                <span className="mt-1 px-3 py-1 rounded-full bg-slate-950/80 border border-white/20 text-xs font-black text-white shadow-2xl backdrop-blur-md">
                  {sender.username}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center justify-between relative overflow-hidden min-h-0">
        {!gameState?.isStarted ? (
          // Lobby / Welcome Screen with smooth scroll if content exceeds screen
          <div className="w-full h-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 lobby-mesh-bg">
            <LobbyView
              myPlayerId={myPlayerId}
              roomInfo={roomInfo}
              players={players}
              onCreateRoom={handleCreateRoom}
              onCreateOnlineRoom={handleCreateOnlineRoom}
              onJoinRoom={handleJoinRoom}
              onAddBot={handleAddBot}
              onRemovePlayer={handleRemovePlayer}
              onStartGame={handleStartGame}
              onStartSoloWithBots={handleStartSoloWithBots}
            />
          </div>
        ) : (
          // In-Game Active Table Screen (Fits 100% of mobile & desktop viewport)
          <div className="w-full h-full flex flex-col items-center justify-between relative max-w-6xl py-0.5 px-1 sm:px-2 overflow-hidden min-h-0">
            {/* Opponents Top Bar (Safe horizontal scroll with left/right padding) */}
            <div className="w-full flex-shrink-0 flex items-center justify-start md:justify-center gap-2.5 sm:gap-4 py-1.5 px-3 overflow-x-auto scrollbar-none overscroll-x-contain">
              {(gameState.players || []).map((p, pIdx) => {
                const isCurrentTurn = gameState.activePlayerIndex === pIdx;

                return (
                  <PlayerAvatar
                    key={p.id}
                    player={p}
                    isActive={isCurrentTurn}
                    isMe={p.id === myPlayerId}
                  />
                );
              })}
            </div>

            {/* Scrollable Center Game Arena: Decks + Table Laid Phases */}
            <div className="flex-1 w-full min-h-0 overflow-y-auto flex flex-col items-center justify-start gap-1.5 py-0.5 px-1 sm:px-2 scrollbar-thin scrollbar-thumb-slate-700">
              {/* Table Center (Draw Deck & Discard Pile) */}
              <TableCenter
                gameState={gameState}
                myPlayerId={myPlayerId}
                selectedCardId={selectedHitCardId}
                onDraw={handleDraw}
                onDiscard={handleDiscard}
              />

              {/* Laid Phases on Table */}
              <LaidPhasesView
                gameState={gameState}
                myPlayerId={myPlayerId}
                selectedCardId={selectedHitCardId}
                onHitPhase={handleHitPhase}
              />
            </div>

            {/* Floating Quick Emoji Reaction Button (Pinned neatly above Hand) */}
            <div className="w-full flex-shrink-0 flex justify-end px-3 -mb-1 relative z-40">
              <EmojiReactions onSendEmoji={handleSendEmoji} />
            </div>

            {/* Active Player's Hand (Pinned to Bottom) */}
            {myPlayer && (
              <div className="w-full flex-shrink-0">
                <PlayerHand
                  cards={myPlayer.hand || []}
                  isMyTurn={isMyTurn}
                  canPlayOrDiscard={gameState.turnStage === 'PLAY_OR_DISCARD'}
                  hasLaidPhase={myPlayer.hasLaidPhaseThisRound}
                  currentPhase={myPlayer.currentPhase}
                  drawnFromDiscardCardId={gameState.drawnFromDiscardCardId}
                  onSelectCard={(id) => setSelectedHitCardId(id)}
                  onLayPhase={handleLayPhase}
                  onDiscard={handleDiscard}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Target Skip Modal */}
      {pendingSkipCardId && gameState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center">
            <h3 className="text-base font-black text-white">{t.selectTargetToSkip}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {(gameState.players || [])
                .filter((p) => p.id !== myPlayerId)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleConfirmSkipTarget(p.id)}
                    className="p-3 rounded-2xl bg-slate-900/90 hover:bg-red-600/80 border border-white/10 hover:border-red-400 flex flex-col items-center gap-1 transition-all active:scale-95 shadow-md"
                  >
                    <span className="text-3xl">{p.avatar}</span>
                    <span className="font-black text-xs text-white truncate max-w-[90px]">{p.username}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Round Finished / Game Over Winner Modal */}
      {gameState && (gameState.turnStage === 'ROUND_OVER' || gameState.turnStage === 'GAME_OVER') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border border-indigo-400/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center ring-2 ring-indigo-500/30">
            <div className="w-18 h-18 rounded-3xl bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-yellow-400 drop-shadow-xl animate-bounceShort">
              <Trophy className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {gameState.turnStage === 'GAME_OVER' ? '🏆 ' + t.winner : '🎉 ' + t.roundFinished}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-bold">
              {isRTL ? gameState.lastActionMessage?.ar : gameState.lastActionMessage?.en}
            </p>

            {/* Next Round Button (Host only) */}
            {isHost ? (
              <button
                onClick={handleNextRound}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:brightness-110 text-white font-black text-sm sm:text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 ring-2 ring-emerald-400"
              >
                <span>{gameState.turnStage === 'GAME_OVER' ? t.playAgain : t.nextRound}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="text-xs text-slate-400 font-bold bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
                {isRTL ? 'في انتظار المضيف لبدء الجولة التالية...' : 'Waiting for host to start next round...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase Guide Drawer Modal */}
      <PhaseGuideModal
        isOpen={isPhaseGuideOpen}
        onClose={() => setIsPhaseGuideOpen(false)}
        currentPhase={myPlayer?.currentPhase || 1}
      />

      {/* Scoreboard Modal */}
      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        players={gameState?.players || players}
        roundNumber={gameState?.roundNumber || 1}
      />
    </div>
  );
};
