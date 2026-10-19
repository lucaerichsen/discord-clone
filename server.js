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

// Map of peerId -> { ws, user, channelId, voiceChannelId }
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
    voiceChannelId: null
  });

  // Send initial handshake with peer ID
  ws.send(JSON.stringify({
    type: 'init',
    peerId,
    networkUrl: `http://${localIp}:${PORT}`
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
          if (previousVoice) {
            // Notify others in previous channel that peer left
            broadcast({
              type: 'voice:peer_left',
              voiceChannelId: previousVoice,
              peerId
            }, (c, id) => c.voiceChannelId === previousVoice && id !== peerId);
          }

          client.voiceChannelId = data.voiceChannelId;

          // Get list of existing peers in this voice channel
          const existingPeers = [];
          for (const [id, c] of clients.entries()) {
            if (id !== peerId && c.voiceChannelId === data.voiceChannelId) {
              existingPeers.push({
                peerId: id,
                user: c.user,
                isSpeaking: false,
                isMuted: false,
                isVideo: false
              });
            }
          }

          // Reply to the joining peer with the existing peers in this room
          ws.send(JSON.stringify({
            type: 'voice:existing_peers',
            voiceChannelId: data.voiceChannelId,
            peers: existingPeers
          }));

          // Notify other peers in this room that a new peer joined
          broadcast({
            type: 'voice:peer_joined',
            voiceChannelId: data.voiceChannelId,
            peer: {
              peerId,
              user: client.user
            }
          }, (c, id) => c.voiceChannelId === data.voiceChannelId && id !== peerId);

          // Update presence
          broadcast({
            type: 'presence:update',
            users: Array.from(clients.values()).map(c => ({
              id: c.peerId,
              user: c.user,
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
          broadcast({
            type: 'voice:speaking',
            peerId,
            voiceChannelId: client.voiceChannelId,
            isSpeaking: !!data.isSpeaking
          }, (c, id) => c.voiceChannelId === client.voiceChannelId && id !== peerId);
          break;
        }

        case 'voice:state': {
          broadcast({
            type: 'voice:state',
            peerId,
            voiceChannelId: client.voiceChannelId,
            state: data.state
          }, (c, id) => c.voiceChannelId === client.voiceChannelId && id !== peerId);
          break;
        }

        case 'voice:leave': {
          const vChannel = client.voiceChannelId;
          client.voiceChannelId = null;
          if (vChannel) {
            broadcast({
              type: 'voice:peer_left',
              voiceChannelId: vChannel,
              peerId
            }, (c, id) => c.voiceChannelId === vChannel && id !== peerId);
          }
          broadcast({
            type: 'presence:update',
            users: Array.from(clients.values()).map(c => ({
              id: c.peerId,
              user: c.user,
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

    broadcast({
      type: 'presence:update',
      users: Array.from(clients.values()).map(c => ({
        id: c.peerId,
        user: c.user,
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
