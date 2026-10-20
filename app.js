/* ==========================================================================
   DISCORD CLONE — REAL-TIME WEBRTC & COLLABORATION ENGINE
   ========================================================================== */

// --- Web Audio Synthesized Authentic Discord Sound Engine ---
class DiscordSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMessagePing() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playVoiceJoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(587.33, now, 0.12);
    playTone(783.99, now + 0.12, 0.25);
  }

  playVoiceLeave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(783.99, now, 0.12);
    playTone(587.33, now + 0.12, 0.25);
  }

  playMute() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playUnmute() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

const sounds = new DiscordSoundEngine();

// --- STATE MANAGEMENT ---
const AppState = {
  viewMode: 'server', // 'server' | 'me' (Direct Messages / Friends)
  currentServerId: 'servidor-lk',
  currentChannelId: 'geral',
  currentChannelName: 'geral',
  currentChannelTopic: 'Espaço geral para trocar ideias e mensagens.',
  isVoiceConnected: false,
  connectedVoiceChannelName: null,
  connectedVoiceChannelId: null,
  isSpeaking: false,
  isMuted: false,
  isDeafened: false,
  isScreenSharing: false,
  isCameraOn: false,
  networkShareUrl: window.location.href,
  user: {
    id: localStorage.getItem('discord_uid') || 'user_' + Math.random().toString(36).substring(2, 8),
    name: localStorage.getItem('discord_uname') || 'lk',
    tag: '#0001',
    avatar: '',
    avatarInitials: 'LK',
    avatarBg: '#f47b97',
    status: 'online',
    customStatus: 'Online',
    bio: 'Desenvolvedor no Servidor de lk.',
    roles: ['Fundador', 'Admin']
  },
  theme: 'dark'
};

// --- WEBRTC RTC CONFIGURATION ---
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

// Map of peerId -> RTCPeerConnection
const peerConnections = new Map();
// Map of peerId -> { user, isSpeaking, isMuted, isVideo, voiceChannelId }
const remotePeersData = new Map();
// Global Voice Rooms Roster: channelId -> Array of { peerId, user, isSpeaking, isMuted, isDeafened, isScreenSharing }
const VoiceRoomsRoster = new Map();

let localAudioStream = null;
let localScreenStream = null;
let localCameraStream = null;
let micAudioContext = null;
let micAnalyser = null;
let micVolumeInterval = null;

// WebSocket Signaling connection
let ws = null;
let myPeerId = null;

// --- SERVERS & CHANNELS DATA ---
const defaultServersData = {
  'servidor-lk': {
    name: 'Servidor de lk',
    iconText: 'SD',
    color: '#5865f2',
    verified: false,
    categories: [
      {
        name: 'INFORMAÇÕES',
        channels: [
          { id: 'boas-vindas', name: 'boas-vindas', type: 'text', topic: 'Sejam bem-vindos ao servidor de lk!', unread: 2 },
          { id: 'regras', name: 'regras', type: 'text', topic: 'Regras e diretrizes do servidor.', unread: 2 },
          { id: 'avisos', name: 'avisos', type: 'text', topic: 'Avisos e comunicados importantes.', unread: 2 }
        ]
      },
      {
        name: 'GERAL',
        channels: [
          { id: 'geral', name: 'chat-geral', type: 'text', topic: 'Espaço geral para trocar ideias e mensagens.' },
          { id: 'links', name: 'links', type: 'text', topic: 'Compartilhe links úteis e interessantes.' },
          { id: 'memes', name: 'memes', type: 'text', topic: 'Canal dedicado aos melhores memes.' },
          { id: 'musicas', name: 'musicas', type: 'text', topic: 'Recomendações e letras de músicas.' }
        ]
      },
      {
        name: 'Geral voz',
        channels: [
          { id: 'geral-voz', name: 'Geral', type: 'voice' }
        ]
      }
    ]
  },
  'lucaverna-devs': {
    name: 'Lucaverna Devs',
    iconText: 'LD',
    color: '#23a55a',
    verified: true,
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    categories: [
      {
        name: 'Informações',
        channels: [
          { id: 'avisos', name: 'avisos', type: 'text', topic: 'Comunicados oficiais da comunidade.' },
          { id: 'regras', name: 'regras', type: 'text', topic: 'Diretrizes de convivência e conduta.' },
          { id: 'novidades', name: 'novidades', type: 'text', topic: 'Lançamentos e updates de projetos.' }
        ]
      },
      {
        name: 'Canais de texto',
        channels: [
          { id: 'dev-geral', name: 'geral', type: 'text', topic: 'Espaço geral da comunidade Lucaverna para trocar ideias e novidades.' },
          { id: 'desenvolvimento', name: 'desenvolvimento', type: 'text', topic: 'Dúvidas, código, TypeScript, React e Node.' },
          { id: 'design-ui', name: 'design-ui', type: 'text', topic: 'Showcase de interfaces, tokens e UX moderna.' },
          { id: 'ia-bots', name: 'ia-bots', type: 'text', topic: 'Discussões sobre agentes, MCP e modelos de IA.' },
          { id: 'jogos-memes', name: 'jogos-e-memes', type: 'text', topic: 'Descontraia e compartilhe os melhores memes.' }
        ]
      },
      {
        name: 'Canais de voz',
        channels: [
          { id: 'voz-geral', name: 'Lounge Geral', type: 'voice' },
          { id: 'voz-dev', name: 'Pareamento Dev', type: 'voice' },
          { id: 'voz-chill', name: 'Lofi & Chill', type: 'voice' }
        ]
      }
    ]
  },
  'typescript-br': {
    name: 'TypeScript Brasil',
    iconText: 'TS',
    color: '#3178c6',
    verified: false,
    categories: [
      {
        name: 'GERAL',
        channels: [
          { id: 'ts-geral', name: '💬-geral', type: 'text', topic: 'Comunidade TypeScript Brasil.' },
          { id: 'ts-duvidas', name: '❓-duvidas', type: 'text', topic: 'Tire suas dúvidas de tipos avançados.' }
        ]
      },
      {
        name: 'VOZ',
        channels: [
          { id: 'ts-call', name: '🔊 Call Coletiva', type: 'voice' }
        ]
      }
    ]
  },
  'cyberpunk-hub': {
    name: 'Cyberpunk Hub',
    iconText: 'CP',
    color: '#eb459e',
    verified: false,
    categories: [
      {
        name: 'HANGAR',
        channels: [
          { id: 'cp-net', name: '🌐-netrunning', type: 'text', topic: 'Discussões cyberpunk e hacking ético.' },
          { id: 'cp-musica', name: '🎶-synthwave', type: 'text', topic: 'Músicas e trilhas sonoras.' }
        ]
      }
    ]
  }
};

let ServersData = {};
try {
  const cachedServers = localStorage.getItem('discord_servers_data_v2');
  if (cachedServers) {
    ServersData = JSON.parse(cachedServers);
  } else {
    ServersData = { ...defaultServersData };
  }
} catch (e) {
  ServersData = { ...defaultServersData };
}

function saveServersData() {
  try {
    localStorage.setItem('discord_servers_data_v2', JSON.stringify(ServersData));
  } catch (e) {
    console.error('Erro ao salvar servidores no localStorage:', e);
  }
}

// --- PRE-LOADED MESSAGES ---
const ChannelMessages = {
  'geral': [
    {
      id: 1,
      author: 'Sophia',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
      role: 'Moderadora',
      color: '#3ba55c',
      time: 'Hoje às 17:15',
      text: 'Sejam todos muito bem-vindos ao servidor oficial da **Lucaverna**! 🎉\nO clone do Discord está agora 100% funcional com chamadas de voz WebRTC!',
      reactions: [{ emoji: '🎉', count: 7, reacted: true }, { emoji: '🔥', count: 5, reacted: false }]
    },
    {
      id: 2,
      author: 'Claudio',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
      role: 'Admin',
      color: '#e9a820',
      time: 'Hoje às 17:22',
      text: 'Você pode clicar em **"Convidar Amigos"** no topo para copiar o link. Quem acessar na mesma rede ou link entra na chamada de voz em tempo real!',
      reactions: [{ emoji: '🚀', count: 4, reacted: true }]
    },
    {
      id: 3,
      author: 'Midjourney Bot',
      isBot: true,
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      time: 'Hoje às 17:28',
      text: '**Prompt:** `cyberpunk discord desktop application interface, dark mode, vibrant blurple neon --v 6.0`',
      embed: {
        title: 'Midjourney v6.0 Render Result',
        desc: 'Interface inspirada no Discord e no Ecoa (meet.sparo.com.br) com streaming WebRTC e chat síncrono.',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'
      },
      reactions: [{ emoji: '❤️', count: 8, reacted: false }]
    }
  ]
};

