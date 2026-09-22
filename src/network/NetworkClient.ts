import { Card, GameState, Player, RoomInfo, EmojiReaction } from '../types/game';
import { Phase10Engine } from '../engine/Phase10Engine';
import { Phase10Bot } from '../engine/Phase10Bot';
import { p2pClient } from './P2PClient';

export type NetworkEventType =
  | 'INIT'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'ROOM_STATE'
  | 'GAME_STATE'
  | 'EMOJI_REACTION'
  | 'ERROR'
  | 'CONNECTION_STATUS';

export class NetworkClient {
  private ws: WebSocket | null = null;
  public playerId: string = localStorage.getItem('phase10_player_id') || `p_${Math.random().toString(36).substring(2, 9)}`;
  public isOfflineMode: boolean = false;
  public isConnected: boolean = false;
  public isP2PMode: boolean = false;
  public lanIp: string = window.location.hostname;
  public port: number = 4000;
  public publicUrl?: string;
  public currentRoomId?: string;

  private pendingMessages: Array<{ type: string; payload: object }> = [];
  private reconnectTimer?: NodeJS.Timeout;

  // Local Offline State Machine for Solo / Offline play
  private localRoom?: {
    id: string;
    name: string;
    players: Player[];
    gameState?: GameState;
    drawPile: Card[];
    botTimers: NodeJS.Timeout[];
    activeTurnSessionId: number;
  };

  private listeners: Map<NetworkEventType, Array<(data: any) => void>> = new Map();

