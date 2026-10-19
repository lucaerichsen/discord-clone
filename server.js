import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

// --- HTTP SERVER ---
const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];

  // API Network Info
  if (reqUrl === '/api/network') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      localIp,
      port: PORT,
      localUrl: `http://localhost:${PORT}`,
      networkUrl: `http://${localIp}:${PORT}`
    }));
    return;
  }

  if (reqUrl === '/' || reqUrl === '/canais/@me') reqUrl = '/index.html';

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

// --- WEBSOCKET SERVER (WebRTC Signaling + Chat Broadcast) ---
const wss = new WebSocketServer({ server });

// Map of peerId -> { ws, peerId, user, channelId, voiceChannelId, isSpeaking, isMuted, isDeafened, isScreenSharing }
const clients = new Map();

function broadcast(data, filterFn = null) {
  const payload = JSON.stringify(data);
  for (const [peerId, client] of clients.entries()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filterFn || filterFn(client, peerId)) {
        client.ws.send(payload);
      }
    }
  }
}

// Return current voice roster: { [voiceChannelId]: [ { peerId, user, isSpeaking, isMuted, isDeafened, isScreenSharing } ] }
function getVoiceRoomsRoster() {
  const roster = {};
  for (const [peerId, client] of clients.entries()) {
    if (client.voiceChannelId) {
      if (!roster[client.voiceChannelId]) {
        roster[client.voiceChannelId] = [];
      }
      roster[client.voiceChannelId].push({
        peerId,
        user: client.user,
        isSpeaking: !!client.isSpeaking,
        isMuted: !!client.isMuted,
        isDeafened: !!client.isDeafened,
        isScreenSharing: !!client.isScreenSharing
      });
    }
  }
  return roster;
}

// Broadcast voice roster to ALL clients on the server
function broadcastVoiceRoster() {
  broadcast({
    type: 'voice:roster_update',
    roster: getVoiceRoomsRoster()
  });
}