// --- MEMBERS DATA ---
let OnlineUsersList = [
  {
    id: 'user_barbos4',
    name: 'BARBOS4',
    roleCategory: 'AMIGOS',
    color: '#e9a820',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
    activity: 'No Discord',
    status: 'online'
  },
  {
    id: 'user_juannito',
    name: 'Juannito.BAK',
    roleCategory: 'AMIGOS',
    color: '#00a8fc',
    badge: '💎 SKIN',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&auto=format&fit=crop&q=80',
    activity: 'Jogando CS2',
    status: 'online'
  },
  {
    id: 'user_merci',
    name: 'Merci',
    roleCategory: 'AMIGOS',
    color: '#5865f2',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80',
    activity: 'Ouvindo música',
    status: 'online'
  },
  {
    id: 'user_raphael',
    name: 'raphael',
    roleCategory: 'AMIGOS',
    color: '#f47b97',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=128&auto=format&fit=crop&q=80',
    activity: 'Online',
    status: 'online'
  },
  {
    id: 'user_tezouro',
    name: 'Tezouro',
    roleCategory: 'AMIGOS',
    color: '#eb459e',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=128&auto=format&fit=crop&q=80',
    activity: 'Online',
    status: 'online'
  },
  {
    id: 'user_claudio',
    name: 'Claudio',
    roleCategory: 'MODERADORES',
    color: '#3ba55c',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
    activity: 'Ouvindo Spotify: Lofi Beats',
    status: 'online',
    bio: 'Lead Developer na Lucaverna'
  },
  {
    id: 'user_sophia',
    name: 'Sophia',
    roleCategory: 'MODERADORES',
    color: '#3ba55c',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
    activity: 'Jogando Valorant',
    status: 'online',
    bio: 'UI/UX Designer na Lucaverna'
  },
  {
    id: 'user_bot_midjourney',
    name: 'Midjourney Bot',
    roleCategory: 'BOTS',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    activity: 'Gerando imagens com IA',
    isBot: true,
    status: 'online'
  },
  {
    id: 'user_bot_lucaverna',
    name: 'Lucaverna AI Bot',
    roleCategory: 'BOTS',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=128&auto=format&fit=crop&q=80',
    activity: 'Online para responder dúvidas',
    isBot: true,
    status: 'online'
  }
];

// Emojis list
const EmojisCatalog = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '🔥', '🎉', '🚀', '💯', '✨', '⚡', '⭐', '🌟',
  '❤️', '💙', '💜', '🖤', '👍', '👏', '🙌', '👑',
  '💎', '🎮', '💻', '🎧', '👾', '🕹️', '🛡️', '☕'
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initNetworkInfo();
  updateUserProfileBar();
  connectWebSocket();
  renderServers();
  renderChannels();
  renderMessages();
  renderMembers();
  renderFriendsHub();
  renderEmojiPicker();
  setupEventListeners();
});

function updateUserProfileBar() {
  const avatarEl = document.getElementById('user-bar-avatar');
  const nameEl = document.getElementById('user-bar-name');
  const statusEl = document.getElementById('user-bar-status');
  if (nameEl) nameEl.innerText = AppState.user.name;
  if (statusEl) statusEl.innerText = AppState.user.customStatus || 'Online';
  if (avatarEl) {
    if (AppState.user.avatar && AppState.user.avatar.startsWith('http')) {
      avatarEl.innerHTML = `<img src="${AppState.user.avatar}" alt="${AppState.user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    } else {
      avatarEl.innerHTML = AppState.user.avatarInitials || 'LK';
      avatarEl.style.backgroundColor = AppState.user.avatarBg || '#f47b97';
      avatarEl.style.color = '#1e1f22';
      avatarEl.style.fontWeight = '800';
    }
  }
}

// Toast notification helper
function showToast(text) {
  const container = document.getElementById('discord-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'discord-toast';
  toast.innerHTML = `<span>💬</span><span>${escapeHtml(text)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Network info to get local sharing URL
async function initNetworkInfo() {
  try {
    const res = await fetch('/api/network');
    const data = await res.json();
    if (data.networkUrl) {
      AppState.networkShareUrl = data.networkUrl;
    }
  } catch (e) {
    AppState.networkShareUrl = window.location.href;
  }
}

// 1. Splash Screen
function initSplash() {
  const splash = document.getElementById('discord-splash');
  const quoteEl = document.getElementById('splash-quote');
  const progressBar = document.getElementById('splash-progress');

  const quotes = [
    'Conectando ao gateway de voz WebRTC...',
    'Inicializando barramentos de áudio...',
    'Sincronizando amigos e canais...',
    'Pronto!'
  ];

  let currentQuote = 0;
  let progress = 20;

  const quoteInterval = setInterval(() => {
    currentQuote++;
    progress += 25;
    if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
    if (quoteEl && currentQuote < quotes.length) {
      quoteEl.innerText = quotes[currentQuote];
    }

    if (currentQuote >= quotes.length - 1) {
      clearInterval(quoteInterval);
      setTimeout(() => {
        if (splash) splash.classList.add('hidden');
        sounds.playMessagePing();
      }, 500);
    }
  }, 400);
}

// 2. WEBSOCKET REAL-TIME CONNECTION
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] Conectado ao servidor Discord Clone');
    // Identify our user
    ws.send(JSON.stringify({
      type: 'user:identify',
      user: AppState.user
    }));
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (e) {
      console.error('[WS] Erro ao processar mensagem:', e);
    }
  };

  ws.onclose = () => {
    console.warn('[WS] Conexão perdida. Reconectando em 3s...');
    setTimeout(connectWebSocket, 3000);
  };
}

async function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'init': {
      myPeerId = data.peerId;
      if (data.networkUrl) AppState.networkShareUrl = data.networkUrl;
      if (data.voiceRoster) {
        VoiceRoomsRoster.clear();
        for (const [chId, users] of Object.entries(data.voiceRoster)) {
          VoiceRoomsRoster.set(chId, users);
        }
        renderChannels();
      }
      break;
    }

    case 'presence:update': {
      // Merge connected real users into OnlineUsersList
      const connectedPeers = data.users || [];
      const remoteUsers = connectedPeers
        .filter(c => c.id !== myPeerId)
        .map(c => ({
          id: c.id,
          name: c.user?.name || 'Amigo',
          roleCategory: 'ONLINE',
          avatar: c.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
          status: 'online',
          activity: c.voiceChannelId ? `No canal de voz 🔊` : 'Conectado no Discord',
          voiceChannelId: c.voiceChannelId
        }));

      // Update members list
      const baseStatic = OnlineUsersList.filter(u => u.isBot || u.id.startsWith('user_barbos') || u.id.startsWith('user_juan') || u.id.startsWith('user_merci') || u.id.startsWith('user_raphael') || u.id.startsWith('user_tezouro') || u.id === 'user_claudio' || u.id === 'user_sophia');
      OnlineUsersList = [...baseStatic, ...remoteUsers];
      renderMembers();
      renderFriendsHub();
      renderChannels();
      break;
    }

    case 'chat:message': {
      const { channelId, message } = data;
      if (!ChannelMessages[channelId]) ChannelMessages[channelId] = [];
      ChannelMessages[channelId].push(message);

      if (channelId === AppState.currentChannelId) {
        renderMessages();
      }
      sounds.playMessagePing();
      break;
    }

    case 'chat:typing': {
      const indicator = document.getElementById('chat-typing-text');
      if (indicator && data.channelId === AppState.currentChannelId) {
        indicator.innerText = data.isTyping ? `${data.userName} está digitando...` : '';
      }
      break;
    }

    // --- GLOBAL VOICE ROSTER UPDATE ---
    case 'voice:roster_update': {
      VoiceRoomsRoster.clear();
      for (const [chId, users] of Object.entries(data.roster || {})) {
        VoiceRoomsRoster.set(chId, users);
      }
      renderChannels();
      break;
    }

    // --- WEBRTC VOICE EVENTS ---
    case 'voice:existing_peers': {
      // We joined a voice channel, connect to every existing peer
      for (const peer of data.peers) {
        remotePeersData.set(peer.peerId, peer);
        addPeerVoiceCard(peer.peerId, peer.user);
        initiatePeerConnection(peer.peerId, true); // true = polite/caller
      }
      renderChannels();
      break;
    }

    case 'voice:peer_joined': {
      const { peerId, user } = data.peer;
      remotePeersData.set(peerId, { peerId, user });
      addPeerVoiceCard(peerId, user);
      initiatePeerConnection(peerId, false); // false = callee
      sounds.playVoiceJoin();
      showToast(`${user.name} entrou na chamada de voz!`);
      renderChannels();
      break;
    }

    case 'voice:signal': {
      handlePeerSignal(data.senderPeerId, data.signal);
      break;
    }

    case 'voice:speaking': {
      // Update in roster
      for (const [chId, users] of VoiceRoomsRoster.entries()) {
        const found = users.find(u => u.peerId === data.peerId);
        if (found) {
          found.isSpeaking = !!data.isSpeaking;
        }
      }

      const card = document.getElementById(`voice-card-${data.peerId}`);
      if (card) {
        if (data.isSpeaking) {
          card.classList.add('speaking');
        } else {
          card.classList.remove('speaking');
        }
      }
      const treePeer = document.getElementById(`peer-voice-tree-${data.peerId}`);
      if (treePeer) {
        if (data.isSpeaking) {
          treePeer.classList.add('speaking');
        } else {
          treePeer.classList.remove('speaking');
        }
      }
      break;
    }

    case 'voice:mute': {
      for (const [chId, users] of VoiceRoomsRoster.entries()) {
        const found = users.find(u => u.peerId === data.peerId);
        if (found) {
          found.isMuted = !!data.isMuted;
        }
      }
      renderChannels();
      break;
    }

    case 'voice:peer_left': {
      removePeerVoiceCard(data.peerId);
      const pc = peerConnections.get(data.peerId);
      if (pc) {
        pc.close();
        peerConnections.delete(data.peerId);
      }
      remotePeersData.delete(data.peerId);
      sounds.playVoiceLeave();
      renderChannels();
      break;
    }
  }
}

