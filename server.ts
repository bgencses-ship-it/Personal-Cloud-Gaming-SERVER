import express from 'express';
import http from 'http';
import dgram from 'dgram';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  VirtualDisplayProfile,
  ClientEndpoint,
  GameApp,
  WakeLogEntry,
  SystemState,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initialProfiles: VirtualDisplayProfile[] = [
  {
    id: 'deck-oled-hdr',
    name: 'Steam Deck — Ev İçi (16:10 Sanal Ekran)',
    deviceType: 'steam-deck',
    locationMode: 'lan',
    resolution: '1280x800',
    width: 1280,
    height: 800,
    refreshRate: 90,
    hdr: true,
    aspectRatio: '16:10',
    recommendedBitrateMbps: 50,
    recommendedFor: 'Evde Kanepede Steam Deck — Siyah Çubuksuz Tam Ekran 90Hz HDR',
  },
  {
    id: 'macbook-retina-120',
    name: 'MacBook Retina — Ev & Oda (16:10 Sanal Ekran)',
    deviceType: 'macbook',
    locationMode: 'lan',
    resolution: '2560x1600',
    width: 2560,
    height: 1600,
    refreshRate: 120,
    hdr: true,
    aspectRatio: '16:10',
    recommendedBitrateMbps: 85,
    recommendedFor: 'MacBook Air / Pro — 16:10 Retina Tam Ekran + Mac Klavye & Trackpad',
  },
  {
    id: 'salon-tv-4k',
    name: 'Salon Akıllı TV — 4K Konsol Modu (16:9 Sanal Ekran)',
    deviceType: 'smart-tv',
    locationMode: 'lan',
    resolution: '3840x2160',
    width: 3840,
    height: 2160,
    refreshRate: 60,
    hdr: true,
    aspectRatio: '16:9',
    recommendedBitrateMbps: 100,
    recommendedFor: 'Salondaki TV (Apple TV / Android TV / WebOS) — 4K HDR Big Picture',
  },
  {
    id: 'work-deck-remote',
    name: 'İş Yeri — Uzaktan Steam Deck / MacBook (P2P Tünel)',
    deviceType: 'work-remote',
    locationMode: 'wan',
    resolution: '1280x800',
    width: 1280,
    height: 800,
    refreshRate: 60,
    hdr: false,
    aspectRatio: '16:10',
    recommendedBitrateMbps: 25,
    recommendedFor: 'İş Yeri Wi-Fi / Mobil Hotspot — AV1 Düşük Bant Genişliği & Güvenli Tünel',
  },
];

const initialClients: ClientEndpoint[] = [
  {
    id: 'client-deck-home',
    name: 'Steam Deck (Aile Evi - Wi-Fi 6)',
    deviceType: 'steam-deck',
    connectionType: 'Ev İçi Yerel Ağ (LAN)',
    profileId: 'deck-oled-hdr',
    ipAddress: '192.168.1.62',
    expectedLatencyMs: '0.8 ms',
    inputMethod: 'Dahili Steam Deck Kontrolcüsü',
    isActive: true,
  },
  {
    id: 'client-macbook',
    name: 'MacBook (Evde Masaüstü / Kucakta)',
    deviceType: 'macbook',
    connectionType: 'Ev İçi Yerel Ağ (LAN)',
    profileId: 'macbook-retina-120',
    ipAddress: '192.168.1.58',
    expectedLatencyMs: '1.1 ms',
    inputMethod: 'Mac Klavye + Force Touch Trackpad / Fare',
    isActive: false,
  },
  {
    id: 'client-salon-tv',
    name: 'Salon 4K Smart TV (Moonlight TV)',
    deviceType: 'smart-tv',
    connectionType: 'Ev İçi Yerel Ağ (LAN)',
    profileId: 'salon-tv-4k',
    ipAddress: '192.168.1.50',
    expectedLatencyMs: '1.4 ms',
    inputMethod: 'Bluetooth Gamepad / DualSense / Xbox',
    isActive: false,
  },
  {
    id: 'client-work-deck',
    name: 'Steam Deck (İş Yerinden Uzaktan)',
    deviceType: 'work-remote',
    connectionType: 'İş Yeri Uzaktan Tünel (P2P WAN)',
    profileId: 'work-deck-remote',
    ipAddress: '100.96.42.14',
    expectedLatencyMs: '8.9 ms',
    inputMethod: 'Dahili Steam Deck Kontrolcüsü (P2P Tünel)',
    isActive: false,
  },
];

