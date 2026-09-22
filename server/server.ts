import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import localtunnel from 'localtunnel';
import { Card, GameState, Player, RoomInfo, EmojiReaction } from '../src/types/game';
import { Phase10Engine } from '../src/engine/Phase10Engine';
import { Phase10Bot } from '../src/engine/Phase10Bot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

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
  botTimers: NodeJS.Timeout[];
  activeTurnSessionId: number;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
let publicTunnelUrl: string | undefined;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.apk': 'application/vnd.android.package-archive'
};

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

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ lanIp: getLocalIpAddress(), port: PORT, publicUrl: publicTunnelUrl }));
    return;
  }

  // Handle direct /download route
  if (req.url === '/download' || req.url === '/download-apk') {
    const apkPath = path.join(DIST_DIR, 'Phase10_Game.apk');
    if (fs.existsSync(apkPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="Phase10_Mobile_Game.apk"'
      });
      fs.createReadStream(apkPath).pipe(res);
      return;
    }
  }

  // Static File Serving from dist/
  let reqPath = req.url?.split('?')[0] || '/';
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security check
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
    };

    if (ext === '.apk') {
      headers['Content-Disposition'] = 'attachment; filename="Phase10_Mobile_Game.apk"';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map<WebSocket, ConnectedClient>();
const rooms = new Map<string, RoomData>();

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

  // Send initial connected handshake with LAN IP and Public Tunnel URL
  ws.send(
    JSON.stringify({
      type: 'INIT',
      playerId: client.playerId,
      lanIp: getLocalIpAddress(),
      port: PORT,
      publicUrl: publicTunnelUrl
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
        if (activeHumans.length === 0 && !room.gameState?.isStarted) {
          clearRoomBotTimers(room);
          rooms.delete(client.roomId);
        } else {
          broadcastRoomState(room);
        }
      }
    }
    clients.delete(ws);
  });
});

function handleMessage(ws: WebSocket, client: ConnectedClient, msg: any) {
  switch (msg.type) {
    case 'HELLO': {
      if (msg.playerId) {
        client.playerId = msg.playerId;
      }

      ws.send(
        JSON.stringify({
          type: 'INIT',
          playerId: client.playerId,
          lanIp: getLocalIpAddress(),
          port: PORT,
          publicUrl: publicTunnelUrl
        })
      );

      // If reconnecting to an existing room
      if (msg.roomId && rooms.has(msg.roomId)) {
        const room = rooms.get(msg.roomId)!;
        const player = room.players.find((p) => p.id === client.playerId);
        if (player) {
          player.connected = true;
          client.roomId = msg.roomId;
          ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomId: room.id, room: getPublicRoomInfo(room) }));
          broadcastRoomState(room);
          if (room.gameState) {
            ws.send(JSON.stringify({ type: 'GAME_STATE', gameState: room.gameState }));
          }
        }
      }
      break;
    }

    case 'CREATE_ROOM': {
      if (msg.playerId) {
        client.playerId = msg.playerId;
      }
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
        drawPile: [],
        botTimers: [],
        activeTurnSessionId: 0
      };

      rooms.set(roomId, room);
      client.roomId = roomId;

      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, room: getPublicRoomInfo(room) }));
      broadcastRoomState(room);
      break;
    }

    case 'JOIN_ROOM': {
      if (msg.playerId) {
        client.playerId = msg.playerId;
      }
      const roomId = (msg.roomId || '').toUpperCase();
      const room = rooms.get(roomId);

      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Room not found! Check the 4-letter code.', messageAr: 'الغرفة غير موجودة! تأكد من رمز الغرفة المكون من 4 أحرف.' }));
        return;
      }

      // Check if existing player is reconnecting
      const existingPlayer = room.players.find((p) => p.id === client.playerId);
      if (existingPlayer) {
        existingPlayer.connected = true;
        if (msg.username) existingPlayer.username = msg.username;
        if (msg.avatar) existingPlayer.avatar = msg.avatar;
        if (msg.avatarColor) existingPlayer.avatarColor = msg.avatarColor;
        client.roomId = roomId;

        ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomId, room: getPublicRoomInfo(room) }));
        broadcastRoomState(room);
        if (room.gameState) {
          ws.send(JSON.stringify({ type: 'GAME_STATE', gameState: room.gameState }));
        }
        return;
      }

      if (room.gameState?.isStarted) {
        ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Game already in progress in this room', messageAr: 'اللعبة قد بدأت بالفعل في هذه الغرفة' }));
        return;
      }

      if (room.players.length >= 6) {
        ws.send(JSON.stringify({ type: 'ERROR', messageEn: 'Room is full (Max 6 players)', messageAr: 'الغرفة ممتلئة (الحد الأقصى 6 لاعبين)' }));
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
      if (result.errorEn) {
        ws.send(JSON.stringify({ type: 'ERROR', messageEn: result.errorEn, messageAr: result.errorAr }));
        return;
      }

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

function clearRoomBotTimers(room: RoomData) {
  if (room.botTimers && room.botTimers.length > 0) {
    room.botTimers.forEach((t) => clearTimeout(t));
    room.botTimers = [];
  }
  room.activeTurnSessionId = (room.activeTurnSessionId || 0) + 1;
}

function checkBotTurn(room: RoomData) {
  clearRoomBotTimers(room);

  if (!room.gameState || room.gameState.turnStage === 'ROUND_OVER' || room.gameState.turnStage === 'GAME_OVER') return;

  const currentTurnIndex = room.gameState.activePlayerIndex;
  const activePlayer = room.gameState.players[currentTurnIndex];
  if (!activePlayer || !activePlayer.isBot) return;

  const thisSessionId = room.activeTurnSessionId;

  // 1. Bot Draw Step
  const t1 = setTimeout(() => {
    if (room.activeTurnSessionId !== thisSessionId || !room.gameState) return;
    const bot = room.gameState.players[room.gameState.activePlayerIndex];
    if (!bot || !bot.isBot || room.gameState.turnStage !== 'DRAW') return;

    const topDiscard = room.gameState.discardPile[room.gameState.discardPile.length - 1];
    const drawSource = Phase10Bot.decideDraw(bot, topDiscard, room.gameState);

    const drawRes = Phase10Engine.handleDraw(room.gameState, room.drawPile, drawSource);
    room.gameState = drawRes.newState;
    room.drawPile = drawRes.newDrawPile;
    broadcastGameState(room);

    // 2. Bot Lay Phase / Hit Step
    const t2 = setTimeout(() => {
      if (room.activeTurnSessionId !== thisSessionId || !room.gameState) return;
      let currentBot = room.gameState.players[room.gameState.activePlayerIndex];
      if (!currentBot || !currentBot.isBot || room.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

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

      if (currentBot && currentBot.hasLaidPhaseThisRound) {
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
      const t3 = setTimeout(() => {
        if (room.activeTurnSessionId !== thisSessionId || !room.gameState) return;
        const finalBot = room.gameState.players[room.gameState.activePlayerIndex];
        if (!finalBot || !finalBot.isBot || room.gameState.turnStage !== 'PLAY_OR_DISCARD') return;

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
      }, 700);

      room.botTimers.push(t3);
    }, 700);

    room.botTimers.push(t2);
  }, 800);

  room.botTimers.push(t1);
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

import QRCode from 'qrcode';

function broadcastPublicUrl(url: string) {
  publicTunnelUrl = url;
  console.log(`\n=======================================================`);
  console.log(`  🌍 GLOBAL ONLINE HTTPS URL ACQUIRED:`);
  console.log(`  ${publicTunnelUrl}`);
  console.log(`=======================================================\n`);

  // Write URL to disk for easy reference
  try {
    fs.writeFileSync(path.resolve(__dirname, '../PUBLIC_PHASE10_URL.txt'), url, 'utf8');
    fs.writeFileSync(path.resolve(__dirname, '../../PUBLIC_PHASE10_URL.txt'), url, 'utf8');
    
    // Generate QR Code PNG
    QRCode.toFile(path.resolve(__dirname, '../phase10_public_qr.png'), url, { width: 300, margin: 1 });
    QRCode.toFile(path.resolve(__dirname, '../../phase10_public_qr.png'), url, { width: 300, margin: 1 });
  } catch (e) {
    console.warn('Error saving public URL file:', e);
  }

  // Broadcast new public URL to all connected clients
  for (const [ws, client] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'INIT',
          playerId: client.playerId,
          lanIp: getLocalIpAddress(),
          port: PORT,
          publicUrl: publicTunnelUrl
        })
      );
    }
  }
}