// --- WEBRTC PEER CONNECTION LOGIC ---
async function initiatePeerConnection(peerId, isCaller) {
  if (peerConnections.has(peerId)) return;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peerConnections.set(peerId, pc);

  // Add local audio tracks to the peer connection
  if (localAudioStream) {
    localAudioStream.getTracks().forEach(track => {
      pc.addTrack(track, localAudioStream);
    });
  }

  // Add active video tracks if screen share or camera is currently on
  if (localScreenStream) {
    localScreenStream.getVideoTracks().forEach(track => {
      pc.addTrack(track, localScreenStream);
    });
  } else if (localCameraStream) {
    localCameraStream.getVideoTracks().forEach(track => {
      pc.addTrack(track, localCameraStream);
    });
  }

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'voice:signal',
        targetPeerId: peerId,
        signal: { candidate: event.candidate }
      }));
    }
  };

  // When remote track arrives (Audio or Video stream!)
  pc.ontrack = (event) => {
    console.log('[WebRTC] Track remoto recebido de:', peerId, event.track.kind);
    if (event.track.kind === 'audio') {
      let audioEl = document.getElementById(`remote-audio-${peerId}`);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `remote-audio-${peerId}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        document.getElementById('remote-audios-container').appendChild(audioEl);
      }
      audioEl.srcObject = event.streams[0];
    } else if (event.track.kind === 'video') {
      let card = document.getElementById(`voice-card-${peerId}`);
      if (!card) {
        addPeerVoiceCard(peerId, remotePeersData.get(peerId)?.user);
        card = document.getElementById(`voice-card-${peerId}`);
      }
      if (card) {
        let videoEl = card.querySelector('video');
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.className = 'voice-user-video';
          card.appendChild(videoEl);
        }
        videoEl.srcObject = event.streams[0];
        videoEl.style.display = 'block';
        videoEl.play().catch(() => {});
        const avatarImg = card.querySelector('.voice-user-avatar-lg');
        if (avatarImg) avatarImg.style.display = 'none';
      }
      const overlay = document.getElementById('voice-room-overlay');
      if (overlay) overlay.classList.add('active');
    }
  };

  // Negotiation
  if (isCaller) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({
        type: 'voice:signal',
        targetPeerId: peerId,
        signal: { description: pc.localDescription }
      }));
    } catch (err) {
      console.error('[WebRTC] Erro ao criar offer:', err);
    }
  }
}

async function handlePeerSignal(senderPeerId, signal) {
  let pc = peerConnections.get(senderPeerId);
  if (!pc) {
    await initiatePeerConnection(senderPeerId, false);
    pc = peerConnections.get(senderPeerId);
  }

  if (signal.description) {
    const desc = signal.description;
    await pc.setRemoteDescription(new RTCSessionDescription(desc));

    if (desc.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({
        type: 'voice:signal',
        targetPeerId: senderPeerId,
        signal: { description: pc.localDescription }
      }));
    }
  } else if (signal.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (e) {
      console.warn('[WebRTC] Erro ao adicionar ICE candidate:', e);
    }
  }
}

// Local Mic Volume Detection for Real-time Speaking Glow
function setupMicVolumeAnalyzer(stream) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    micAudioContext = new AudioCtx();
    const source = micAudioContext.createMediaStreamSource(stream);
    micAnalyser = micAudioContext.createAnalyser();
    micAnalyser.fftSize = 256;
    source.connect(micAnalyser);

    const buffer = new Uint8Array(micAnalyser.frequencyBinCount);
    let lastSpeakingState = false;

    micVolumeInterval = setInterval(() => {
      if (!AppState.isVoiceConnected || AppState.isMuted) return;
      micAnalyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      const avg = sum / buffer.length;

      const isSpeaking = avg > 14;
      if (isSpeaking !== lastSpeakingState) {
        lastSpeakingState = isSpeaking;
        AppState.isSpeaking = isSpeaking;
        const localTreeUser = document.getElementById('local-voice-tree-user');
        if (localTreeUser) {
          if (isSpeaking) localTreeUser.classList.add('speaking');
          else localTreeUser.classList.remove('speaking');
        }
        const localCard = document.getElementById('local-voice-card');
        if (localCard) {
          if (isSpeaking) localCard.classList.add('speaking');
          else localCard.classList.remove('speaking');
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'voice:speaking',
            isSpeaking
          }));
        }
      }
    }, 60);
  } catch (e) {
    console.warn('[AudioContext] Não foi possível analisar microfone:', e);
  }
}

// 3. JOIN REAL VOICE CHANNEL
async function handleVoiceChannelClick(channelId, channelName) {
  sounds.init();

  if (AppState.isVoiceConnected && AppState.connectedVoiceChannelId === channelId) {
    const overlay = document.getElementById('voice-room-overlay');
    if (overlay) overlay.classList.toggle('active');
    return;
  }

  // If already in another voice, leave it
  if (AppState.isVoiceConnected) {
    disconnectVoice(false);
  }

  try {
    // 1. Request microphone access with timeout fallback
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Mic timeout')), 1200)
      );
      localAudioStream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        }),
        timeoutPromise
      ]);
      console.log('[WebRTC] Microfone real capturado com sucesso!');
    }
  } catch (err) {
    console.warn('[WebRTC] Permissão de microfone não concedida ou dispositivo ausente:', err);
    showToast('Aviso: Microfone não disponível. Você está conectado como ouvinte.');
  }

  AppState.isVoiceConnected = true;
  AppState.connectedVoiceChannelId = channelId;
  AppState.connectedVoiceChannelName = channelName;

  sounds.playVoiceJoin();

  // Show voice panel at bottom left
  const voicePanel = document.getElementById('voice-connected-panel');
  if (voicePanel) {
    voicePanel.style.display = 'flex';
    document.getElementById('voice-channel-name').innerText = `🔊 ${channelName}`;
  }

  // Re-render sidebar channels immediately so the user appears under the channel!
  renderChannels();

  // Setup local speaking analyzer
  if (localAudioStream) {
    setupMicVolumeAnalyzer(localAudioStream);
  }

  // Notify server via WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'voice:join',
      voiceChannelId: channelId,
      isMuted: AppState.isMuted
    }));
  }

  showToast(`Conectado à sala de voz ${channelName}!`);
}

function disconnectVoice(playSound = true) {
  if (!AppState.isVoiceConnected) return;

  AppState.isVoiceConnected = false;
  AppState.connectedVoiceChannelId = null;
  AppState.connectedVoiceChannelName = null;
  AppState.isSpeaking = false;

  if (playSound) sounds.playVoiceLeave();

  // Stop local tracks
  if (localAudioStream) {
    localAudioStream.getTracks().forEach(t => t.stop());
    localAudioStream = null;
  }
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(t => t.stop());
    localScreenStream = null;
  }
  if (localCameraStream) {
    localCameraStream.getTracks().forEach(t => t.stop());
    localCameraStream = null;
  }
  if (micVolumeInterval) {
    clearInterval(micVolumeInterval);
    micVolumeInterval = null;
  }
  if (micAudioContext) {
    micAudioContext.close();
    micAudioContext = null;
  }

  // Close all peer connections
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
  remotePeersData.clear();

  // Clean remote audios
  const audiosContainer = document.getElementById('remote-audios-container');
  if (audiosContainer) audiosContainer.innerHTML = '';

  // Clean remote voice cards
  const grid = document.getElementById('voice-grid-cards');
  if (grid) {
    grid.querySelectorAll('.remote-voice-card').forEach(el => el.remove());
  }

  const voicePanel = document.getElementById('voice-connected-panel');
  if (voicePanel) voicePanel.style.display = 'none';

  const overlay = document.getElementById('voice-room-overlay');
  if (overlay) overlay.classList.remove('active');

  const localVideo = document.getElementById('local-video-preview');
  if (localVideo) {
    localVideo.srcObject = null;
    localVideo.style.display = 'none';
  }
  const avatar = document.getElementById('local-voice-avatar');
  if (avatar) avatar.style.display = 'block';

  AppState.isScreenSharing = false;
  AppState.isCameraOn = false;
  document.getElementById('voice-share-screen-btn')?.classList.remove('active-control');
  document.getElementById('voice-camera-btn')?.classList.remove('active-control');
  document.getElementById('panel-share-screen-btn')?.classList.remove('active');
  document.getElementById('panel-camera-btn')?.classList.remove('active');

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'voice:leave' }));
  }

  // Re-render channels to remove user tree
  renderChannels();
}

// Add remote voice card to grid
function addPeerVoiceCard(peerId, user) {
  const grid = document.getElementById('voice-grid-cards');
  if (!grid || document.getElementById(`voice-card-${peerId}`)) return;

  const card = document.createElement('div');
  card.className = 'voice-user-card remote-voice-card';
  card.id = `voice-card-${peerId}`;

  card.innerHTML = `
    <img class="voice-user-avatar-lg" src="${user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80'}" alt="${user?.name || 'Amigo'}" />
    <div class="voice-user-name-tag">
      <span>${user?.name || 'Amigo'}</span>
    </div>
  `;

  grid.appendChild(card);
}

function removePeerVoiceCard(peerId) {
  const card = document.getElementById(`voice-card-${peerId}`);
  if (card) card.remove();
  const audioEl = document.getElementById(`remote-audio-${peerId}`);
  if (audioEl) audioEl.remove();
}

// Helper to renegotiate SDP when video tracks are added/replaced/removed
async function sendRenegotiationOffer(peerId, pc) {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'voice:signal',
        targetPeerId: peerId,
        signal: { description: pc.localDescription }
      }));
    }
  } catch (err) {
    console.warn('[WebRTC] Erro na renegociação com peer:', peerId, err);
  }
}

// Real Screen Share
async function toggleScreenShare() {
  if (AppState.isScreenSharing) {
    // Stop screen share
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(t => t.stop());
      localScreenStream = null;
    }
    AppState.isScreenSharing = false;
    document.getElementById('voice-share-screen-btn')?.classList.remove('active-control');
    document.getElementById('panel-share-screen-btn')?.classList.remove('active');

    const videoPreview = document.getElementById('local-video-preview');
    const avatar = document.getElementById('local-voice-avatar');

    if (AppState.isCameraOn && localCameraStream) {
      // Revert to camera stream
      if (videoPreview) {
        videoPreview.srcObject = localCameraStream;
        videoPreview.style.display = 'block';
        videoPreview.play().catch(() => {});
      }
      const camTrack = localCameraStream.getVideoTracks()[0];
      peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && camTrack) {
          videoSender.replaceTrack(camTrack);
        }
      });
    } else {
      if (videoPreview) {
        videoPreview.srcObject = null;
        videoPreview.style.display = 'none';
      }
      if (avatar) avatar.style.display = 'block';

      // Remove video track from peers
      peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          pc.removeTrack(videoSender);
          sendRenegotiationOffer(peerId, pc);
        }
      });
    }
    showToast('Compartilhamento de tela encerrado.');
  } else {
    // If not in voice call, connect first!
    if (!AppState.isVoiceConnected) {
      await handleVoiceChannelClick('voz-geral', 'Lounge Geral');
    }

    try {
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      AppState.isScreenSharing = true;
      document.getElementById('voice-share-screen-btn')?.classList.add('active-control');
      document.getElementById('panel-share-screen-btn')?.classList.add('active');

      // Open voice room overlay so user and peers can see the screen
      const overlay = document.getElementById('voice-room-overlay');
      if (overlay) overlay.classList.add('active');

      const videoPreview = document.getElementById('local-video-preview');
      if (videoPreview) {
        videoPreview.srcObject = localScreenStream;
        videoPreview.style.display = 'block';
        videoPreview.play().catch(() => {});
      }
      const avatar = document.getElementById('local-voice-avatar');
      if (avatar) avatar.style.display = 'none';

      // Add or replace screen video track to all existing peer connections
      const videoTrack = localScreenStream.getVideoTracks()[0];
      peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, localScreenStream);
          sendRenegotiationOffer(peerId, pc);
        }
      });

      videoTrack.onended = () => {
        if (AppState.isScreenSharing) toggleScreenShare();
      };

      showToast('Compartilhando tela em tempo real!');
    } catch (err) {
      console.warn('Compartilhamento de tela cancelado ou negado:', err);
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        showToast('Não foi possível compartilhar a tela: ' + (err.message || 'Erro de permissão'));
      }
    }
  }
}

// Real Camera Stream
async function toggleCamera() {
  if (AppState.isCameraOn) {
    if (localCameraStream) {
      localCameraStream.getTracks().forEach(t => t.stop());
      localCameraStream = null;
    }
    AppState.isCameraOn = false;
    document.getElementById('voice-camera-btn')?.classList.remove('active-control');
    document.getElementById('panel-camera-btn')?.classList.remove('active');

    const videoPreview = document.getElementById('local-video-preview');
    const avatar = document.getElementById('local-voice-avatar');

    if (AppState.isScreenSharing && localScreenStream) {
      // Revert to screen stream
      if (videoPreview) {
        videoPreview.srcObject = localScreenStream;
        videoPreview.style.display = 'block';
        videoPreview.play().catch(() => {});
      }
      const screenTrack = localScreenStream.getVideoTracks()[0];
      peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && screenTrack) {
          videoSender.replaceTrack(screenTrack);
        }
      });
    } else {
      if (videoPreview) {
        videoPreview.srcObject = null;
        videoPreview.style.display = 'none';
      }
      if (avatar) avatar.style.display = 'block';

      // Remove video track from peers
      peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          pc.removeTrack(videoSender);
          sendRenegotiationOffer(peerId, pc);
        }
      });
    }
    showToast('Câmera desativada.');
  } else {
    // If not in voice call, connect first!
    if (!AppState.isVoiceConnected) {
      await handleVoiceChannelClick('voz-geral', 'Lounge Geral');
    }

    try {
      localCameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      AppState.isCameraOn = true;
      document.getElementById('voice-camera-btn')?.classList.add('active-control');
      document.getElementById('panel-camera-btn')?.classList.add('active');

      // Open voice room overlay so user can see camera
      const overlay = document.getElementById('voice-room-overlay');
      if (overlay) overlay.classList.add('active');

      const videoPreview = document.getElementById('local-video-preview');
      if (videoPreview) {
        videoPreview.srcObject = localCameraStream;
        videoPreview.style.display = 'block';
        videoPreview.play().catch(() => {});
      }
      const avatar = document.getElementById('local-voice-avatar');
      if (avatar) avatar.style.display = 'none';

      const videoTrack = localCameraStream.getVideoTracks()[0];
      peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, localCameraStream);
          sendRenegotiationOffer(peerId, pc);
        }
      });

      videoTrack.onended = () => {
        if (AppState.isCameraOn) toggleCamera();
      };

      showToast('Câmera ativada!');
    } catch (err) {
      console.warn('Câmera indisponível:', err);
      if (err.name === 'NotFoundError') {
        showToast('Nenhuma câmera/webcam física detectada neste computador.');
      } else if (err.name === 'NotAllowedError') {
        showToast('Permissão de acesso à câmera foi recusada.');
      } else {
        showToast('Aviso: Câmera não disponível (' + (err.message || 'Erro') + ').');
      }
    }
  }
}

// --- SERVER MANAGEMENT (CREATE / DELETE / CONTEXT MENU) ---
let selectedServerColor = '#5865f2';
let serverToDeleteId = null;

function openCreateServerModal() {
  const modal = document.getElementById('create-server-modal');
  const input = document.getElementById('new-server-name-input');
  if (input) {
    input.value = `Servidor de ${AppState.user.name || 'Claudio'}`;
  }
  modal?.classList.add('open');
  setTimeout(() => input?.focus(), 80);
}

function closeCreateServerModal() {
  document.getElementById('create-server-modal')?.classList.remove('open');
}

function handleCreateServerConfirm() {
  const input = document.getElementById('new-server-name-input');
  const name = input?.value.trim();
  if (!name) {
    showToast('Por favor, informe o nome do servidor.');
    return;
  }

  const words = name.split(/\s+/).filter(Boolean);
  let iconText = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : name.slice(0, 2).toUpperCase();

  const serverId = 'srv-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);

  const newServer = {
    name,
    iconText,
    color: selectedServerColor || '#5865f2',
    verified: false,
    categories: [
      {
        name: 'CANAIS DE TEXTO',
        channels: [
          { id: `c-geral-${serverId}`, name: '💬-geral', type: 'text', topic: `Boas-vindas ao ${name}!` },
          { id: `c-anuncios-${serverId}`, name: '📢-anúncios', type: 'text', topic: 'Avisos da comunidade' }
        ]
      },
      {
        name: 'CANAIS DE VOZ',
        channels: [
          { id: `v-lounge-${serverId}`, name: '🔊 Lounge Geral', type: 'voice' },
          { id: `v-jogos-${serverId}`, name: '🎮 Resenha & Jogos', type: 'voice' }
        ]
      }
    ]
  };

  ServersData[serverId] = newServer;
  saveServersData();

  ChannelMessages[`c-geral-${serverId}`] = [
    {
      id: 'msg-' + Date.now(),
      user: { name: 'Discord Bot', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80', bot: true },
      time: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      content: `🎉 Bem-vindo ao novo servidor **${name}**! Criado por você. Convide amigos ou crie novas conversas!`
    }
  ];

  closeCreateServerModal();
  renderServers();

  // Switch to new server
  AppState.viewMode = 'server';
  AppState.currentServerId = serverId;
  AppState.currentChannelId = `c-geral-${serverId}`;
  AppState.currentChannelName = '💬-geral';
  AppState.currentChannelTopic = `Boas-vindas ao ${name}!`;
  switchToServerView();

  showToast(`Servidor "${name}" criado com sucesso!`);
}

function openDeleteServerModal(serverId) {
  const targetId = serverId || AppState.currentServerId;
  const server = ServersData[targetId];
  if (!server) return;

  const serverKeys = Object.keys(ServersData);
  if (serverKeys.length <= 1) {
    showToast('Você não pode excluir o único servidor restante.');
    return;
  }

  serverToDeleteId = targetId;
  const desc = document.getElementById('delete-server-modal-desc');
  if (desc) {
    desc.innerText = `Você tem certeza que deseja excluir o servidor "${server.name}"? Esta ação removerá todos os canais e mensagens dele.`;
  }
  hideServerDropdownMenu();
  document.getElementById('delete-server-modal')?.classList.add('open');
}

function closeDeleteServerModal() {
  serverToDeleteId = null;
  document.getElementById('delete-server-modal')?.classList.remove('open');
}

function handleDeleteServerConfirm() {
  if (!serverToDeleteId) return;
  const serverName = ServersData[serverToDeleteId]?.name || 'Servidor';
  delete ServersData[serverToDeleteId];
  saveServersData();

  closeDeleteServerModal();

  const remainingServerIds = Object.keys(ServersData);
  if (remainingServerIds.length > 0) {
    AppState.viewMode = 'server';
    AppState.currentServerId = remainingServerIds[0];
    const nextServer = ServersData[AppState.currentServerId];
    const firstChannel = nextServer.categories[0]?.channels[0] || nextServer.categories[1]?.channels[0];
    if (firstChannel) {
      AppState.currentChannelId = firstChannel.id;
      AppState.currentChannelName = firstChannel.name;
      AppState.currentChannelTopic = firstChannel.topic || '';
    }
    renderServers();
    switchToServerView();
  } else {
    switchToFriendsView();
  }

  showToast(`Servidor "${serverName}" excluído.`);
}

function toggleServerDropdownMenu(e) {
  e?.stopPropagation();
  const menu = document.getElementById('server-dropdown-menu');
  if (!menu) return;
  if (menu.style.display === 'none' || !menu.style.display) {
    const headerBtn = document.getElementById('server-header-btn');
    if (headerBtn) {
      const rect = headerBtn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${rect.left + 8}px`;
    }
    menu.style.display = 'block';
  } else {
    menu.style.display = 'none';
  }
}

