import Peer, { DataConnection } from 'peerjs';
import { Card, GameState, Player, RoomInfo, EmojiReaction } from '../types/game';
import { Phase10Engine } from '../engine/Phase10Engine';
import { Phase10Bot } from '../engine/Phase10Bot';

export type P2PEventType =
  | 'INIT'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'ROOM_STATE'
  | 'GAME_STATE'
  | 'EMOJI_REACTION'
  | 'ERROR'
  | 'CONNECTION_STATUS';

export class P2PClient {
  private peer: Peer | null = null;
  public peerId: string = '';
  public playerId: string = localStorage.getItem('phase10_player_id') || `p_${Math.random().toString(36).substring(2, 9)}`;
  public isHost: boolean = false;
  public roomId?: string;
  public isConnected: boolean = false;

  // Host state
  private connections: Map<string, DataConnection> = new Map(); // peerId -> DataConnection
  private playerPeerMap: Map<string, string> = new Map(); // playerId -> peerId
  private roomData?: {
    id: string;
    name: string;
    hostPlayerId: string;
    players: Player[];
    gameState?: GameState;
    drawPile: Card[];
    botTimers: NodeJS.Timeout[];
    activeTurnSessionId: number;
  };

  // Client connection to host
  private hostConnection: DataConnection | null = null;

  private listeners: Map<P2PEventType, Array<(data: any) => void>> = new Map();

  constructor() {
    localStorage.setItem('phase10_player_id', this.playerId);
  }

  public initPeer(customId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        resolve(this.peer.id);
        return;
      }