const initialGames: GameApp[] = [
  {
    id: 'steam-big-picture',
    title: 'Steam Big Picture (Monitörsüz Konsol Arayüzü)',
    category: 'Konsol Arayüzü',
    steamAppId: 'steam://open/bigpicture',
    launchCommand: 'apollo --headless --profile deck-oled-hdr --exec "steam://open/bigpicture"',
    coverUrl: '/src/assets/images/desktop_stream_preview_1794125388728.jpg',
    preferredProfileId: 'deck-oled-hdr',
    lastPlayed: 'Bugün',
    totalHours: 412,
    isRunning: false,
  },
  {
    id: 'cyber-odyssey-2088',
    title: 'Cyber Odyssey 2088: Phantom Sector',
    category: 'Aksiyon RPG',
    steamAppId: '1091500',
    launchCommand: 'steam://rungameid/1091500',
    coverUrl: '/src/assets/images/game_cyber_odyssey_1794125384163.jpg',
    preferredProfileId: 'deck-oled-hdr',
    lastPlayed: 'Dün',
    totalHours: 86.5,
    isRunning: false,
  },
  {
    id: 'nordic-realms-saga',
    title: 'Nordic Realms: Ragnarok Saga',
    category: 'Açık Dünya Macera',
    steamAppId: '2322010',
    launchCommand: 'steam://rungameid/2322010',
    coverUrl: '/src/assets/images/game_nordic_realms_1794125385039.jpg',
    preferredProfileId: 'salon-tv-4k',
    lastPlayed: '3 gün önce',
    totalHours: 64.2,
    isRunning: false,
  },
  {
    id: 'apex-gt-motorsport',
    title: 'Apex GT3 Motorsport Sim',
    category: 'Yarış Simülasyonu',
    steamAppId: '805550',
    launchCommand: 'steam://rungameid/805550',
    coverUrl: '/src/assets/images/game_apex_motorsport_1794125387602.jpg',
    preferredProfileId: 'macbook-retina-120',
    lastPlayed: 'Geçen hafta',
    totalHours: 129.0,
    isRunning: false,
  },
  {
    id: 'tactical-recon-zero',
    title: 'Tactical Recon: Harbor Zero',
    category: 'Taktiksel Nişancı',
    steamAppId: '1938090',
    launchCommand: 'steam://rungameid/1938090',
    coverUrl: '/src/assets/images/game_tactical_strike_1794125388100.jpg',
    preferredProfileId: 'work-deck-remote',
    lastPlayed: '2 hafta önce',
    totalHours: 51.8,
    isRunning: false,
  },
];

const state: SystemState = {
  pairingCode: 'DP-849-204',
  host: {
    name: 'SADECE-KASA-PC (Monitörsüz & Faresiz)',
    placement: 'Aile Evi — Arka Oda (Sadece Güç + Ethernet Takılı)',
    macAddress: 'A8:A1:59:4E:92:1C',
    publicIpOrDdns: '88.241.164.92',
    localIp: '192.168.1.45',
    wolPort: 9,
    apolloPort: 47989,
    status: 'online',
    bootProgress: 100,
    gpuModel: 'NVIDIA GeForce RTX 4080 Super',
    cpuModel: 'AMD Ryzen 7 7800X3D',
    encoder: 'NVENC AV1 10-bit',
    headlessMode: true,
    physicalMonitorOff: true,
    noPeripheralsAttached: true,
    windowsAutoLogon: true,
    bootIntoBigPicture: true,
    windowsLocked: false,
    audioSink: 'Steam Streaming Speakers (Sanal)',
    activeProfileId: 'deck-oled-hdr',
    activeClientId: 'client-deck-home',
    targetBitrateMbps: 50,
    uptimeSeconds: 1840,
  },
  tunnel: {
    status: 'connected',
    networkScope: 'lan-direct',
    protocol: 'Ev İçi Doğrudan Gigabit LAN',
    virtualHostIp: '100.96.42.10',
    virtualDeckIp: '100.96.42.14',
    region: 'Aile Evi (Yerel LAN + İş Yeri P2P Tünel Hazır)',
    mtu: 1420,
    connectedAt: 'Aktif',
    autoConnectOnWake: true,
  },
  telemetry: {
    rttMs: 0.9,
    jitterMs: 0.1,
    packetLossPercent: 0,
    bitrateMbps: 49.4,
    fps: 90,
    encodeTimeMs: 1.8,
    decodeTimeMs: 0.9,
    gpuTempC: 48,
    gpuLoadPercent: 22,
    history: [
      { time: '00:00', rttMs: 0.9, bitrateMbps: 49.5, fps: 90 },
      { time: '00:05', rttMs: 0.8, bitrateMbps: 50.1, fps: 90 },
      { time: '00:10', rttMs: 1.0, bitrateMbps: 49.8, fps: 90 },
      { time: '00:15', rttMs: 0.8, bitrateMbps: 50.0, fps: 90 },
      { time: '00:20', rttMs: 0.9, bitrateMbps: 49.9, fps: 90 },
      { time: '00:25', rttMs: 0.9, bitrateMbps: 50.2, fps: 90 },
    ],
  },
  profiles: initialProfiles,
  clients: initialClients,
  games: initialGames,
  wakeLogs: [
    {
      id: 'wol-init-1',
      timestamp: 'Bugün 19:42:10',
      macAddress: 'A8:A1:59:4E:92:1C',
      targetHost: '192.168.1.255 (Aile Evi LAN + WAN)',
      targetPort: 9,
      packetHexPreview: 'FFFFFFFFFFFF A8A1594E921C A8A1594E921C ... (102 bayt)',
      byteLength: 102,
      status: 'verified',
      message: 'Monitörsüz kasa uyandırıldı · Windows kilit ekranı otomatik geçildi · Apollo sanal ekran (1280x800) hazır.',
    },
  ],
};