function hideServerDropdownMenu() {
  const menu = document.getElementById('server-dropdown-menu');
  if (menu) menu.style.display = 'none';
}

// 4. RENDER SERVERS
function renderServers() {
  const container = document.getElementById('servers-list');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(ServersData).forEach(([serverId, server]) => {
    const isActive = AppState.viewMode === 'server' && AppState.currentServerId === serverId;
    const wrapper = document.createElement('div');
    wrapper.className = `guild-item-wrapper ${isActive ? 'active' : ''}`;
    wrapper.dataset.serverId = serverId;

    const bgStyle = server.color ? `background-color: ${server.color};` : '';

    wrapper.innerHTML = `
      <div class="guild-pill"></div>
      <div class="guild-icon-btn" style="${bgStyle}" title="${server.name} (Clique com botão direito para opções)">
        ${server.iconText}
      </div>
    `;

    // Left click: select server
    wrapper.addEventListener('click', () => {
      AppState.viewMode = 'server';
      AppState.currentServerId = serverId;

      document.querySelectorAll('.guild-item-wrapper').forEach(el => el.classList.remove('active'));
      wrapper.classList.add('active');

      const firstChannel = server.categories[0]?.channels[0] || server.categories[1]?.channels[0];
      if (firstChannel) {
        AppState.currentChannelId = firstChannel.id;
        AppState.currentChannelName = firstChannel.name;
        AppState.currentChannelTopic = firstChannel.topic || '';
      }

      switchToServerView();
    });

    // Right click: delete context action
    wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDeleteServerModal(serverId);
    });

    container.appendChild(wrapper);
  });
}