      const options = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      };

      this.peer = customId ? new Peer(customId, options) : new Peer(options);

      this.peer.on('open', (id) => {
        this.peerId = id;
        this.isConnected = true;
        this.emit('CONNECTION_STATUS', { connected: true, peerId: id });
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.warn('P2P Peer error:', err);
        this.emit('ERROR', {
          messageEn: `P2P Network error: ${err.message}`,
          messageAr: `خطأ في شبكة الاتصال المباشر: ${err.message}`
        });
      });
    });
  }

  public on(event: P2PEventType, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: P2PEventType, callback: (data: any) => void) {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(event, list.filter((cb) => cb !== callback));
  }

  private emit(event: P2PEventType, data: any) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => cb(data));
    }
  }

  // --- HOST: CREATE ROOM ---
  public async createRoom(username: string, avatar: string, avatarColor: string, roomName?: string) {
    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customPeerId = `p10-${shortCode.toLowerCase()}`;
    await this.initPeer(customPeerId);
    this.isHost = true;
    this.roomId = shortCode;

    const hostPlayer: Player = {
      id: this.playerId,
      username: username || 'Host',
      avatar: avatar || '👑',
      avatarColor: avatarColor || '#3b82f6',
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

    this.roomData = {
      id: this.roomId,
      name: roomName || `Room ${this.roomId}`,
      hostPlayerId: this.playerId,
      players: [hostPlayer],
      drawPile: [],
      botTimers: [],
      activeTurnSessionId: 0
    };

    // Listen for incoming peer connections from guests
    this.peer?.on('connection', (conn) => {
      this.handleIncomingGuestConnection(conn);
    });

    const roomInfo = this.getPublicRoomInfo();
    this.emit('ROOM_CREATED', { roomId: this.roomId, room: roomInfo });
    this.emit('ROOM_STATE', { room: roomInfo, players: this.roomData.players });
  }

  private handleIncomingGuestConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data: any) => {
      this.handleGuestMessage(conn, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.roomData) {
        // Find player associated with this peer
        for (const [pId, peerId] of this.playerPeerMap.entries()) {
          if (peerId === conn.peer) {
            const player = this.roomData.players.find((p) => p.id === pId);
            if (player) player.connected = false;
          }
        }
        this.broadcastRoomState();
      }
    });
  }

  private handleGuestMessage(conn: DataConnection, msg: any) {
    if (!this.roomData) return;

    switch (msg.type) {
      case 'JOIN_ROOM': {
        const guestPlayerId = msg.playerId || `p_${Math.random().toString(36).substring(2, 7)}`;
        this.playerPeerMap.set(guestPlayerId, conn.peer);

        let player = this.roomData.players.find((p) => p.id === guestPlayerId);
        if (player) {
          player.connected = true;
          player.username = msg.username || player.username;
          player.avatar = msg.avatar || player.avatar;
          player.avatarColor = msg.avatarColor || player.avatarColor;
        } else {
          if (this.roomData.players.length >= 6) {
            conn.send({ type: 'ERROR', messageEn: 'Room is full (Max 6 players)', messageAr: 'الغرفة ممتلئة (الحد الأقصى 6 لاعبين)' });
            return;
          }
          player = {
            id: guestPlayerId,
            username: msg.username || `Player ${this.roomData.players.length + 1}`,
            avatar: msg.avatar || '🎮',
            avatarColor: msg.avatarColor || '#ef4444',
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
          this.roomData.players.push(player);
        }

        conn.send({ type: 'ROOM_JOINED', roomId: this.roomData.id, room: this.getPublicRoomInfo() });
        this.broadcastRoomState();
        if (this.roomData.gameState) {
          conn.send({ type: 'GAME_STATE', gameState: this.roomData.gameState });
        }
        break;
      }

      case 'DRAW_CARD': {
        if (!this.roomData.gameState || this.roomData.gameState.turnStage !== 'DRAW') return;
        const active = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        if (active.id !== msg.playerId) return;

        const { newState, newDrawPile } = Phase10Engine.handleDraw(this.roomData.gameState, this.roomData.drawPile, msg.source);
        this.roomData.gameState = newState;
        this.roomData.drawPile = newDrawPile;
        this.broadcastGameState();
        break;
      }

      case 'LAY_PHASE': {
        if (!this.roomData.gameState || this.roomData.gameState.turnStage !== 'PLAY_OR_DISCARD') return;
        const active = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        if (active.id !== msg.playerId) return;

        const res = Phase10Engine.handleLayPhase(this.roomData.gameState, msg.groups);
        this.roomData.gameState = res.newState;
        if (!res.success) {
          conn.send({ type: 'ERROR', messageEn: res.errorEn, messageAr: res.errorAr });
        } else {
          this.broadcastGameState();
        }
        break;
      }

      case 'HIT_PHASE': {
        if (!this.roomData.gameState || this.roomData.gameState.turnStage !== 'PLAY_OR_DISCARD') return;
        const active = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        if (active.id !== msg.playerId) return;

        const res = Phase10Engine.handleHitPhase(this.roomData.gameState, msg.cardId, msg.targetPlayerId, msg.targetPartIndex);
        this.roomData.gameState = res.newState;
        if (!res.success) {
          conn.send({ type: 'ERROR', messageEn: res.errorEn, messageAr: res.errorAr });
        } else {
          this.broadcastGameState();
        }
        break;
      }

      case 'DISCARD_CARD': {
        if (!this.roomData.gameState || this.roomData.gameState.turnStage !== 'PLAY_OR_DISCARD') return;
        const active = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        if (active.id !== msg.playerId) return;

        const res = Phase10Engine.handleDiscard(this.roomData.gameState, msg.cardId, msg.targetSkipPlayerId);
        if (res.errorEn) {
          conn.send({ type: 'ERROR', messageEn: res.errorEn, messageAr: res.errorAr });
          return;
        }

        this.roomData.gameState = res.newState;
        this.broadcastGameState();

        if (!res.isRoundOver && !res.isGameOver) {
          this.checkBotTurn();
        }
        break;
      }

      case 'SEND_EMOJI': {
        const rx: EmojiReaction = {
          id: `em_${Date.now()}_${Math.random()}`,
          playerId: msg.playerId,
          emoji: msg.emoji,
          timestamp: Date.now()
        };
        this.broadcast({ type: 'EMOJI_REACTION', reaction: rx });
        this.emit('EMOJI_REACTION', { reaction: rx });
        break;
      }
    }
  }

  // --- CLIENT: JOIN ROOM BY HOST PEER ID OR ROOM CODE ---
  public async joinRoom(hostPeerIdOrCode: string, username: string, avatar: string, avatarColor: string) {
    await this.initPeer();
    this.isHost = false;

    // Clean up any previous host connection
    if (this.hostConnection) {
      this.hostConnection.close();
    }

    let targetPeerId = hostPeerIdOrCode.trim();
    if (!targetPeerId.startsWith('p10-') && targetPeerId.length <= 6) {
      targetPeerId = `p10-${targetPeerId.toLowerCase()}`;
    }
    console.log(`Connecting to Host Peer: ${targetPeerId}`);

    const conn = this.peer!.connect(targetPeerId, { reliable: true });
    this.hostConnection = conn;

    conn.on('open', () => {
      console.log('✅ Connected to P2P Host!');
      conn.send({
        type: 'JOIN_ROOM',
        playerId: this.playerId,
        username,
        avatar,
        avatarColor
      });
    });

    conn.on('data', (data: any) => {
      this.emit(data.type, data);
    });

    conn.on('error', (err) => {
      console.warn('Host connection error:', err);
      this.emit('ERROR', {
        messageEn: 'Could not connect to host. Make sure the Room/Host Code is correct.',
        messageAr: 'تعذر الاتصال بالمضيف. تأكد من صحة رمز الغرفة/المضيف.'
      });
    });
  }

  // --- HOST ACTIONS ---
  public addBot(difficulty: 'EASY' | 'MEDIUM' | 'MASTER' = 'MEDIUM') {
    if (!this.isHost || !this.roomData || this.roomData.players.length >= 6) return;

    const botIndex = this.roomData.players.filter((p) => p.isBot).length + 1;
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
      botDifficulty: difficulty,
      hand: [],
      currentPhase: 1,
      hasLaidPhaseThisRound: false,
      laidPhases: [],
      score: 0,
      roundScore: 0,
      isSkipped: false,
      connected: true
    };

    this.roomData.players.push(botPlayer);
    this.broadcastRoomState();
  }

  public removePlayer(targetPlayerId: string) {
    if (!this.isHost || !this.roomData) return;
    this.roomData.players = this.roomData.players.filter((p) => p.id !== targetPlayerId);
    this.broadcastRoomState();
  }

  public startGame() {
    if (!this.isHost || !this.roomData || this.roomData.players.length < 2) return;
    const { state, drawPile } = Phase10Engine.startRound(this.roomData.players, 1, this.roomData.id, this.roomData.name);
    this.roomData.gameState = state;
    this.roomData.drawPile = drawPile;

    this.broadcastGameState();
    this.checkBotTurn();
  }

  public nextRound() {
    if (!this.isHost || !this.roomData || !this.roomData.gameState) return;
    const nextRoundNum = this.roomData.gameState.roundNumber + 1;
    const { state, drawPile } = Phase10Engine.startRound(
      this.roomData.gameState.players,
      nextRoundNum,
      this.roomData.id,
      this.roomData.name,
      nextRoundNum - 1
    );
    this.roomData.gameState = state;
    this.roomData.drawPile = drawPile;

    this.broadcastGameState();
    this.checkBotTurn();
  }

  public drawCard(source: 'DRAW' | 'DISCARD') {
    if (this.isHost) {
      if (!this.roomData?.gameState) return;
      const { newState, newDrawPile } = Phase10Engine.handleDraw(this.roomData.gameState, this.roomData.drawPile, source);
      this.roomData.gameState = newState;
      this.roomData.drawPile = newDrawPile;
      this.broadcastGameState();
    } else {
      this.hostConnection?.send({ type: 'DRAW_CARD', playerId: this.playerId, source });
    }
  }

  public layPhase(groups: Card[][]) {
    if (this.isHost) {
      if (!this.roomData?.gameState) return;
      const res = Phase10Engine.handleLayPhase(this.roomData.gameState, groups);
      this.roomData.gameState = res.newState;
      if (!res.success) {
        this.emit('ERROR', { messageEn: res.errorEn, messageAr: res.errorAr });
      } else {
        this.broadcastGameState();
      }
    } else {
      this.hostConnection?.send({ type: 'LAY_PHASE', playerId: this.playerId, groups });
    }
  }

  public hitPhase(cardId: string, targetPlayerId: string, targetPartIndex: number) {
    if (this.isHost) {
      if (!this.roomData?.gameState) return;
      const res = Phase10Engine.handleHitPhase(this.roomData.gameState, cardId, targetPlayerId, targetPartIndex);
      this.roomData.gameState = res.newState;
      if (!res.success) {
        this.emit('ERROR', { messageEn: res.errorEn, messageAr: res.errorAr });
      } else {
        this.broadcastGameState();
      }
    } else {
      this.hostConnection?.send({ type: 'HIT_PHASE', playerId: this.playerId, cardId, targetPlayerId, targetPartIndex });
    }
  }

  public discardCard(cardId: string, targetSkipPlayerId?: string) {
    if (this.isHost) {
      if (!this.roomData?.gameState) return;
      const res = Phase10Engine.handleDiscard(this.roomData.gameState, cardId, targetSkipPlayerId);
      if (res.errorEn) {
        this.emit('ERROR', { messageEn: res.errorEn, messageAr: res.errorAr });
        return;
      }
      this.roomData.gameState = res.newState;
      this.broadcastGameState();

      if (!res.isRoundOver && !res.isGameOver) {
        this.checkBotTurn();
      }
    } else {
      this.hostConnection?.send({ type: 'DISCARD_CARD', playerId: this.playerId, cardId, targetSkipPlayerId });
    }
  }

  public sendEmoji(emoji: string) {
    if (this.isHost) {
      const rx: EmojiReaction = {
        id: `em_${Date.now()}_${Math.random()}`,
        playerId: this.playerId,
        emoji,
        timestamp: Date.now()
      };
      this.broadcast({ type: 'EMOJI_REACTION', reaction: rx });
      this.emit('EMOJI_REACTION', { reaction: rx });
    } else {
      this.hostConnection?.send({ type: 'SEND_EMOJI', playerId: this.playerId, emoji });
    }
  }

  private clearBotTimers() {
    if (this.roomData?.botTimers) {
      this.roomData.botTimers.forEach((t) => clearTimeout(t));
      this.roomData.botTimers = [];
    }
    if (this.roomData) {
      this.roomData.activeTurnSessionId = (this.roomData.activeTurnSessionId || 0) + 1;
    }
  }

  private checkBotTurn() {
    this.clearBotTimers();

    if (!this.roomData?.gameState || this.roomData.gameState.turnStage === 'ROUND_OVER' || this.roomData.gameState.turnStage === 'GAME_OVER')
      return;

    const currentTurnIndex = this.roomData.gameState.activePlayerIndex;
    const activePlayer = this.roomData.gameState.players[currentTurnIndex];
    if (!activePlayer || !activePlayer.isBot) return;

    const thisSessionId = this.roomData.activeTurnSessionId;

    // 1. Bot Draw
    const t1 = setTimeout(() => {
      if (!this.roomData?.gameState || this.roomData.activeTurnSessionId !== thisSessionId) return;
      const bot = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
      if (!bot || !bot.isBot || this.roomData.gameState.turnStage !== 'DRAW') return;

      const topDiscard = this.roomData.gameState.discardPile[this.roomData.gameState.discardPile.length - 1];
      const drawSource = Phase10Bot.decideDraw(bot, topDiscard, this.roomData.gameState);

      const drawRes = Phase10Engine.handleDraw(this.roomData.gameState, this.roomData.drawPile, drawSource);
      this.roomData.gameState = drawRes.newState;
      this.roomData.drawPile = drawRes.newDrawPile;
      this.broadcastGameState();

      // 2. Bot Lay Phase / Hit
      const t2 = setTimeout(() => {
        if (!this.roomData?.gameState || this.roomData.activeTurnSessionId !== thisSessionId) return;
        let currentBot = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        if (!currentBot || !currentBot.isBot || this.roomData.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

        if (!currentBot.hasLaidPhaseThisRound) {
          const foundPhase = Phase10Bot.findPhaseInHand(currentBot.hand, currentBot.currentPhase);
          if (foundPhase) {
            const layRes = Phase10Engine.handleLayPhase(this.roomData.gameState, foundPhase);
            if (layRes.success) {
              this.roomData.gameState = layRes.newState;
              this.broadcastGameState();
              currentBot = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
            }
          }
        }

        if (currentBot && currentBot.hasLaidPhaseThisRound) {
          const hits = Phase10Bot.findHits(currentBot, this.roomData.gameState);
          for (const hit of hits) {
            const hitRes = Phase10Engine.handleHitPhase(this.roomData.gameState, hit.cardId, hit.targetPlayerId, hit.targetPartIndex);
            if (hitRes.success) {
              this.roomData.gameState = hitRes.newState;
            }
          }
          this.broadcastGameState();
          currentBot = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
        }

        // 3. Bot Discard
        const t3 = setTimeout(() => {
          if (!this.roomData?.gameState || this.roomData.activeTurnSessionId !== thisSessionId) return;
          const finalBot = this.roomData.gameState.players[this.roomData.gameState.activePlayerIndex];
          if (!finalBot || !finalBot.isBot || this.roomData.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

          const discardChoice = Phase10Bot.chooseDiscard(finalBot, this.roomData.gameState);

          const discardRes = Phase10Engine.handleDiscard(
            this.roomData.gameState,
            discardChoice.cardId,
            discardChoice.targetSkipPlayerId
          );
          this.roomData.gameState = discardRes.newState;
          this.broadcastGameState();

          if (!discardRes.isRoundOver && !discardRes.isGameOver) {
            this.checkBotTurn();
          }
        }, 600);

        this.roomData?.botTimers.push(t3);
      }, 600);

      this.roomData?.botTimers.push(t2);
    }, 800);

    this.roomData.botTimers.push(t1);
  }

  private broadcast(message: object) {
    const payload = message;
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(payload);
      }
    }
  }

  private broadcastRoomState() {
    if (!this.roomData) return;
    const info = this.getPublicRoomInfo();
    const data = {
      type: 'ROOM_STATE',
      room: info,
      players: this.roomData.players
    };
    this.broadcast(data);
    this.emit('ROOM_STATE', data);
  }

  private broadcastGameState() {
    if (!this.roomData?.gameState) return;
    const data = {
      type: 'GAME_STATE',
      gameState: this.roomData.gameState
    };
    this.broadcast(data);
    this.emit('GAME_STATE', data);
  }

  private getPublicRoomInfo(): RoomInfo {
    return {
      roomId: this.roomId || this.roomData?.id || this.peerId || '',
      hostName: this.roomData?.players[0]?.username || 'Host',
      playerCount: this.roomData?.players.length || 1,
      maxPlayers: 6,
      isStarted: this.roomData?.gameState?.isStarted || false
    };
  }
}

export const p2pClient = new P2PClient();