async function startOnlineTunnel() {
  console.log(`  ⏳ Starting Cloudflare Secure Global Internet Tunnel on port ${PORT}...`);
  
  const localExePath = path.resolve(__dirname, '../cloudflared.exe');
  const siblingExePath = path.resolve(__dirname, '../../star_spotter_ar/cloudflared.exe');
  let exeToUse = '';
  if (fs.existsSync(localExePath)) {
    exeToUse = localExePath;
  } else if (fs.existsSync(siblingExePath)) {
    exeToUse = siblingExePath;
  }

  if (!exeToUse) {
    console.error('❌ Cloudflare binary not found in local or sibling directory.');
    return;
  }

  console.log(`  🚀 Using native Cloudflare binary: ${exeToUse}`);
  
  let attempts = 0;
  const maxAttempts = 10;

  function launchTunnel() {
    attempts++;
    console.log(`  🌐 Connecting to Cloudflare Secure Edge (Attempt ${attempts}/${maxAttempts})...`);
    const cfProc = spawn(exeToUse, ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--no-autoupdate']);

    let tunnelAcquired = false;

    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !tunnelAcquired) {
        tunnelAcquired = true;
        broadcastPublicUrl(match[0]);
      }
    };

    cfProc.stdout.on('data', handleData);
    cfProc.stderr.on('data', handleData);

    cfProc.on('error', (err) => {
      console.warn(`Cloudflare process error (attempt ${attempts}):`, err.message);
      if (!tunnelAcquired && attempts < maxAttempts) {
        setTimeout(launchTunnel, 2500);
      }
    });

    cfProc.on('close', () => {
      if (!tunnelAcquired && attempts < maxAttempts) {
        setTimeout(launchTunnel, 2500);
      }
    });

    setTimeout(() => {
      if (!tunnelAcquired && !publicTunnelUrl && attempts < maxAttempts) {
        try { cfProc.kill(); } catch (e) {}
        launchTunnel();
      }
    }, 35000);
  }

  launchTunnel();
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIpAddress();
  console.log(`=======================================================`);
  console.log(`  ⚡ PHASE 10 ULTRA-FAST MULTIPLAYER SERVER RUNNING!`);
  console.log(`  Host Local:  http://localhost:${PORT}`);
  console.log(`  Mobile LAN:  http://${ip}:${PORT}`);
  
  // Start Global Online Tunnel
  startOnlineTunnel();
});