function switchToServerView() {
  document.getElementById('server-header-btn').style.display = 'flex';
  document.getElementById('dm-search-header').style.display = 'none';
  document.getElementById('channel-chat-header').style.display = 'flex';
  document.getElementById('friends-top-bar').style.display = 'none';
  document.getElementById('friends-hub-view').style.display = 'none';
  document.getElementById('messages-scroller').style.display = 'flex';
  document.getElementById('chat-input-wrapper').style.display = 'block';
  document.getElementById('members-sidebar').style.display = 'flex';

  renderChannels();
  updateChatHeader();
  renderMessages();
}

function switchToFriendsView() {
  AppState.viewMode = 'me';

  document.querySelectorAll('.guild-item-wrapper').forEach(el => el.classList.remove('active'));
  document.getElementById('home-guild-btn')?.classList.add('active');

  document.getElementById('server-header-btn').style.display = 'none';
  document.getElementById('dm-search-header').style.display = 'block';
  document.getElementById('channel-chat-header').style.display = 'none';
  document.getElementById('friends-top-bar').style.display = 'flex';
  document.getElementById('friends-hub-view').style.display = 'flex';
  document.getElementById('messages-scroller').style.display = 'none';
  document.getElementById('chat-input-wrapper').style.display = 'none';
  document.getElementById('members-sidebar').style.display = 'none';

  renderDmList();
  renderFriendsHub();
}

