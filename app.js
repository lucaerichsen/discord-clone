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
const ServersData = {
  'servidor-lk': {
    name: 'Servidor de lk',
    iconText: 'SD',
    verified: false,
    categories: [
      {
        name: 'Canais de texto',
        channels: [
          { id: 'geral', name: 'geral', type: 'text', topic: 'Espaço geral para trocar ideias e mensagens.' }
        ]
      },
      {
        name: 'Canais de voz',
        channels: [
          { id: 'geral-voz', name: 'Geral', type: 'voice' }
        ]
      }
    ]
  },
  'lucaverna-devs': {
    name: 'Lucaverna Devs',
    iconText: 'LD',
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
      const baseStatic = OnlineUsersList.filter(u => u.isBot || u.id === 'user_claudio' || u.id === 'user_sophia');
      OnlineUsersList = [...baseStatic, ...remoteUsers];
      renderMembers();
      renderFriendsHub();
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
      const card = document.getElementById(`voice-card-${peerId}`);
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
      }
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
    // 1. Request real microphone access
    localAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    console.log('[WebRTC] Microfone real capturado com sucesso!');
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
      voiceChannelId: channelId
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

// Real Screen Share
async function toggleScreenShare() {
  if (AppState.isScreenSharing) {
    // Stop screen share
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(t => t.stop());
      localScreenStream = null;
    }
    AppState.isScreenSharing = false;
    const btn = document.getElementById('voice-share-screen-btn');
    if (btn) btn.classList.remove('active-control');

    const videoPreview = document.getElementById('local-video-preview');
    if (videoPreview) {
      videoPreview.srcObject = null;
      videoPreview.style.display = 'none';
    }
    showToast('Compartilhamento de tela encerrado.');
  } else {
    try {
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      AppState.isScreenSharing = true;
      const btn = document.getElementById('voice-share-screen-btn');
      if (btn) btn.classList.add('active-control');

      const videoPreview = document.getElementById('local-video-preview');
      if (videoPreview) {
        videoPreview.srcObject = localScreenStream;
        videoPreview.style.display = 'block';
      }

      // Add screen video track to all existing peer connections
      const videoTrack = localScreenStream.getVideoTracks()[0];
      peerConnections.forEach(pc => {
        pc.addTrack(videoTrack, localScreenStream);
      });

      videoTrack.onended = () => {
        toggleScreenShare();
      };

      showToast('Compartilhando tela em tempo real!');
    } catch (err) {
      console.warn('Compartilhamento cancelado ou negado:', err);
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
    const btn = document.getElementById('voice-camera-btn');
    if (btn) btn.classList.remove('active-control');

    const videoPreview = document.getElementById('local-video-preview');
    if (videoPreview && !AppState.isScreenSharing) {
      videoPreview.srcObject = null;
      videoPreview.style.display = 'none';
    }
  } else {
    try {
      localCameraStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      AppState.isCameraOn = true;
      const btn = document.getElementById('voice-camera-btn');
      if (btn) btn.classList.add('active-control');

      const videoPreview = document.getElementById('local-video-preview');
      if (videoPreview) {
        videoPreview.srcObject = localCameraStream;
        videoPreview.style.display = 'block';
      }

      const videoTrack = localCameraStream.getVideoTracks()[0];
      peerConnections.forEach(pc => {
        pc.addTrack(videoTrack, localCameraStream);
      });
    } catch (err) {
      console.warn('Câmera indisponível:', err);
      showToast('Aviso: Câmera não disponível no momento.');
    }
  }
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

    wrapper.innerHTML = `
      <div class="guild-pill"></div>
      <div class="guild-icon-btn" title="${server.name}">
        ${server.iconText}
      </div>
    `;

    wrapper.addEventListener('click', () => {
      AppState.viewMode = 'server';
      AppState.currentServerId = serverId;

      document.querySelectorAll('.guild-item-wrapper').forEach(el => el.classList.remove('active'));
      wrapper.classList.add('active');

      const firstChannel = server.categories[1]?.channels[0] || server.categories[0]?.channels[0];
      if (firstChannel) {
        AppState.currentChannelId = firstChannel.id;
        AppState.currentChannelName = firstChannel.name;
        AppState.currentChannelTopic = firstChannel.topic || '';
      }

      switchToServerView();
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
        item.innerHTML = `
          <div class="channel-icon voice-icon">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.411C2 15.961 2.45 16.411 3 16.411H6L10.293 20.704C10.579 20.99 11.009 21.075 11.383 20.921C11.757 20.767 12 20.404 12 20V4.00004C12 3.59604 11.757 3.23304 11.383 3.07904ZM14 6.79v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </div>
          <div class="channel-name">${ch.name}</div>
          <div class="channel-actions">
            <button class="channel-action-btn invite-btn" title="Criar convite">
              <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </button>
            <button class="channel-action-btn settings-btn" title="Editar canal">
              <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
          </div>
        `;

        item.querySelector('.invite-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          copyInviteLink();
        });

        item.querySelector('.settings-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          showToast(`Configurações de canal: ${ch.name}`);
        });

        item.addEventListener('click', () => {
          handleVoiceChannelClick(ch.id, ch.name);
        });

        catItems.appendChild(item);

        // If local user or remote peers are in this voice channel, render the indented user tree!
        const peersInChannel = Array.from(remotePeersData.values()).filter(p => !p.voiceChannelId || p.voiceChannelId === ch.id);
        const hasUsersInVoice = isConnectedVoice || peersInChannel.length > 0;

        if (hasUsersInVoice) {
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
              ${AppState.isMuted ? '<span class="voice-tree-mute-icon">🔇</span>' : ''}
            `;

            localRow.addEventListener('click', (e) => {
              e.stopPropagation();
              const overlay = document.getElementById('voice-room-overlay');
              if (overlay) overlay.classList.toggle('active');
            });

            treeContainer.appendChild(localRow);
          }

          // Remote peers rows
          peersInChannel.forEach(peer => {
            const peerRow = document.createElement('div');
            peerRow.className = `voice-tree-user ${peer.isSpeaking ? 'speaking' : ''}`;
            peerRow.id = `peer-voice-tree-${peer.peerId}`;

            let peerAvatar = '';
            if (peer.user?.avatar && peer.user.avatar.startsWith('http')) {
              peerAvatar = `<img src="${peer.user.avatar}" alt="${peer.user?.name || 'Amigo'}" />`;
            } else {
              peerAvatar = (peer.user?.name || 'LK').substring(0, 2).toUpperCase();
            }

            peerRow.innerHTML = `
              <div class="voice-tree-avatar" style="background-color: ${peer.user?.avatarBg || '#5865f2'}; color: #fff;">
                ${peerAvatar}
              </div>
              <span class="voice-tree-name">${peer.user?.name || 'Amigo'}</span>
              ${peer.isMuted ? '<span class="voice-tree-mute-icon">🔇</span>' : ''}
            `;

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
  document.getElementById('disconnect-voice-btn')?.addEventListener('click', disconnectVoice);
  document.getElementById('voice-room-leave-btn')?.addEventListener('click', disconnectVoice);
  document.getElementById('voice-room-close-btn')?.addEventListener('click', () => {
    document.getElementById('voice-room-overlay')?.classList.remove('active');
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
      document.getElementById('local-mute-icon-tag').style.display = 'inline';
      sounds.playMute();
    } else {
      muteBtn?.classList.remove('active-danger');
      voiceMicBtn?.classList.remove('danger');
      document.getElementById('local-mute-icon-tag').style.display = 'none';
      sounds.playUnmute();
    }
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
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      settingsModal?.classList.remove('open');
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