wss.on('connection', (ws) => {
  const peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
  
  clients.set(peerId, {
    ws,
    peerId,
    user: {
      id: peerId,
      name: 'Amigo ' + peerId.slice(-4),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
      status: 'online'
    },
    channelId: 'geral',
    voiceChannelId: null,
    isSpeaking: false,
    isMuted: false,
    isDeafened: false,
    isScreenSharing: false
  });

  // Send initial handshake with peer ID and current global voice roster
  ws.send(JSON.stringify({
    type: 'init',
    peerId,
    networkUrl: `http://${localIp}:${PORT}`,
    voiceRoster: getVoiceRoomsRoster()
  }));

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);
      const client = clients.get(peerId);
      if (!client) return;

      switch (data.type) {
        case 'user:identify': {
          if (data.user) {
            client.user = { ...client.user, ...data.user, id: peerId };
          }
          // Broadcast updated online presence
          broadcast({
            type: 'presence:update',
            users: Array.from(clients.values()).map(c => ({
              id: c.peerId,
              user: c.user,
              channelId: c.channelId,
              voiceChannelId: c.voiceChannelId
            }))
          });
          // Broadcast voice roster so the user's custom name/avatar appears in voice tree
          broadcastVoiceRoster();
          break;
        }

        case 'chat:message': {
          broadcast({
            type: 'chat:message',
            channelId: data.channelId || client.channelId,
            message: {
              ...data.message,
              peerId,
              timestamp: Date.now()
            }
          });
          break;
        }

        case 'chat:typing': {
          broadcast({
            type: 'chat:typing',
            channelId: data.channelId || client.channelId,
            peerId,
            userName: client.user.name,
            isTyping: data.isTyping
          }, (c, id) => id !== peerId);
          break;
        }

        case 'voice:join': {
          const previousVoice = client.voiceChannelId;
          if (previousVoice && previousVoice !== data.voiceChannelId) {
            // Notify peers in previous channel that peer left call
            broadcast({
              type: 'voice:peer_left',
              voiceChannelId: previousVoice,
              peerId
            }, (c, id) => c.voiceChannelId === previousVoice && id !== peerId);
          }

          client.voiceChannelId = data.voiceChannelId;
          client.isSpeaking = false;
          client.isMuted = !!data.isMuted;

          // 1. WebRTC signaling: Send list of existing peers in this voice room
          const existingPeers = [];
          for (const [id, c] of clients.entries()) {
            if (id !== peerId && c.voiceChannelId === data.voiceChannelId) {
              existingPeers.push({
                peerId: id,
                user: c.user,
                isSpeaking: !!c.isSpeaking,
                isMuted: !!c.isMuted,
                isVideo: !!c.isScreenSharing
              });
            }
          }

          ws.send(JSON.stringify({
            type: 'voice:existing_peers',
            voiceChannelId: data.voiceChannelId,
            peers: existingPeers
          }));

          // 2. WebRTC signaling: Notify peers in this voice room that a new peer joined
          broadcast({
            type: 'voice:peer_joined',
            voiceChannelId: data.voiceChannelId,
            peer: {
              peerId,
              user: client.user,
              isMuted: client.isMuted,
              isSpeaking: false
            }
          }, (c, id) => c.voiceChannelId === data.voiceChannelId && id !== peerId);

          // 3. GLOBAL BROADCAST: Notify ALL clients on server so voice tree updates in sidebar!
          broadcastVoiceRoster();

          // 4. Update presence
          broadcast({
            type: 'presence:update',
            users: Array.from(clients.values()).map(c => ({
              id: c.peerId,
              user: c.user,
              channelId: c.channelId,
              voiceChannelId: c.voiceChannelId
            }))
          });
          break;
        }

        case 'voice:signal': {
          // Direct WebRTC signaling relay (offer, answer, ice-candidate)
          const target = clients.get(data.targetPeerId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'voice:signal',
              senderPeerId: peerId,
              signal: data.signal
            }));
          }
          break;
        }

        case 'voice:speaking': {
          client.isSpeaking = !!data.isSpeaking;
          // Broadcast speaking state globally to ALL clients so sidebar green ring updates
          broadcast({
            type: 'voice:speaking',
            peerId,
            voiceChannelId: client.voiceChannelId,
            isSpeaking: !!data.isSpeaking
          });
          break;
        }

        case 'voice:mute': {
          client.isMuted = !!data.isMuted;
          broadcast({
            type: 'voice:mute',
            peerId,
            voiceChannelId: client.voiceChannelId,
            isMuted: client.isMuted
          });
          broadcastVoiceRoster();
          break;
        }

        case 'voice:state': {
          if (data.state) {
            if (data.state.isMuted !== undefined) client.isMuted = !!data.state.isMuted;
            if (data.state.isDeafened !== undefined) client.isDeafened = !!data.state.isDeafened;
            if (data.state.isScreenSharing !== undefined) client.isScreenSharing = !!data.state.isScreenSharing;
          }
          broadcast({
            type: 'voice:state',
            peerId,
            voiceChannelId: client.voiceChannelId,
            state: data.state
          });
          broadcastVoiceRoster();
          break;
        }

        case 'voice:leave': {
          const vChannel = client.voiceChannelId;
          client.voiceChannelId = null;
          client.isSpeaking = false;
          if (vChannel) {
            broadcast({
              type: 'voice:peer_left',
              voiceChannelId: vChannel,
              peerId
            }, (c, id) => c.voiceChannelId === vChannel && id !== peerId);
          }
          // Global roster update
          broadcastVoiceRoster();

          broadcast({
            type: 'presence:update',
            users: Array.from(clients.values()).map(c => ({
              id: c.peerId,
              user: c.user,
              channelId: c.channelId,
              voiceChannelId: c.voiceChannelId
            }))
          });
          break;
        }
      }
    } catch (e) {
      console.error('[WebSocket Error]', e);
    }
  });

  ws.on('close', () => {
    const client = clients.get(peerId);
    if (client && client.voiceChannelId) {
      broadcast({
        type: 'voice:peer_left',
        voiceChannelId: client.voiceChannelId,
        peerId
      }, (c, id) => c.voiceChannelId === client.voiceChannelId && id !== peerId);
    }
    clients.delete(peerId);

    // Global roster update
    broadcastVoiceRoster();

    broadcast({
      type: 'presence:update',
      users: Array.from(clients.values()).map(c => ({
        id: c.peerId,
        user: c.user,
        channelId: c.channelId,
        voiceChannelId: c.voiceChannelId
      }))
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`[Discord Clone] Servidor Online!`);
  console.log(`> Local: http://localhost:${PORT}`);
  console.log(`> Rede Local (Compartilhar com Amigos): http://${localIp}:${PORT}`);
  console.log(`=======================================================`);
});