// 5. RENDER CHANNELS & DMS
function renderChannels() {
  const server = ServersData[AppState.currentServerId];
  if (!server) return;

  const titleEl = document.getElementById('server-header-name');
  if (titleEl) titleEl.innerText = server.name;

  const verifiedIcon = document.getElementById('server-verified-icon');
  if (verifiedIcon) {
    verifiedIcon.style.display = server.verified ? 'inline-block' : 'none';
  }

  const listContainer = document.getElementById('channels-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  server.categories.forEach(cat => {
    const catHeader = document.createElement('div');
    catHeader.className = 'channel-category';
    catHeader.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
      <span>${cat.name}</span>
    `;

    const catItems = document.createElement('div');
    catItems.className = 'category-items';

    catHeader.addEventListener('click', () => {
      catHeader.classList.toggle('collapsed');
      catItems.style.display = catHeader.classList.contains('collapsed') ? 'none' : 'block';
    });

    listContainer.appendChild(catHeader);

    cat.channels.forEach(ch => {
      const isVoice = ch.type === 'voice';
      const isConnectedVoice = isVoice && AppState.isVoiceConnected && AppState.connectedVoiceChannelId === ch.id;
      const isActiveText = !isVoice && AppState.currentChannelId === ch.id;

      const item = document.createElement('div');
      item.className = `channel-item ${isVoice ? 'voice-channel-item' : ''} ${isActiveText ? 'active' : ''} ${isConnectedVoice ? 'in-call' : ''}`;
      item.dataset.channelId = ch.id;

      if (isVoice) {
        // Query global VoiceRoomsRoster from server
        const rosterPeers = VoiceRoomsRoster.get(ch.id) || [];
        // Remote peers in this voice channel (exclude local user so no duplicate)
        const remotePeersInVoice = rosterPeers.filter(p => p.peerId !== myPeerId);
        const totalUsersInVoice = (isConnectedVoice ? 1 : 0) + remotePeersInVoice.length;
        const hasUsersInVoice = totalUsersInVoice > 0;

        item.innerHTML = `
          <div class="channel-icon voice-icon">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.411C2 15.961 2.45 16.411 3 16.411H6L10.293 20.704C10.579 20.99 11.009 21.075 11.383 20.921C11.757 20.767 12 20.404 12 20V4.00004C12 3.59604 11.757 3.23304 11.383 3.07904ZM14 6.79v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </div>
          <div class="channel-name">${ch.name}</div>
          ${hasUsersInVoice ? `<div class="voice-call-timer-pill" title="Em chamada">${totalUsersInVoice > 1 ? totalUsersInVoice + ' conectados' : '53:20'}</div>` : ''}
          <div class="channel-actions">
            <button class="channel-action-btn invite-btn" title="Criar convite">
              <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </button>
          </div>
        `;

        item.querySelector('.invite-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          copyInviteLink();
        });

        item.addEventListener('click', () => {
          handleVoiceChannelClick(ch.id, ch.name);
        });

        catItems.appendChild(item);

        // If local user or remote peers are in this voice channel, render the indented user tree!
        if (hasUsersInVoice) {
          // Status line shown in screenshot: "Definir um status do canal ✎"
          const statusRow = document.createElement('div');
          statusRow.className = 'voice-channel-status-row';
          statusRow.innerHTML = `<span>Definir um status do canal</span><span style="font-size:10px;">✎</span>`;
          statusRow.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast('Canal de voz ativo: Geral');
          });
          catItems.appendChild(statusRow);

          const treeContainer = document.createElement('div');
          treeContainer.className = 'voice-channel-users-tree';
          treeContainer.id = `voice-tree-${ch.id}`;

          // Local user row if in this voice channel
          if (isConnectedVoice) {
            const localRow = document.createElement('div');
            localRow.className = `voice-tree-user ${AppState.isSpeaking ? 'speaking' : ''}`;
            localRow.id = 'local-voice-tree-user';

            let avatarContent = '';
            if (AppState.user.avatar && AppState.user.avatar.startsWith('http')) {
              avatarContent = `<img src="${AppState.user.avatar}" alt="${AppState.user.name}" />`;
            } else {
              avatarContent = AppState.user.avatarInitials || 'LK';
            }

            localRow.innerHTML = `
              <div class="voice-tree-avatar" style="background-color: ${AppState.user.avatarBg || '#f47b97'};">
                ${avatarContent}
              </div>
              <span class="voice-tree-name">${AppState.user.name}</span>
              ${AppState.isMuted ? '<span class="voice-tree-mute-icon" title="Mutado">🔇</span>' : ''}
            `;

            localRow.addEventListener('click', (e) => {
              e.stopPropagation();
              const overlay = document.getElementById('voice-room-overlay');
              if (overlay) overlay.classList.toggle('active');
            });

            treeContainer.appendChild(localRow);
          }

          // Remote peers rows (from global VoiceRoomsRoster)
          remotePeersInVoice.forEach(peer => {
            const peerRow = document.createElement('div');
            peerRow.className = `voice-tree-user ${peer.isSpeaking ? 'speaking' : ''}`;
            peerRow.id = `peer-voice-tree-${peer.peerId}`;

            let peerAvatar = '';
            if (peer.user?.avatar && peer.user.avatar.startsWith('http')) {
              peerAvatar = `<img src="${peer.user.avatar}" alt="${peer.user?.name || 'Amigo'}" />`;
            } else {
              peerAvatar = (peer.user?.avatarInitials || peer.user?.name || 'AM').substring(0, 2).toUpperCase();
            }

            peerRow.innerHTML = `
              <div class="voice-tree-avatar" style="background-color: ${peer.user?.avatarBg || '#5865f2'}; color: #fff;">
                ${peerAvatar}
              </div>
              <span class="voice-tree-name">${peer.user?.name || 'Amigo'}</span>
              ${peer.isMuted ? '<span class="voice-tree-mute-icon" title="Mutado">🔇</span>' : ''}
            `;

            peerRow.addEventListener('click', (e) => {
              e.stopPropagation();
              if (isConnectedVoice) {
                const overlay = document.getElementById('voice-room-overlay');
                if (overlay) overlay.classList.toggle('active');
              } else {
                handleVoiceChannelClick(ch.id, ch.name);
              }
            });

            treeContainer.appendChild(peerRow);
          });

          catItems.appendChild(treeContainer);
        }

      } else {
        // Text channel
        item.innerHTML = `
          <div class="channel-icon">
            <svg viewBox="0 0 24 24"><path d="M5.88 21h3.35l.84-5.2h4.55L13.78 21h3.35l.84-5.2H22v-2.8h-3.67l.63-3.8h3.04V6.4h-2.58l.84-5.2h-3.35l-.84 5.2H9.91l.84-5.2H7.4l-.84 5.2H2v2.8h4.21l-.63 3.8H2v2.8h3.25L4.41 21h1.47zm4.87-8h4.55l-.63 3.8H10.12l.63-3.8z"/></svg>
          </div>
          <div class="channel-name">${ch.name}</div>
          ${ch.unread ? `<div class="channel-unread-badge">${ch.unread}</div>` : ''}
        `;

        item.addEventListener('click', () => {
          // Switch to this text channel
          AppState.currentChannelId = ch.id;
          AppState.currentChannelName = ch.name;
          AppState.currentChannelTopic = ch.topic || '';

          // If the full voice room overlay was open, minimize it so user can see chat!
          const overlay = document.getElementById('voice-room-overlay');
          if (overlay) overlay.classList.remove('active');

          // Keep voice connected! Do NOT disconnect!
          renderChannels();
          updateChatHeader();
          renderMessages();
        });

        catItems.appendChild(item);
      }
    });

    listContainer.appendChild(catItems);
  });
}

function renderDmList() {
  const listContainer = document.getElementById('channels-list');
  if (!listContainer) return;
  listContainer.innerHTML = `
    <div class="channel-item active" style="margin-bottom: 8px;">
      <div class="channel-icon">
        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      </div>
      <div class="channel-name">Amigos</div>
    </div>
    <div class="channel-category" style="padding: 10px 8px 4px 8px;">MENSAGENS DIRETAS</div>
  `;

  OnlineUsersList.forEach(user => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.innerHTML = `
      <div class="member-avatar-box" style="width: 24px; height: 24px;">
        <img class="member-avatar" src="${user.avatar}" alt="${user.name}" />
        <div class="status-dot ${user.status || 'online'}" style="width: 8px; height: 8px;"></div>
      </div>
      <div class="channel-name" style="margin-left: 6px;">${user.name}</div>
    `;

    item.addEventListener('click', () => {
      // Direct message with friend
      AppState.currentChannelId = `dm_${user.id}`;
      AppState.currentChannelName = `@${user.name}`;
      AppState.currentChannelTopic = `Início da sua conversa privada com ${user.name}.`;
      switchToServerView();
    });

    listContainer.appendChild(item);
  });
}

function updateChatHeader() {
  const title = document.getElementById('chat-header-title');
  const topic = document.getElementById('chat-header-topic');
  const input = document.getElementById('chat-input-textarea');

  if (title) title.innerText = AppState.currentChannelName;
  if (topic) topic.innerText = AppState.currentChannelTopic;
  if (input) input.placeholder = `Conversar em #${AppState.currentChannelName.replace(/^[^\w\s]+-?/, '')}`;
}

// 6. RENDER FRIENDS HUB (@me Ecoa-style)
function renderFriendsHub() {
  const container = document.getElementById('friends-cards-container');
  const header = document.getElementById('friends-count-header');
  if (!container) return;

  const onlineFriends = OnlineUsersList.filter(u => u.status === 'online');
  if (header) header.innerText = `ONLINE — ${onlineFriends.length}`;

  container.innerHTML = '';

  if (onlineFriends.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <p>Nenhum amigo online agora. Que tal convidar alguém?</p>
      </div>
    `;
    return;
  }

  onlineFriends.forEach(friend => {
    const card = document.createElement('div');
    card.className = 'friend-row-card';

    card.innerHTML = `
      <div class="friend-card-left">
        <div class="friend-card-avatar">
          <img src="${friend.avatar}" alt="${friend.name}" />
          <div class="status-dot online"></div>
        </div>
        <div>
          <div class="friend-card-name">${friend.name}</div>
          <div class="friend-card-substatus">${friend.activity || 'Online'}</div>
        </div>
      </div>
      <div class="friend-card-actions">
        <button class="friend-action-circle-btn" title="Conversar" data-id="${friend.id}" data-name="${friend.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
        </button>
        <button class="friend-action-circle-btn call" title="Iniciar Chamada de Voz" data-id="${friend.id}" data-name="${friend.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.057 15.057 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1.12z"/></svg>
        </button>
      </div>
    `;

    card.querySelector('.friend-action-circle-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      AppState.currentChannelId = `dm_${friend.id}`;
      AppState.currentChannelName = `@${friend.name}`;
      AppState.currentChannelTopic = `Conversa privada com ${friend.name}.`;
      switchToServerView();
    });

    card.querySelector('.friend-action-circle-btn.call')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleVoiceChannelClick('voz-call-privada', `Chamada com ${friend.name}`);
    });

    container.appendChild(card);
  });
}

// 7. RENDER CHAT MESSAGES
function renderMessages() {
  const container = document.getElementById('messages-scroller');
  if (!container) return;

  const messages = ChannelMessages[AppState.currentChannelId] || [
    {
      id: 999,
      author: 'Lucaverna AI Bot',
      isBot: true,
      avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=128&auto=format&fit=crop&q=80',
      time: 'Hoje às 17:00',
      text: 'Canal sincronizado em tempo real! Envie uma mensagem ou imagem para testar a comunicação.',
      reactions: [{ emoji: '👋', count: 1, reacted: false }]
    }
  ];

  container.innerHTML = `
    <div class="channel-welcome-banner">
      <div class="channel-welcome-icon-circle">
        <svg viewBox="0 0 24 24"><path d="M5.88 21h3.35l.84-5.2h4.55L13.78 21h3.35l.84-5.2H22v-2.8h-3.67l.63-3.8h3.04V6.4h-2.58l.84-5.2h-3.35l-.84 5.2H9.91l.84-5.2H7.4l-.84 5.2H2v2.8h4.21l-.63 3.8H2v2.8h3.25L4.41 21h1.47zm4.87-8h4.55l-.63 3.8H10.12l.63-3.8z"/></svg>
      </div>
      <h2 class="channel-welcome-title">Bem-vindo a #${AppState.currentChannelName}!</h2>
      <p class="channel-welcome-subtitle">Este é o início do canal #${AppState.currentChannelName}.</p>
    </div>
    <div class="date-separator-row">
      <div class="date-separator-badge">19 de Outubro de 2026</div>
    </div>
  `;

  messages.forEach(msg => {
    const row = document.createElement('div');
    row.className = 'message-row';
    row.dataset.msgId = msg.id;

    let formattedText = escapeHtml(msg.text || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');

    let embedHtml = '';
    if (msg.embed) {
      embedHtml = `
        <div class="message-embed">
          ${msg.embed.title ? `<div class="embed-title">${escapeHtml(msg.embed.title)}</div>` : ''}
          ${msg.embed.desc ? `<div class="embed-desc">${escapeHtml(msg.embed.desc)}</div>` : ''}
          ${msg.embed.image ? `<img class="embed-image" src="${msg.embed.image}" alt="Embed Media" />` : ''}
        </div>
      `;
    }

    let reactionsHtml = '';
    if (msg.reactions && msg.reactions.length) {
      reactionsHtml = `
        <div class="message-reactions">
          ${msg.reactions.map(r => `
            <div class="reaction-pill ${r.reacted ? 'reacted' : ''}" data-emoji="${r.emoji}">
              <span>${r.emoji}</span>
              <span>${r.count}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="message-avatar-col">
        ${msg.avatar && msg.avatar.startsWith('http') ? `
          <img class="message-avatar" src="${msg.avatar}" alt="${msg.author}" />
        ` : `
          <div class="message-avatar initials-avatar" style="background-color: ${msg.avatarBg || '#f47b97'}; color: #1e1f22; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 50%; width: 40px; height: 40px;">
            ${msg.avatarInitials || (msg.author || 'LK').substring(0, 2).toUpperCase()}
          </div>
        `}
      </div>
      <div class="message-content-col">
        <div class="message-meta">
          <span class="message-author" style="color: ${msg.color || 'var(--header-primary)'}">${msg.author}</span>
          ${msg.isBot ? '<span class="bot-tag">BOT</span>' : ''}
          <span class="message-timestamp">${msg.time}</span>
        </div>
        <div class="message-body">${formattedText}</div>
        ${embedHtml}
        ${reactionsHtml}
      </div>
      <div class="message-actions-bar">
        <button class="msg-action-btn action-react" title="Adicionar Reação">
          <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
        </button>
      </div>
    `;

    const authorEl = row.querySelector('.message-author');
    if (authorEl) {
      authorEl.addEventListener('click', (e) => {
        showUserPopout(e, msg.author, msg.avatar);
      });
    }

    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

// 8. SEND MESSAGE
function sendMessage(imageUrl = null) {
  const input = document.getElementById('chat-input-textarea');
  const text = input ? input.value.trim() : '';

  if (!text && !imageUrl) return;

  sounds.init();

  const now = new Date();
  const timeStr = `Hoje às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const messageObj = {
    id: Date.now(),
    author: AppState.user.name,
    avatar: AppState.user.avatar,
    avatarInitials: AppState.user.avatarInitials || 'LK',
    avatarBg: AppState.user.avatarBg || '#f47b97',
    color: '#5865f2',
    time: timeStr,
    text: text,
    reactions: []
  };

  if (imageUrl) {
    messageObj.embed = {
      image: imageUrl
    };
  }

  // Send via WebSocket to everyone
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'chat:message',
      channelId: AppState.currentChannelId,
      message: messageObj
    }));
  } else {
    // Local fallback
    if (!ChannelMessages[AppState.currentChannelId]) ChannelMessages[AppState.currentChannelId] = [];
    ChannelMessages[AppState.currentChannelId].push(messageObj);
    renderMessages();
  }

  if (input) input.value = '';
}

// 9. RENDER MEMBERS
function renderMembers() {
  const container = document.getElementById('members-list');
  if (!container) return;
  container.innerHTML = '';

  const groups = {};
  OnlineUsersList.forEach(m => {
    const cat = m.roleCategory || 'ONLINE';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  });

  Object.entries(groups).forEach(([catTitle, members]) => {
    const titleEl = document.createElement('div');
    titleEl.className = 'member-role-title';
    titleEl.innerText = `${catTitle} — ${members.length}`;
    container.appendChild(titleEl);

    members.forEach(member => {
      const item = document.createElement('div');
      item.className = 'member-item';

      item.innerHTML = `
        <div class="member-avatar-box">
          <img class="member-avatar" src="${member.avatar}" alt="${member.name}" />
          <div class="status-dot ${member.status || 'offline'}"></div>
        </div>
        <div class="member-info">
          <div class="member-name-row">
            <span class="member-name">${member.name}</span>
            ${member.isBot ? '<span class="bot-tag">BOT</span>' : ''}
          </div>
          ${member.activity ? `<span class="member-activity">${member.activity}</span>` : ''}
        </div>
      `;

      item.addEventListener('click', (e) => {
        showUserPopout(e, member.name, member.avatar);
      });

      container.appendChild(item);
    });
  });
}

// 10. USER POPOUT CARD
function showUserPopout(event, username, avatar) {
  const popout = document.getElementById('user-popout');
  if (!popout) return;

  document.getElementById('popout-avatar').src = avatar;
  document.getElementById('popout-username').innerText = username;
  document.getElementById('popout-handle').innerText = `@${username.toLowerCase().replace(/\s+/g, '_')}`;

  const rect = event.currentTarget.getBoundingClientRect();
  popout.style.top = `${Math.min(rect.top, window.innerHeight - 380)}px`;
  popout.style.left = `${Math.max(20, rect.left - 310)}px`;
  popout.style.display = 'block';
}

function hideUserPopout() {
  const popout = document.getElementById('user-popout');
  if (popout) popout.style.display = 'none';
}

// 11. EMOJI PICKER
function renderEmojiPicker() {
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  grid.innerHTML = '';
  EmojisCatalog.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.innerText = emoji;
    btn.addEventListener('click', () => {
      const input = document.getElementById('chat-input-textarea');
      if (input) {
        input.value += emoji;
        input.focus();
      }
      hideEmojiPicker();
    });
    grid.appendChild(btn);
  });
}

function toggleEmojiPicker(e) {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex';
}

function hideEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  if (picker) picker.style.display = 'none';
}

// 12. COPY SHARE LINK TO CLIPBOARD
async function copyInviteLink() {
  const url = AppState.networkShareUrl || window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast(`Link copiado: ${url} (Envie para seus amigos!)`);
  } catch (e) {
    prompt('Copie o link abaixo para enviar aos seus amigos:', url);
  }
}

// 13. EVENT LISTENERS
function setupEventListeners() {
  // Home (@me) button
  document.getElementById('home-guild-btn')?.addEventListener('click', () => {
    switchToFriendsView();
  });

  // Invite buttons
  document.getElementById('quick-invite-btn')?.addEventListener('click', copyInviteLink);
  document.getElementById('invite-friends-top-btn')?.addEventListener('click', copyInviteLink);
  document.getElementById('invite-banner-btn')?.addEventListener('click', copyInviteLink);

  // Send message on Enter
  const textarea = document.getElementById('chat-input-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Typing sync
    let typingTimer = null;
    textarea.addEventListener('input', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat:typing', channelId: AppState.currentChannelId, isTyping: true }));
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          ws.send(JSON.stringify({ type: 'chat:typing', channelId: AppState.currentChannelId, isTyping: false }));
        }, 1500);
      }
    });
  }

  // File upload trigger
  const uploadTrigger = document.getElementById('chat-upload-trigger');
  const fileInput = document.getElementById('chat-file-input');
  if (uploadTrigger && fileInput) {
    uploadTrigger.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          sendMessage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Emoji button
  document.getElementById('emoji-picker-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmojiPicker(e);
  });

  // Header Voice call button
  document.getElementById('header-voice-call-btn')?.addEventListener('click', () => {
    handleVoiceChannelClick('voz-geral', '🔊 Lounge Geral');
  });

  // Voice Controls
  document.getElementById('voice-share-screen-btn')?.addEventListener('click', toggleScreenShare);
  document.getElementById('voice-camera-btn')?.addEventListener('click', toggleCamera);
  document.getElementById('panel-camera-btn')?.addEventListener('click', toggleCamera);
  document.getElementById('panel-share-screen-btn')?.addEventListener('click', toggleScreenShare);
  document.getElementById('disconnect-voice-btn')?.addEventListener('click', disconnectVoice);
  document.getElementById('voice-room-leave-btn')?.addEventListener('click', disconnectVoice);
  document.getElementById('voice-room-close-btn')?.addEventListener('click', () => {
    document.getElementById('voice-room-overlay')?.classList.remove('active');
  });

  // Clicking on voice connection box opens the voice room overlay
  document.getElementById('voice-connected-panel')?.addEventListener('click', (e) => {
    if (e.target.closest('#disconnect-voice-btn') || e.target.closest('#panel-camera-btn') || e.target.closest('#panel-share-screen-btn')) {
      return;
    }
    const overlay = document.getElementById('voice-room-overlay');
    if (overlay) overlay.classList.toggle('active');
  });

  // Server Header Dropdown & Management
  document.getElementById('server-header-btn')?.addEventListener('click', (e) => {
    toggleServerDropdownMenu(e);
  });
  document.getElementById('menu-invite-btn')?.addEventListener('click', () => {
    copyInviteLink();
    hideServerDropdownMenu();
  });
  document.getElementById('menu-delete-server-btn')?.addEventListener('click', () => {
    openDeleteServerModal(AppState.currentServerId);
  });

  // Add Server Modal
  document.getElementById('add-server-btn')?.addEventListener('click', openCreateServerModal);
  document.getElementById('confirm-create-server-btn')?.addEventListener('click', handleCreateServerConfirm);
  document.getElementById('cancel-create-server-btn')?.addEventListener('click', closeCreateServerModal);
  document.getElementById('create-server-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-server-modal') closeCreateServerModal();
  });
  document.getElementById('new-server-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateServerConfirm();
    }
  });

  // Server Color Picker Choices
  document.querySelectorAll('#server-color-picker .color-dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#server-color-picker .color-dot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedServerColor = btn.dataset.color || '#5865f2';
    });
  });

  // Delete Server Modal
  document.getElementById('confirm-delete-server-btn')?.addEventListener('click', handleDeleteServerConfirm);
  document.getElementById('cancel-delete-server-btn')?.addEventListener('click', closeDeleteServerModal);
  document.getElementById('delete-server-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-server-modal') closeDeleteServerModal();
  });

  // Mute Mic button
  const muteBtn = document.getElementById('user-mute-btn');
  const voiceMicBtn = document.getElementById('voice-mic-toggle-btn');
  const toggleMute = () => {
    AppState.isMuted = !AppState.isMuted;
    if (localAudioStream) {
      localAudioStream.getAudioTracks().forEach(t => t.enabled = !AppState.isMuted);
    }
    if (AppState.isMuted) {
      muteBtn?.classList.add('active-danger');
      voiceMicBtn?.classList.add('danger');
      const muteTag = document.getElementById('local-mute-icon-tag');
      if (muteTag) muteTag.style.display = 'inline';
      sounds.playMute();
    } else {
      muteBtn?.classList.remove('active-danger');
      voiceMicBtn?.classList.remove('danger');
      const muteTag = document.getElementById('local-mute-icon-tag');
      if (muteTag) muteTag.style.display = 'none';
      sounds.playUnmute();
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'voice:mute',
        isMuted: AppState.isMuted
      }));
    }
    renderChannels();
  };
  muteBtn?.addEventListener('click', toggleMute);
  voiceMicBtn?.addEventListener('click', toggleMute);

  // Deafen button
  const deafenBtn = document.getElementById('user-deafen-btn');
  deafenBtn?.addEventListener('click', () => {
    AppState.isDeafened = !AppState.isDeafened;
    // Mute remote audios
    const audios = document.querySelectorAll('#remote-audios-container audio');
    audios.forEach(a => a.muted = AppState.isDeafened);
    if (AppState.isDeafened) {
      deafenBtn.classList.add('active-danger');
      sounds.playMute();
    } else {
      deafenBtn.classList.remove('active-danger');
      sounds.playUnmute();
    }
  });

  // Settings Modal
  const settingsBtn = document.getElementById('user-settings-btn');
  const settingsModal = document.getElementById('discord-settings-modal');
  const closeSettingsBtn = document.getElementById('settings-close-btn');

  settingsBtn?.addEventListener('click', () => settingsModal?.classList.add('open'));
  closeSettingsBtn?.addEventListener('click', () => settingsModal?.classList.remove('open'));

  // Save profile name
  document.getElementById('settings-save-profile-btn')?.addEventListener('click', () => {
    const val = document.getElementById('settings-name-input')?.value.trim();
    if (val) {
      AppState.user.name = val;
      localStorage.setItem('discord_uname', val);
      document.getElementById('user-bar-name').innerText = val;
      document.getElementById('local-voice-name').innerText = `${val} (Você)`;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'user:identify', user: AppState.user }));
      }
      showToast('Nome atualizado com sucesso!');
    }
  });

  // Settings Theme Switches
  document.querySelectorAll('.theme-option-card').forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.dataset.theme;
      document.body.dataset.theme = theme;
      document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // Member list toggle
  document.getElementById('member-list-toggle-btn')?.addEventListener('click', () => {
    const sb = document.getElementById('members-sidebar');
    if (sb) sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
  });

  // Global click & ESC listener
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#user-popout')) hideUserPopout();
    if (!e.target.closest('#emoji-picker') && !e.target.closest('#emoji-picker-btn')) hideEmojiPicker();
    if (!e.target.closest('#server-dropdown-menu') && !e.target.closest('#server-header-btn')) hideServerDropdownMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      settingsModal?.classList.remove('open');
      closeCreateServerModal();
      closeDeleteServerModal();
      hideServerDropdownMenu();
      hideUserPopout();
      hideEmojiPicker();
      document.getElementById('voice-room-overlay')?.classList.remove('active');
    }
  });

  // PWA Desktop App Installation
  let deferredPrompt = null;
  const installBtn = document.getElementById('install-pwa-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'flex';
  });

  installBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Discord instalado com sucesso no seu computador!');
        if (installBtn) installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    } else {
      showToast('Para instalar: clique no ícone de instalar na barra do navegador');
    }
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    showToast('Aplicativo Discord instalado!');
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration skipped:', err);
    });
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