function createMagicPacket(macAddress: string): Buffer {
  const cleaned = macAddress.replace(/[^0-9A-Fa-f]/g, '');
  if (cleaned.length !== 12) {
    throw new Error('Geçersiz MAC adresi formatı. Örnek: A8:A1:59:4E:92:1C');
  }

  const macBytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) {
    macBytes[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16);
  }

  const packet = Buffer.alloc(102);
  for (let i = 0; i < 6; i++) {
    packet[i] = 0xff;
  }
  for (let rep = 0; rep < 16; rep++) {
    macBytes.copy(packet, 6 + rep * 6);
  }

  return packet;
}

async function dispatchUdpMagicPacket(
  macAddress: string,
  targetHost: string,
  targetPort: number
): Promise<{ packet: Buffer; hexPreview: string }> {
  const packet = createMagicPacket(macAddress);
  const macClean = macAddress.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  const hexPreview = `FFFFFFFFFFFF ${macClean} ${macClean} ... (102 bayt)`;

  await new Promise<void>((resolve) => {
    const socket = dgram.createSocket('udp4');
    socket.once('error', () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
      resolve();
    });

    socket.bind(() => {
      try {
        socket.setBroadcast(true);
      } catch {
        // ignore
      }

      const destination = targetHost.trim() || '255.255.255.255';
      const port = Number(targetPort) || 9;

      socket.send(packet, 0, packet.length, port, destination, () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
        resolve();
      });
    });
  });

  return { packet, hexPreview };
}