  constructor() {
    localStorage.setItem('phase10_player_id', this.playerId);
    const savedRoom = sessionStorage.getItem('phase10_room_id');
    if (savedRoom) this.currentRoomId = savedRoom;

    // Bridge all P2P events to NetworkClient listeners
    const events: NetworkEventType[] = [
      'INIT',
      'ROOM_CREATED',
      'ROOM_JOINED',
      'ROOM_STATE',
      'GAME_STATE',
      'EMOJI_REACTION',
      'ERROR',
      'CONNECTION_STATUS'
    ];
    events.forEach((evt) => {
      p2pClient.on(evt as any, (data) => {
        if (evt === 'ROOM_CREATED' || evt === 'ROOM_JOINED') {
          this.currentRoomId = data.roomId;
          this.isP2PMode = true;
        }
        this.emit(evt, data);
      });
    });

    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:4000';
    const wsUrl = `${protocol}//${host}/ws`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isOfflineMode = false;
        console.log('✅ Connected to Phase 10 LAN WebSocket Server!');
        this.emit('CONNECTION_STATUS', { connected: true, isOffline: false });

        // Send persistent HELLO handshake
        this.ws?.send(
          JSON.stringify({
            type: 'HELLO',
            playerId: this.playerId,
            roomId: this.currentRoomId
          })
        );

        // Flush any pending messages
        while (this.pendingMessages.length > 0) {
          const msg = this.pendingMessages.shift()!;
          this.ws?.send(JSON.stringify({ type: msg.type, playerId: this.playerId, ...msg.payload }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'INIT') {
            if (!this.playerId && msg.playerId) {
              this.playerId = msg.playerId;
              localStorage.setItem('phase10_player_id', this.playerId);
            }
            this.lanIp = msg.lanIp || host;
            this.port = msg.port || 4000;
            if (msg.publicUrl) {
              this.publicUrl = msg.publicUrl;
            }
          } else if (msg.type === 'ROOM_CREATED' || msg.type === 'ROOM_JOINED') {
            this.currentRoomId = msg.roomId;
            if (msg.roomId) sessionStorage.setItem('phase10_room_id', msg.roomId);
          }
          this.emit(msg.type, msg);
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.warn('WebSocket connection closed. Retrying in 2 seconds...');
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 2000);
      };
    } catch (e) {
      console.warn('Failed to construct WebSocket:', e);
      this.isConnected = false;
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 2000);
    }
  }

  public on(event: NetworkEventType, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: NetworkEventType, callback: (data: any) => void) {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(
      event,
      list.filter((cb) => cb !== callback)
    );
  }

  private emit(event: NetworkEventType, data: any) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => cb(data));
    }
  }

  private send(type: string, payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, playerId: this.playerId, ...payload }));
    } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      this.pendingMessages.push({ type, payload });
    } else if (this.isOfflineMode) {
      this.handleLocalAction(type, payload);
    } else {
      this.pendingMessages.push({ type, payload });
      this.connectWebSocket();
    }
  }

  // --- ACTIONS ---

  public createRoom(username: string, avatar: string, avatarColor: string, roomName?: string) {
    this.send('CREATE_ROOM', { username, avatar, avatarColor, roomName });
  }

  public createOnlineRoom(username: string, avatar: string, avatarColor: string, roomName?: string) {
    this.send('CREATE_ROOM', { username, avatar, avatarColor, roomName });
  }

  public joinRoom(roomId: string, username: string, avatar: string, avatarColor: string) {
    const cleanRoomId = (roomId || '').trim().toUpperCase();
    this.send('JOIN_ROOM', { roomId: cleanRoomId, username, avatar, avatarColor });
  }

  public joinOnlineRoom(roomId: string, username: string, avatar: string, avatarColor: string) {
    const cleanRoomId = (roomId || '').trim().toUpperCase();
    this.send('JOIN_ROOM', { roomId: cleanRoomId, username, avatar, avatarColor });
  }

  public addBot(difficulty: 'EASY' | 'MEDIUM' | 'MASTER' = 'MEDIUM') {
    this.send('ADD_BOT', { difficulty });
  }

  public removePlayer(targetPlayerId: string) {
    this.send('REMOVE_PLAYER', { targetPlayerId });
  }

  public startGame() {
    this.send('START_GAME', {});
  }

  public nextRound() {
    this.send('NEXT_ROUND', {});
  }

  public drawCard(source: 'DRAW' | 'DISCARD') {
    this.send('DRAW_CARD', { source });
  }

  public layPhase(groups: Card[][]) {
    this.send('LAY_PHASE', { groups });
  }

  public hitPhase(cardId: string, targetPlayerId: string, targetPartIndex: number) {
    this.send('HIT_PHASE', { cardId, targetPlayerId, targetPartIndex });
  }

  public discardCard(cardId: string, targetSkipPlayerId?: string) {
    this.send('DISCARD_CARD', { cardId, targetSkipPlayerId });
  }

  public sendEmoji(emoji: string) {
    this.send('SEND_EMOJI', { emoji });
  }

  private clearLocalBotTimers() {
    if (this.localRoom?.botTimers) {
      this.localRoom.botTimers.forEach((t) => clearTimeout(t));
      this.localRoom.botTimers = [];
    }
    if (this.localRoom) {
      this.localRoom.activeTurnSessionId = (this.localRoom.activeTurnSessionId || 0) + 1;
    }
  }

  // --- LOCAL OFFLINE SIMULATION FALLBACK ---
  private handleLocalAction(type: string, payload: any) {
    switch (type) {
      case 'CREATE_ROOM': {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hostPlayer: Player = {
          id: this.playerId,
          username: payload.username || 'You',
          avatar: payload.avatar || '👑',
          avatarColor: payload.avatarColor || '#3b82f6',
          isHost: true,
          isBot: false,
          hand: [],
          currentPhase: 1,
          hasLaidPhaseThisRound: false,
          laidPhases: [],
          score: 0,
          roundScore: 0,
          isSkipped: false,
          connected: true
        };

        this.localRoom = {
          id: roomId,
          name: payload.roomName || `Room ${roomId}`,
          players: [hostPlayer],
          drawPile: [],
          botTimers: [],
          activeTurnSessionId: 0
        };

        this.emit('ROOM_CREATED', { roomId, room: this.getLocalRoomInfo() });
        this.emit('ROOM_STATE', { room: this.getLocalRoomInfo(), players: this.localRoom.players });
        break;
      }

      case 'JOIN_ROOM': {
        if (this.localRoom && this.localRoom.id === (payload.roomId || '').toUpperCase()) {
          const newPlayer: Player = {
            id: `p_${Math.random().toString(36).substring(2, 7)}`,
            username: payload.username || `Player ${this.localRoom.players.length + 1}`,
            avatar: payload.avatar || '🎮',
            avatarColor: payload.avatarColor || '#ef4444',
            isHost: false,
            isBot: false,
            hand: [],
            currentPhase: 1,
            hasLaidPhaseThisRound: false,
            laidPhases: [],
            score: 0,
            roundScore: 0,
            isSkipped: false,
            connected: true
          };
          this.localRoom.players.push(newPlayer);
          this.emit('ROOM_JOINED', { roomId: this.localRoom.id, room: this.getLocalRoomInfo() });
          this.emit('ROOM_STATE', { room: this.getLocalRoomInfo(), players: this.localRoom.players });
        } else {
          this.emit('ERROR', {
            messageEn: 'Connecting to LAN server... Please make sure you are on the same Wi-Fi.',
            messageAr: 'جاري الاتصال بخادم الشبكة المحلية... تأكد من أنك متصل بنفس شبكة الواي فاي.'
          });
        }
        break;
      }

      case 'ADD_BOT': {
        if (!this.localRoom || this.localRoom.players.length >= 6) return;
        const botIndex = this.localRoom.players.filter((p) => p.isBot).length + 1;
        const botNames = ['Robo-T', 'ByteKing', 'CardMaster', 'AceBot', 'Glitch', 'Nexus'];
        const botAvatars = ['🤖', '🦾', '👾', '🚀', '⚡', '🧠'];
        const botColors = ['#a855f7', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#f97316'];

        const botPlayer: Player = {
          id: `bot_${Math.random().toString(36).substring(2, 7)}`,
          username: botNames[botIndex - 1] || `Bot ${botIndex}`,
          avatar: botAvatars[botIndex - 1] || '🤖',
          avatarColor: botColors[botIndex - 1] || '#a855f7',
          isHost: false,
          isBot: true,
          botDifficulty: payload.difficulty || 'MEDIUM',
          hand: [],
          currentPhase: 1,
          hasLaidPhaseThisRound: false,
          laidPhases: [],
          score: 0,
          roundScore: 0,
          isSkipped: false,
          connected: true
        };

        this.localRoom.players.push(botPlayer);
        this.emit('ROOM_STATE', { room: this.getLocalRoomInfo(), players: this.localRoom.players });
        break;
      }

      case 'REMOVE_PLAYER': {
        if (!this.localRoom) return;
        this.localRoom.players = this.localRoom.players.filter((p) => p.id !== payload.targetPlayerId);
        this.emit('ROOM_STATE', { room: this.getLocalRoomInfo(), players: this.localRoom.players });
        break;
      }

      case 'START_GAME': {
        if (!this.localRoom || this.localRoom.players.length < 2) return;
        const { state, drawPile } = Phase10Engine.startRound(this.localRoom.players, 1, this.localRoom.id, this.localRoom.name);
        this.localRoom.gameState = state;
        this.localRoom.drawPile = drawPile;

        this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
        this.triggerLocalBotTurn();
        break;
      }

      case 'NEXT_ROUND': {
        if (!this.localRoom || !this.localRoom.gameState) return;
        const nextRoundNum = this.localRoom.gameState.roundNumber + 1;
        const { state, drawPile } = Phase10Engine.startRound(
          this.localRoom.gameState.players,
          nextRoundNum,
          this.localRoom.id,
          this.localRoom.name,
          nextRoundNum - 1
        );
        this.localRoom.gameState = state;
        this.localRoom.drawPile = drawPile;

        this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
        this.triggerLocalBotTurn();
        break;
      }

      case 'DRAW_CARD': {
        if (!this.localRoom || !this.localRoom.gameState) return;
        const { newState, newDrawPile } = Phase10Engine.handleDraw(this.localRoom.gameState, this.localRoom.drawPile, payload.source);
        this.localRoom.gameState = newState;
        this.localRoom.drawPile = newDrawPile;
        this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
        break;
      }

      case 'LAY_PHASE': {
        if (!this.localRoom || !this.localRoom.gameState) return;
        const result = Phase10Engine.handleLayPhase(this.localRoom.gameState, payload.groups);
        this.localRoom.gameState = result.newState;
        if (!result.success) {
          this.emit('ERROR', { messageEn: result.errorEn, messageAr: result.errorAr });
        } else {
          this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
        }
        break;
      }

      case 'HIT_PHASE': {
        if (!this.localRoom || !this.localRoom.gameState) return;
        const result = Phase10Engine.handleHitPhase(
          this.localRoom.gameState,
          payload.cardId,
          payload.targetPlayerId,
          payload.targetPartIndex
        );
        this.localRoom.gameState = result.newState;
        if (!result.success) {
          this.emit('ERROR', { messageEn: result.errorEn, messageAr: result.errorAr });
        } else {
          this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
        }
        break;
      }

      case 'DISCARD_CARD': {
        if (!this.localRoom || !this.localRoom.gameState) return;
        const result = Phase10Engine.handleDiscard(
          this.localRoom.gameState,
          payload.cardId,
          payload.targetSkipPlayerId
        );
        if (result.errorEn) {
          this.emit('ERROR', { messageEn: result.errorEn, messageAr: result.errorAr });
          return;
        }

        this.localRoom.gameState = result.newState;
        this.emit('GAME_STATE', { gameState: this.localRoom.gameState });

        if (!result.isRoundOver && !result.isGameOver) {
          this.triggerLocalBotTurn();
        }
        break;
      }

      case 'SEND_EMOJI': {
        const reaction: EmojiReaction = {
          id: `em_${Date.now()}_${Math.random()}`,
          playerId: this.playerId,
          emoji: payload.emoji,
          timestamp: Date.now()
        };
        this.emit('EMOJI_REACTION', { reaction });
        break;
      }
    }
  }

  private triggerLocalBotTurn() {
    this.clearLocalBotTimers();

    if (!this.localRoom?.gameState || this.localRoom.gameState.turnStage === 'ROUND_OVER' || this.localRoom.gameState.turnStage === 'GAME_OVER')
      return;

    const currentTurnIndex = this.localRoom.gameState.activePlayerIndex;
    const activePlayer = this.localRoom.gameState.players[currentTurnIndex];
    if (!activePlayer || !activePlayer.isBot) return;

    const thisSessionId = this.localRoom.activeTurnSessionId;

    // 1. Draw Step
    const t1 = setTimeout(() => {
      if (!this.localRoom?.gameState || this.localRoom.activeTurnSessionId !== thisSessionId) return;
      const bot = this.localRoom.gameState.players[this.localRoom.gameState.activePlayerIndex];
      if (!bot || !bot.isBot || this.localRoom.gameState.turnStage !== 'DRAW') return;

      const topDiscard = this.localRoom.gameState.discardPile[this.localRoom.gameState.discardPile.length - 1];
      const drawSource = Phase10Bot.decideDraw(bot, topDiscard, this.localRoom.gameState);

      const drawRes = Phase10Engine.handleDraw(this.localRoom.gameState, this.localRoom.drawPile, drawSource);
      this.localRoom.gameState = drawRes.newState;
      this.localRoom.drawPile = drawRes.newDrawPile;
      this.emit('GAME_STATE', { gameState: this.localRoom.gameState });

      // 2. Lay Phase / Hit Step
      const t2 = setTimeout(() => {
        if (!this.localRoom?.gameState || this.localRoom.activeTurnSessionId !== thisSessionId) return;
        let currentBot = this.localRoom.gameState.players[this.localRoom.gameState.activePlayerIndex];
        if (!currentBot || !currentBot.isBot || this.localRoom.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

        if (!currentBot.hasLaidPhaseThisRound) {
          const foundPhase = Phase10Bot.findPhaseInHand(currentBot.hand, currentBot.currentPhase);
          if (foundPhase) {
            const layRes = Phase10Engine.handleLayPhase(this.localRoom.gameState, foundPhase);
            if (layRes.success) {
              this.localRoom.gameState = layRes.newState;
              this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
              currentBot = this.localRoom.gameState.players[this.localRoom.gameState.activePlayerIndex];
            }
          }
        }

        if (currentBot && currentBot.hasLaidPhaseThisRound) {
          const hits = Phase10Bot.findHits(currentBot, this.localRoom.gameState);
          for (const hit of hits) {
            const hitRes = Phase10Engine.handleHitPhase(this.localRoom.gameState, hit.cardId, hit.targetPlayerId, hit.targetPartIndex);
            if (hitRes.success) {
              this.localRoom.gameState = hitRes.newState;
            }
          }
          this.emit('GAME_STATE', { gameState: this.localRoom.gameState });
          currentBot = this.localRoom.gameState.players[this.localRoom.gameState.activePlayerIndex];
        }

        // 3. Discard Step
        const t3 = setTimeout(() => {
          if (!this.localRoom?.gameState || this.localRoom.activeTurnSessionId !== thisSessionId) return;
          const finalBot = this.localRoom.gameState.players[this.localRoom.gameState.activePlayerIndex];
          if (!finalBot || !finalBot.isBot || this.localRoom.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

          const discardChoice = Phase10Bot.chooseDiscard(finalBot, this.localRoom.gameState);

          const discardRes = Phase10Engine.handleDiscard(
            this.localRoom.gameState,
            discardChoice.cardId,
            discardChoice.targetSkipPlayerId
          );
          this.localRoom.gameState = discardRes.newState;
          this.emit('GAME_STATE', { gameState: this.localRoom.gameState });

          if (!discardRes.isRoundOver && !discardRes.isGameOver) {
            this.triggerLocalBotTurn();
          }
        }, 600);

        this.localRoom?.botTimers.push(t3);
      }, 600);

      this.localRoom?.botTimers.push(t2);
    }, 800);

    this.localRoom.botTimers.push(t1);
  }

  private getLocalRoomInfo(): RoomInfo {
    return {
      roomId: this.localRoom?.id || '',
      hostName: this.localRoom?.players[0]?.username || 'You',
      playerCount: this.localRoom?.players.length || 1,
      maxPlayers: 6,
      isStarted: this.localRoom?.gameState?.isStarted || false
    };
  }
}

export const network = new NetworkClient();
