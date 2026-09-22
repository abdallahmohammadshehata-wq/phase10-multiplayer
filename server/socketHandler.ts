import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { Card, GameState, Player, RoomInfo, EmojiReaction } from '../src/types/game';
import { Phase10Engine } from '../src/engine/Phase10Engine';
import { Phase10Bot } from '../src/engine/Phase10Bot';

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomId?: string;
}

interface RoomData {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  gameState?: GameState;
  drawPile: Card[];
  botTurnTimer?: NodeJS.Timeout;
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<WebSocket, ConnectedClient>();
  const rooms = new Map<string, RoomData>();

  function getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  function broadcastToRoom(roomId: string, message: object) {
    const payload = JSON.stringify(message);
    for (const [ws, client] of clients.entries()) {
      if (client.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const client: ConnectedClient = {
      ws,
      playerId: `p_${Math.random().toString(36).substring(2, 9)}`
    };
    clients.set(ws, client);

    // Send initial connected handshake
    ws.send(
      JSON.stringify({
        type: 'INIT',
        playerId: client.playerId,
        lanIp: getLocalIpAddress()
      })
    );

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(ws, client, msg);
      } catch (err) {
        console.error('Error parsing client message:', err);
      }
    });

    ws.on('close', () => {
      if (client.roomId && rooms.has(client.roomId)) {
        const room = rooms.get(client.roomId)!;
        const player = room.players.find((p) => p.id === client.playerId);
        if (player) {
          player.connected = false;
          const activeHumans = room.players.filter((p) => !p.isBot && p.connected);
          if (activeHumans.length === 0) {
            if (room.botTurnTimer) clearTimeout(room.botTurnTimer);
            rooms.delete(client.roomId);
          } else {
            if (room.hostId === client.playerId) {
              room.hostId = activeHumans[0].id;
              room.players.forEach((p) => (p.isHost = p.id === room.hostId));
            }
            broadcastRoomState(room);
          }
        }
      }
      clients.delete(ws);
    });
  });

  function handleMessage(ws: WebSocket, client: ConnectedClient, msg: any) {
    switch (msg.type) {
      case 'CREATE_ROOM': {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hostPlayer: Player = {
          id: client.playerId,
          username: msg.username || 'Host Player',
          avatar: msg.avatar || '👑',
          avatarColor: msg.avatarColor || '#3b82f6',
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

        const room: RoomData = {
          id: roomId,
          name: msg.roomName || `Room ${roomId}`,
          hostId: client.playerId,
          players: [hostPlayer],
          drawPile: []
        };

        rooms.set(roomId, room);
        client.roomId = roomId;

        ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, room: getPublicRoomInfo(room) }));
        broadcastRoomState(room);
        break;
      }

      case 'JOIN_ROOM': {
        const roomId = (msg.roomId || '').toUpperCase();
        const room = rooms.get(roomId);

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Room not found', messageAr: 'الغرفة غير موجودة' }));
          return;
        }

        if (room.players.length >= 6) {
          ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Room is full (Max 6)', messageAr: 'الغرفة ممتلئة (الحد الأقصى 6)' }));
          return;
        }

        if (room.gameState?.isStarted) {
          ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Game already in progress', messageAr: 'اللعبة قد بدأت بالفعل' }));
          return;
        }

        const newPlayer: Player = {
          id: client.playerId,
          username: msg.username || `Player ${room.players.length + 1}`,
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

        room.players.push(newPlayer);
        client.roomId = roomId;

        ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomId, room: getPublicRoomInfo(room) }));
        broadcastRoomState(room);
        break;
      }

      case 'ADD_BOT': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId || room.players.length >= 6) return;

        const botIndex = room.players.filter((p) => p.isBot).length + 1;
        const botDifficulty = msg.difficulty || 'MEDIUM';
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
          botDifficulty,
          hand: [],
          currentPhase: 1,
          hasLaidPhaseThisRound: false,
          laidPhases: [],
          score: 0,
          roundScore: 0,
          isSkipped: false,
          connected: true
        };

        room.players.push(botPlayer);
        broadcastRoomState(room);
        break;
      }

      case 'REMOVE_PLAYER': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId) return;

        room.players = room.players.filter((p) => p.id !== msg.targetPlayerId);
        broadcastRoomState(room);
        break;
      }

      case 'START_GAME': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId || room.players.length < 2) return;

        const { state, drawPile } = Phase10Engine.startRound(room.players, 1, room.id, room.name);
        room.gameState = state;
        room.drawPile = drawPile;

        broadcastGameState(room);
        checkBotTurn(room);
        break;
      }

      case 'NEXT_ROUND': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId || !room.gameState) return;

        const nextRoundNum = room.gameState.roundNumber + 1;
        const { state, drawPile } = Phase10Engine.startRound(
          room.gameState.players,
          nextRoundNum,
          room.id,
          room.name,
          nextRoundNum - 1
        );
        room.gameState = state;
        room.drawPile = drawPile;

        broadcastGameState(room);
        checkBotTurn(room);
        break;
      }

      case 'DRAW_CARD': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || !room.gameState || room.gameState.turnStage !== 'DRAW') return;

        const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
        if (activePlayer.id !== client.playerId) return;

        const { newState, newDrawPile } = Phase10Engine.handleDraw(room.gameState, room.drawPile, msg.source);
        room.gameState = newState;
        room.drawPile = newDrawPile;

        broadcastGameState(room);
        break;
      }

      case 'LAY_PHASE': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || !room.gameState || room.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

        const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
        if (activePlayer.id !== client.playerId) return;

        const result = Phase10Engine.handleLayPhase(room.gameState, msg.groups);
        room.gameState = result.newState;

        if (!result.success) {
          ws.send(JSON.stringify({ type: 'ERROR', messageEn: result.errorEn, messageAr: result.errorAr }));
        } else {
          broadcastGameState(room);
        }
        break;
      }

      case 'HIT_PHASE': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || !room.gameState || room.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

        const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
        if (activePlayer.id !== client.playerId) return;

        const result = Phase10Engine.handleHitPhase(room.gameState, msg.cardId, msg.targetPlayerId, msg.targetPartIndex);
        room.gameState = result.newState;

        if (!result.success) {
          ws.send(JSON.stringify({ type: 'ERROR', messageEn: result.errorEn, messageAr: result.errorAr }));
        } else {
          broadcastGameState(room);
        }
        break;
      }

      case 'DISCARD_CARD': {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || !room.gameState || room.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

        const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
        if (activePlayer.id !== client.playerId) return;

        const result = Phase10Engine.handleDiscard(room.gameState, msg.cardId, msg.targetSkipPlayerId);
        room.gameState = result.newState;

        broadcastGameState(room);

        if (!result.isRoundOver && !result.isGameOver) {
          checkBotTurn(room);
        }
        break;
      }

      case 'SEND_EMOJI': {
        if (!client.roomId) return;
        const reaction: EmojiReaction = {
          id: `em_${Date.now()}_${Math.random()}`,
          playerId: client.playerId,
          emoji: msg.emoji,
          timestamp: Date.now()
        };
        broadcastToRoom(client.roomId, { type: 'EMOJI_REACTION', reaction });
        break;
      }
    }
  }

  function checkBotTurn(room: RoomData) {
    if (!room.gameState || room.gameState.turnStage === 'ROUND_OVER' || room.gameState.turnStage === 'GAME_OVER') return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (!activePlayer.isBot) return;

    if (room.botTurnTimer) clearTimeout(room.botTurnTimer);

    room.botTurnTimer = setTimeout(() => {
      if (!room.gameState) return;
      const bot = room.gameState.players[room.gameState.activePlayerIndex];
      if (!bot.isBot) return;

      // 1. Bot Draw Step
      const topDiscard = room.gameState.discardPile[room.gameState.discardPile.length - 1];
      const drawSource = Phase10Bot.decideDraw(bot, topDiscard, room.gameState);

      const drawRes = Phase10Engine.handleDraw(room.gameState, room.drawPile, drawSource);
      room.gameState = drawRes.newState;
      room.drawPile = drawRes.newDrawPile;
      broadcastGameState(room);

      // 2. Bot Lay Phase / Hit Step
      setTimeout(() => {
        if (!room.gameState) return;
        let currentBot = room.gameState.players[room.gameState.activePlayerIndex];

        if (!currentBot.hasLaidPhaseThisRound) {
          const foundPhase = Phase10Bot.findPhaseInHand(currentBot.hand, currentBot.currentPhase);
          if (foundPhase) {
            const layRes = Phase10Engine.handleLayPhase(room.gameState, foundPhase);
            if (layRes.success) {
              room.gameState = layRes.newState;
              broadcastGameState(room);
              currentBot = room.gameState.players[room.gameState.activePlayerIndex];
            }
          }
        }

        if (currentBot.hasLaidPhaseThisRound) {
          const hits = Phase10Bot.findHits(currentBot, room.gameState);
          for (const hit of hits) {
            const hitRes = Phase10Engine.handleHitPhase(room.gameState, hit.cardId, hit.targetPlayerId, hit.targetPartIndex);
            if (hitRes.success) {
              room.gameState = hitRes.newState;
            }
          }
          broadcastGameState(room);
          currentBot = room.gameState.players[room.gameState.activePlayerIndex];
        }

        // 3. Bot Discard Step
        setTimeout(() => {
          if (!room.gameState) return;
          const finalBot = room.gameState.players[room.gameState.activePlayerIndex];
          const discardChoice = Phase10Bot.chooseDiscard(finalBot, room.gameState);

          const discardRes = Phase10Engine.handleDiscard(
            room.gameState,
            discardChoice.cardId,
            discardChoice.targetSkipPlayerId
          );
          room.gameState = discardRes.newState;
          broadcastGameState(room);

          if (!discardRes.isRoundOver && !discardRes.isGameOver) {
            checkBotTurn(room);
          }
        }, 800);
      }, 800);
    }, 1200);
  }

  function broadcastRoomState(room: RoomData) {
    broadcastToRoom(room.id, {
      type: 'ROOM_STATE',
      room: getPublicRoomInfo(room),
      players: room.players
    });
  }

  function broadcastGameState(room: RoomData) {
    if (!room.gameState) return;
    broadcastToRoom(room.id, {
      type: 'GAME_STATE',
      gameState: room.gameState
    });
  }

  function getPublicRoomInfo(room: RoomData): RoomInfo {
    const host = room.players.find((p) => p.id === room.hostId);
    return {
      roomId: room.id,
      hostName: host?.username || 'Host',
      playerCount: room.players.length,
      maxPlayers: 6,
      isStarted: room.gameState?.isStarted || false
    };
  }
}