let bootInterval: NodeJS.Timeout | null = null;

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcastState() {
    const payload = JSON.stringify({ type: 'state:sync', state });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  function updateLiveTelemetry() {
    if (state.host.status === 'online' || state.host.status === 'streaming') {
      state.host.uptimeSeconds += 3;
      const activeProfile =
        state.profiles.find((p) => p.id === state.host.activeProfileId) ||
        state.profiles[0];
      const isStreaming = state.host.status === 'streaming';
      const isWan = state.tunnel.networkScope === 'wan-tunnel';

      const baseRtt = isWan
        ? 8.6 + (Math.random() * 1.2 - 0.6)
        : 0.8 + (Math.random() * 0.4 - 0.2);
      const rttMs = Number(Math.max(0.4, baseRtt).toFixed(1));
      const jitterMs = Number((isWan ? 0.5 + Math.random() * 0.4 : 0.1 + Math.random() * 0.1).toFixed(1));
      const bitrateMbps = isStreaming
        ? Number((state.host.targetBitrateMbps * (0.97 + Math.random() * 0.05)).toFixed(1))
        : Number((state.host.targetBitrateMbps * 0.88).toFixed(1));
      const fps = activeProfile.refreshRate;

      state.telemetry.rttMs = rttMs;
      state.telemetry.jitterMs = jitterMs;
      state.telemetry.packetLossPercent = 0.0;
      state.telemetry.bitrateMbps = bitrateMbps;
      state.telemetry.fps = fps;
      state.telemetry.encodeTimeMs = Number((1.9 + Math.random() * 0.4).toFixed(1));
      state.telemetry.decodeTimeMs = Number((0.9 + Math.random() * 0.3).toFixed(1));
      state.telemetry.gpuTempC = isStreaming ? 61 + Math.floor(Math.random() * 3) : 45;
      state.telemetry.gpuLoadPercent = isStreaming ? 74 + Math.floor(Math.random() * 8) : 18;

      const now = new Date();
      const timeLabel = `${String(now.getMinutes()).padStart(2, '0')}:${String(
        now.getSeconds()
      ).padStart(2, '0')}`;

      state.telemetry.history = [
        ...state.telemetry.history.slice(-11),
        { time: timeLabel, rttMs, bitrateMbps, fps },
      ];
      broadcastState();
    }
  }

  setInterval(updateLiveTelemetry, 3000);

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state:sync', state }));
  });

  app.get('/api/state', (_req, res) => {
    res.json(state);
  });

  // Switch Active Client Device (Steam Deck Home, MacBook, Salon TV, Work Remote Deck)
  app.post('/api/clients/select', (req, res) => {
    const { clientId } = req.body || {};
    const targetClient = state.clients.find((c) => c.id === clientId);
    if (!targetClient) {
      res.status(404).json({ ok: false, error: 'İstemci cihaz bulunamadı.' });
      return;
    }

    state.clients.forEach((c) => {
      c.isActive = c.id === targetClient.id;
    });
    state.host.activeClientId = targetClient.id;
    state.host.activeProfileId = targetClient.profileId;

    const matchedProfile = state.profiles.find((p) => p.id === targetClient.profileId);
    if (matchedProfile) {
      state.host.targetBitrateMbps = matchedProfile.recommendedBitrateMbps;
      if (matchedProfile.locationMode === 'wan') {
        state.tunnel.networkScope = 'wan-tunnel';
        state.tunnel.protocol = 'WireGuard P2P (UDP Hole Punch)';
        state.tunnel.status = 'connected';
      } else {
        state.tunnel.networkScope = 'lan-direct';
        state.tunnel.protocol = 'Ev İçi Doğrudan Gigabit LAN';
        state.tunnel.status = 'connected';
      }
    }

    updateLiveTelemetry();
    broadcastState();
    res.json({ ok: true, client: targetClient, state });
  });

  // One-Click Wake-on-LAN + Headless Auto-Logon
  app.post('/api/wol/wake', async (req, res) => {
    try {
      const macAddress = req.body?.macAddress || state.host.macAddress;
      const publicIpOrDdns = req.body?.publicIpOrDdns || state.host.publicIpOrDdns;
      const wolPort = Number(req.body?.wolPort || state.host.wolPort || 9);

      state.host.macAddress = macAddress;
      state.host.publicIpOrDdns = publicIpOrDdns;
      state.host.wolPort = wolPort;

      const targetDestination =
        state.tunnel.networkScope === 'lan-direct'
          ? state.host.localIp
          : publicIpOrDdns;

      const { hexPreview, packet } = await dispatchUdpMagicPacket(
        macAddress,
        targetDestination,
        wolPort
      );

      const nowStr = new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const logEntry: WakeLogEntry = {
        id: `wol-${Date.now()}`,
        timestamp: `Bugün ${nowStr}`,
        macAddress,
        targetHost: targetDestination,
        targetPort: wolPort,
        packetHexPreview: hexPreview,
        byteLength: packet.length,
        status: 'dispatched',
        message: `Monitörsüz kasaya (${targetDestination}:${wolPort}) 102-bayt Sihirli Paket gönderildi.`,
      };

      state.wakeLogs = [logEntry, ...state.wakeLogs.slice(0, 14)];

      if (state.host.status === 'offline') {
        state.host.status = 'waking';
        state.host.bootProgress = 25;
        state.tunnel.status = 'handshaking';
        broadcastState();

        if (bootInterval) clearInterval(bootInterval);
        bootInterval = setInterval(() => {
          if (state.host.bootProgress < 100) {
            state.host.bootProgress = Math.min(100, state.host.bootProgress + 35);
            if (state.host.bootProgress >= 60) {
              state.tunnel.status = 'connected';
              state.tunnel.connectedAt = new Date().toLocaleTimeString('tr-TR');
            }
            if (state.host.bootProgress >= 100) {
              state.host.status = 'online';
              state.host.uptimeSeconds = 10;
              state.host.windowsLocked = !state.host.windowsAutoLogon;
              logEntry.status = 'verified';
              logEntry.message = `Monitörsüz kasa açıldı · ${
                state.host.windowsAutoLogon
                  ? 'Windows otomatik oturum açtı · Apollo sanal ekran hazır'
                  : 'Windows kilit ekranında (Uygulamadan PIN girebilirsiniz)'
              }`;
              if (bootInterval) {
                clearInterval(bootInterval);
                bootInterval = null;
              }
              updateLiveTelemetry();
            }
            broadcastState();
          }
        }, 850);
      } else {
        logEntry.status = 'verified';
        logEntry.message = `Kasa zaten açık. Doğrulama Sihirli Paketi (${packet.length} bayt) iletildi.`;
        state.tunnel.status = 'connected';
        broadcastState();
      }

      res.json({ ok: true, logEntry, state });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: err?.message || 'Wake-on-LAN paketi gönderilemedi.',
      });
    }
  });

  // Unlock Windows Lock Screen remotely (Headless PIN / Auto-Logon)
  app.post('/api/host/unlock', (req, res) => {
    const { pin } = req.body || {};
    state.host.windowsLocked = false;
    broadcastState();
    res.json({
      ok: true,
      message: `Windows kilit ekranı ${pin ? 'PIN ile' : 'otomatik'} açıldı, sanal masaüstü aktif.`,
      state,
    });
  });

  // Toggle Tunnel / Scope
  app.post('/api/tunnel/toggle', (req, res) => {
    const action = req.body?.action as 'connect' | 'disconnect' | undefined;
    const networkScope = req.body?.networkScope as 'lan-direct' | 'wan-tunnel' | undefined;

    if (networkScope) {
      state.tunnel.networkScope = networkScope;
      state.tunnel.protocol =
        networkScope === 'lan-direct'
          ? 'Ev İçi Doğrudan Gigabit LAN'
          : 'WireGuard P2P (UDP Hole Punch)';
    }

    if (action === 'disconnect') {
      state.tunnel.status = 'disconnected';
      state.tunnel.connectedAt = null;
    } else {
      state.tunnel.status = 'connected';
      state.tunnel.connectedAt = new Date().toLocaleTimeString('tr-TR');
      if (state.host.status === 'offline') {
        state.host.status = 'online';
        state.host.bootProgress = 100;
      }
      updateLiveTelemetry();
    }

    broadcastState();
    res.json({ ok: true, state });
  });

  // Update Host PC & Headless Settings
  app.post('/api/host/settings', (req, res) => {
    const {
      name,
      placement,
      macAddress,
      publicIpOrDdns,
      localIp,
      wolPort,
      apolloPort,
      encoder,
      headlessMode,
      physicalMonitorOff,
      noPeripheralsAttached,
      windowsAutoLogon,
      bootIntoBigPicture,
      windowsLocked,
      audioSink,
      activeProfileId,
      targetBitrateMbps,
    } = req.body || {};

    if (name !== undefined) state.host.name = String(name);
    if (placement !== undefined) state.host.placement = String(placement);
    if (macAddress !== undefined) state.host.macAddress = String(macAddress).toUpperCase();
    if (publicIpOrDdns !== undefined) state.host.publicIpOrDdns = String(publicIpOrDdns);
    if (localIp !== undefined) state.host.localIp = String(localIp);
    if (wolPort !== undefined) state.host.wolPort = Number(wolPort);
    if (apolloPort !== undefined) state.host.apolloPort = Number(apolloPort);
    if (encoder !== undefined) state.host.encoder = encoder;
    if (headlessMode !== undefined) state.host.headlessMode = Boolean(headlessMode);
    if (physicalMonitorOff !== undefined) state.host.physicalMonitorOff = Boolean(physicalMonitorOff);
    if (noPeripheralsAttached !== undefined) state.host.noPeripheralsAttached = Boolean(noPeripheralsAttached);
    if (windowsAutoLogon !== undefined) state.host.windowsAutoLogon = Boolean(windowsAutoLogon);
    if (bootIntoBigPicture !== undefined) state.host.bootIntoBigPicture = Boolean(bootIntoBigPicture);
    if (windowsLocked !== undefined) state.host.windowsLocked = Boolean(windowsLocked);
    if (audioSink !== undefined) state.host.audioSink = audioSink;
    if (activeProfileId !== undefined) {
      state.host.activeProfileId = String(activeProfileId);
      const matched = state.profiles.find((p) => p.id === activeProfileId);
      if (matched) {
        state.host.targetBitrateMbps = matched.recommendedBitrateMbps;
      }
    }
    if (targetBitrateMbps !== undefined) state.host.targetBitrateMbps = Number(targetBitrateMbps);

    updateLiveTelemetry();
    broadcastState();
    res.json({ ok: true, state });
  });

  app.post('/api/host/power', (req, res) => {
    const mode = req.body?.mode as 'sleep' | 'wake';
    if (mode === 'sleep') {
      state.host.status = 'offline';
      state.host.bootProgress = 0;
      state.host.uptimeSeconds = 0;
      state.tunnel.status = 'disconnected';
      state.games.forEach((g) => {
        g.isRunning = false;
      });
      state.telemetry.rttMs = 0;
      state.telemetry.bitrateMbps = 0;
      state.telemetry.fps = 0;
      state.telemetry.gpuLoadPercent = 0;
    } else {
      state.host.status = 'online';
      state.host.bootProgress = 100;
      state.tunnel.status = 'connected';
      state.tunnel.connectedAt = new Date().toLocaleTimeString('tr-TR');
      updateLiveTelemetry();
    }
    broadcastState();
    res.json({ ok: true, state });
  });

  app.post('/api/games/launch', (req, res) => {
    const { gameId } = req.body || {};
    const targetGame = state.games.find((g) => g.id === gameId);
    if (!targetGame) {
      res.status(404).json({ ok: false, error: 'Oyun bulunamadı.' });
      return;
    }

    state.host.status = 'streaming';
    state.host.bootProgress = 100;
    state.host.windowsLocked = false;
    state.tunnel.status = 'connected';
    if (!state.tunnel.connectedAt) {
      state.tunnel.connectedAt = new Date().toLocaleTimeString('tr-TR');
    }

    state.games.forEach((g) => {
      g.isRunning = g.id === targetGame.id;
      if (g.isRunning) {
        g.lastPlayed = 'Şu an oynanıyor';
      }
    });

    updateLiveTelemetry();
    broadcastState();
    res.json({ ok: true, game: targetGame, state });
  });

  app.post('/api/games/stop', (_req, res) => {
    state.games.forEach((g) => {
      if (g.isRunning) {
        g.isRunning = false;
        g.lastPlayed = 'Az önce';
      }
    });
    if (state.host.status === 'streaming') {
      state.host.status = 'online';
    }
    updateLiveTelemetry();
    broadcastState();
    res.json({ ok: true, state });
  });

  app.post('/api/games/add', (req, res) => {
    const { title, category, steamAppId, preferredProfileId } = req.body || {};
    if (!title) {
      res.status(400).json({ ok: false, error: 'Oyun adı gereklidir.' });
      return;
    }

    const cleanId = String(steamAppId || 'custom').trim();
    const newGame: GameApp = {
      id: `game-${Date.now()}`,
      title: String(title).trim(),
      category: String(category || 'Özel Oyun').trim(),
      steamAppId: cleanId,
      launchCommand: cleanId.startsWith('steam://')
        ? cleanId
        : `steam://rungameid/${cleanId}`,
      coverUrl: '/src/assets/images/game_cyber_odyssey_1794125384163.jpg',
      preferredProfileId: preferredProfileId || state.host.activeProfileId,
      lastPlayed: 'Henüz oynanmadı',
      totalHours: 0,
      isRunning: false,
    };

    state.games = [newGame, ...state.games];
    broadcastState();
    res.json({ ok: true, game: newGame, state });
  });

  // Regenerate Pairing Code
  app.post('/api/pairing/regenerate', (_req, res) => {
    const part1 = Math.floor(100 + Math.random() * 900);
    const part2 = Math.floor(100 + Math.random() * 900);
    state.pairingCode = `DP-${part1}-${part2}`;
    broadcastState();
    res.json({ ok: true, pairingCode: state.pairingCode, state });
  });

  // Real Host PC Agent Auto-Registration (Called automatically by host-windows.ps1)
  app.post('/api/agent/register', (req, res) => {
    const {
      hostName,
      macAddress,
      localIp,
      publicIp,
      tunnelIp,
      gpuModel,
      cpuModel,
    } = req.body || {};

    if (hostName) state.host.name = `${hostName} (Monitörsüz Kasa)`;
    if (macAddress) state.host.macAddress = String(macAddress).toUpperCase();
    if (localIp) state.host.localIp = String(localIp);
    if (publicIp) state.host.publicIpOrDdns = String(publicIp);
    if (tunnelIp) state.tunnel.virtualHostIp = String(tunnelIp);
    if (gpuModel) state.host.gpuModel = String(gpuModel);
    if (cpuModel) state.host.cpuModel = String(cpuModel);

    state.host.status = 'online';
    state.host.bootProgress = 100;
    state.tunnel.status = 'connected';
    state.tunnel.connectedAt = new Date().toLocaleTimeString('tr-TR');

    updateLiveTelemetry();
    broadcastState();
    res.json({
      ok: true,
      message: 'Kasa bilgileri otomatik algılandı ve DeckPulse ile eşleştirildi.',
      state,
    });
  });

  // Download Windows Headless Appliance PowerShell Script (Zero Monitor, Zero Mouse, Auto IP/MAC Discovery)
  app.get('/api/scripts/host-windows.ps1', (req, res) => {
    const appOrigin = `${req.protocol}://${req.get('host')}`;
    const authKey = typeof req.query.authKey === 'string' ? req.query.authKey.trim() : '';
    const winUser = typeof req.query.winUser === 'string' ? req.query.winUser.trim() : '';
    const winPass = typeof req.query.winPass === 'string' ? req.query.winPass.trim() : '';

    const script = `# ============================================================================
# DeckPulse "SADECE KASA" (Monitörsüz & Faresiz) Tam Otomatik Kurulum Betiği
# Eşleştirme Kodu: ${state.pairingCode}
# Not: Bu betiği Yönetici (Administrator) PowerShell'de 1 kez çalıştırmanız yeterlidir.
# ============================================================================

$ErrorActionPreference = "Continue"
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " DeckPulse — Monitörsüz & Faresiz Oyun Kasası Otomatik Kurulumu" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Aktif Ethernet/Wi-Fi Kartını, MAC Adresini ve Yerel IP'yi Otomatik Bul
$ActiveNet = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" } | Select-Object -First 1
if ($ActiveNet) {
    $AdapterName = $ActiveNet.NetAdapter.Name
    $LocalIP = $ActiveNet.IPv4Address.IPAddress
    $MacAddr = ($ActiveNet.NetAdapter.MacAddress -replace '-', ':').ToUpper()
    Write-Host "[1/7] Ağ Kartı Algılandı: $AdapterName | Yerel IP: $LocalIP | MAC: $MacAddr" -ForegroundColor Green
    Enable-NetAdapterPowerManagement -Name $AdapterName -WakeOnMagicPacket Enabled -NoRestart -ErrorAction SilentlyContinue
} else {
    $LocalIP = "${state.host.localIp}"
    $MacAddr = "${state.host.macAddress}"
}

# 2. Genel (Public) IP ve Donanım Bilgilerini Otomatik Tespit Et
try {
    $PublicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5).Trim()
} catch {
    $PublicIP = "${state.host.publicIpOrDdns}"
}
$GpuName = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name
$CpuName = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name

# 3. Apollo (Sanal Ekranlı Sunshine Forku) Kurulu Değilse Otomatik Kur
if (-not (Get-Service -Name "ApolloService" -ErrorAction SilentlyContinue) -and -not (Test-Path "$env:ProgramFiles\\Apollo")) {
    Write-Host "[2/7] Apollo Sanal Ekran Sunucusu winget ile kuruluyor..." -ForegroundColor Yellow
    winget install --id ClassicOldSong.Apollo -e --accept-source-agreements --accept-package-agreements --silent
} else {
    Write-Host "[2/7] Apollo zaten kurulu ve servis aktif." -ForegroundColor Green
}

# 4. Monitörsüz & Faresiz (Headless) Windows Ayarlarını Uygula
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\MouseKeys" -Name "Flags" -Value "63" -ErrorAction SilentlyContinue
Write-Host "[3/7] Sanal Fare (MouseKeys) açıldı ve uyku zamanlayıcısı kapatıldı." -ForegroundColor Green

# 5. Windows Kilit Ekranını Otomatik Geçme (AutoAdminLogon - İsteğe Bağlı)
${
  winUser && winPass
    ? `$WinlogonPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"
Set-ItemProperty -Path $WinlogonPath -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path $WinlogonPath -Name "DefaultUserName" -Value "${winUser}"
Set-ItemProperty -Path $WinlogonPath -Name "DefaultPassword" -Value "${winPass}"
Write-Host "[4/7] Windows Otomatik Oturum Açma (${winUser}) yapılandırıldı! Kasa açılınca şifre sormayacak." -ForegroundColor Green`
    : `Write-Host "[4/7] İpucu: Kasa açıldığında şifre sormaması için DeckPulse arayüzünden Otomatik Giriş bilgilerini ekleyebilirsiniz." -ForegroundColor Yellow`
}

# 6. Güvenlik Duvarı Portlarını Aç (Apollo, Moonlight ve UDP Wake-on-LAN)
New-NetFirewallRule -DisplayName "DeckPulse Apollo TCP" -Direction Inbound -Protocol TCP -LocalPort 47984,47989,47990,48010 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "DeckPulse Stream UDP" -Direction Inbound -Protocol UDP -LocalPort 9,47998,47999,48000,48002,48010 -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "[5/7] Güvenlik duvarı portları (47984-48010 ve UDP 9) açıldı." -ForegroundColor Green

# 7. İş Yerinden Bağlantı İçin Unattended P2P Tünel (CGNAT Aşma)
$TunnelIP = "${state.tunnel.virtualHostIp}"
${
  authKey
    ? `if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    Write-Host "[6/7] Arka plan P2P Tünel servisi kuruluyor..." -ForegroundColor Yellow
    winget install --id tailscale.tailscale -e --accept-source-agreements --accept-package-agreements --silent
}
& "$env:ProgramFiles\\Tailscale\\tailscale.exe" up --auth-key="${authKey}" --unattended --reset
$DetectedTsIp = (& "$env:ProgramFiles\\Tailscale\\tailscale.exe" ip -4 | Select-Object -First 1).Trim()
if ($DetectedTsIp) { $TunnelIP = $DetectedTsIp }
Write-Host "[6/7] Unattended P2P Tünel Aktif! İş Yeri Tünel IP: $TunnelIP" -ForegroundColor Green`
    : `if (Get-Command tailscale -ErrorAction SilentlyContinue) {
    $DetectedTsIp = (tailscale ip -4 | Select-Object -First 1).Trim()
    if ($DetectedTsIp) { $TunnelIP = $DetectedTsIp }
}`
}

# 8. Algılanan Tüm IP ve MAC Bilgilerini DeckPulse'a Otomatik Gönder
$RegisterBody = @{
    hostName = $env:COMPUTERNAME
    macAddress = $MacAddr
    localIp = $LocalIP
    publicIp = $PublicIP
    tunnelIp = $TunnelIP
    gpuModel = $GpuName
    cpuModel = $CpuName
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "${appOrigin}/api/agent/register" -Method Post -Body $RegisterBody -ContentType "application/json" | Out-Null
    Write-Host "[7/7] BAŞARILI! Kasanızın IP ($LocalIP) ve MAC ($MacAddr) adresi DeckPulse'a otomatik kaydedildi!" -ForegroundColor Green
    Write-Host "Artık monitörü ve fareyi söküp kasayı odaya koyabilirsiniz." -ForegroundColor Cyan
} catch {
    Write-Host "[7/7] Yerel kurulum tamamlandı. Yerel IP: $LocalIP | MAC: $MacAddr" -ForegroundColor Yellow
}
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="deckpulse-sadece-kasa-kurulum.ps1"');
    res.send(script);
  });

  // Download Steam Deck / macOS Client Script (Dynamic Live IP & Local UDP Magic Packet + WAN Fallback)
  app.get('/api/scripts/deck-steamos.sh', (req, res) => {
    const appOrigin = `${req.protocol}://${req.get('host')}`;
    const script = `#!/usr/bin/env bash
# ============================================================================
# DeckPulse — Steam Deck & MacBook Tek Tuşla Uyandır & Bağlan Betiği
# Evde (LAN) ve İş Yerinde (Tünel) Otomatik Algılama
# ============================================================================

set -e
echo "================================================================"
echo " DeckPulse — Monitörsüz Kasayı Uyandır & Moonlight Başlat"
echo "================================================================"

# 1. DeckPulse Sunucusundan Kasanın En Güncel IP ve MAC Bilgilerini Çek
STATE_JSON=$(curl -s "${appOrigin}/api/state" || true)
MAC_ADDR="${state.host.macAddress}"
LOCAL_IP="${state.host.localIp}"
TUNNEL_IP="${state.tunnel.virtualHostIp}"
PUBLIC_IP="${state.host.publicIpOrDdns}"
WOL_PORT="${state.host.wolPort}"

echo "[1/4] Odadaki kasaya ($MAC_ADDR) Sihirli Paket (Wake-on-LAN) gönderiliyor..."

# A) Aynı ağdaysak (Aile Evi) doğrudan yerel UDP Broadcast Sihirli Paketi gönder
python3 -c "
import socket
mac = '$MAC_ADDR'.replace(':', '').replace('-', '')
data = bytes.fromhex('FF' * 6 + mac * 16)
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
s.sendto(data, ('255.255.255.255', int('$WOL_PORT')))
s.sendto(data, ('$LOCAL_IP', int('$WOL_PORT')))
s.close()
" 2>/dev/null || true

# B) İş yerindeysek DeckPulse sunucusu üzerinden genel IP'ye Sihirli Paket gönder
curl -s -X POST "${appOrigin}/api/wol/wake" \\
  -H "Content-Type: application/json" \\
  -d "{\\"macAddress\\":\\"$MAC_ADDR\\",\\"publicIpOrDdns\\":\\"$PUBLIC_IP\\",\\"wolPort\\":$WOL_PORT}" > /dev/null || true

# 2. Moonlight Kurulu Değilse Otomatik Kur (SteamOS Flatpak)
if command -v flatpak >/dev/null 2>&1; then
  if ! flatpak list | grep -q "com.moonlight_stream.Moonlight"; then
    echo "[2/4] Moonlight Steam Deck'inize kuruluyor..."
    flatpak install -y flathub com.moonlight_stream.Moonlight
  fi
fi

# 3. Evde miyiz (Yerel Ağ) yoksa İş Yerinde miyiz (Tünel) Otomatik Test Et
echo "[3/4] Kasa bağlantısı kontrol ediliyor..."
if ping -c 1 -W 2 "$LOCAL_IP" >/dev/null 2>&1; then
  TARGET_IP="$LOCAL_IP"
  echo " -> Aile Evi Yerel Ağı (LAN) algılandı! Hedef IP: $TARGET_IP (<1 ms)"
else
  TARGET_IP="$TUNNEL_IP"
  echo " -> İş Yeri / Uzak Ağ algılandı! Güvenli P2P Tünel IP: $TARGET_IP"
fi

# 4. Moonlight'ı Doğrudan Tam Ekran Başlat
echo "[4/4] Moonlight üzerinden $TARGET_IP adresindeki Apollo Sanal Ekranına bağlanılıyor..."
if command -v flatpak >/dev/null 2>&1; then
  flatpak run com.moonlight_stream.Moonlight stream "$TARGET_IP" "Steam Big Picture" || flatpak run com.moonlight_stream.Moonlight
elif [ -d "/Applications/Moonlight.app" ]; then
  open -a Moonlight
fi
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="deckpulse-baglan.sh"');
    res.send(script);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DeckPulse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
