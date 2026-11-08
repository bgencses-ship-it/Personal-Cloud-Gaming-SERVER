export interface VirtualDisplayProfile {
  id: string;
  name: string;
  deviceType: 'steam-deck' | 'macbook' | 'smart-tv' | 'work-remote';
  locationMode: 'lan' | 'wan';
  resolution: string;
  width: number;
  height: number;
  refreshRate: number;
  hdr: boolean;
  aspectRatio: string;
  recommendedBitrateMbps: number;
  recommendedFor: string;
}

export interface ClientEndpoint {
  id: string;
  name: string;
  deviceType: 'steam-deck' | 'macbook' | 'smart-tv' | 'work-remote';
  connectionType: 'Ev İçi Yerel Ağ (LAN)' | 'İş Yeri Uzaktan Tünel (P2P WAN)';
  profileId: string;
  ipAddress: string;
  expectedLatencyMs: string;
  inputMethod: string;
  isActive: boolean;
}

export interface GameApp {
  id: string;
  title: string;
  category: string;
  steamAppId: string;
  launchCommand: string;
  coverUrl: string;
  preferredProfileId: string;
  lastPlayed: string;
  totalHours: number;
  isRunning: boolean;
}

export interface WakeLogEntry {
  id: string;
  timestamp: string;
  macAddress: string;
  targetHost: string;
  targetPort: number;
  packetHexPreview: string;
  byteLength: number;
  status: 'dispatched' | 'verified' | 'error';
  message: string;
}

export interface SystemState {
  pairingCode: string;
  host: {
    name: string;
    placement: string;
    macAddress: string;
    publicIpOrDdns: string;
    localIp: string;
    wolPort: number;
    apolloPort: number;
    status: 'offline' | 'waking' | 'online' | 'streaming';
    bootProgress: number;
    gpuModel: string;
    cpuModel: string;
    encoder: 'NVENC AV1 10-bit' | 'NVENC HEVC' | 'AMF HEVC';
    headlessMode: boolean;
    physicalMonitorOff: boolean;
    noPeripheralsAttached: boolean;
    windowsAutoLogon: boolean;
    bootIntoBigPicture: boolean;
    windowsLocked: boolean;
    audioSink: 'Steam Streaming Speakers (Sanal)' | 'Host Hoparlör (Sessiz)';
    activeProfileId: string;
    activeClientId: string;
    targetBitrateMbps: number;
    uptimeSeconds: number;
  };
  tunnel: {
    status: 'disconnected' | 'handshaking' | 'connected';
    networkScope: 'lan-direct' | 'wan-tunnel';
    protocol: 'Ev İçi Doğrudan Gigabit LAN' | 'WireGuard P2P (UDP Hole Punch)' | 'WebRTC DTLS Röle';
    virtualHostIp: string;
    virtualDeckIp: string;
    region: string;
    mtu: number;
    connectedAt: string | null;
    autoConnectOnWake: boolean;
  };
  telemetry: {
    rttMs: number;
    jitterMs: number;
    packetLossPercent: number;
    bitrateMbps: number;
    fps: number;
    encodeTimeMs: number;
    decodeTimeMs: number;
    gpuTempC: number;
    gpuLoadPercent: number;
    history: Array<{
      time: string;
      rttMs: number;
      bitrateMbps: number;
      fps: number;
    }>;
  };
  profiles: VirtualDisplayProfile[];
  clients: ClientEndpoint[];
  games: GameApp[];
  wakeLogs: WakeLogEntry[];
}

export type ActiveTab = 'command' | 'library' | 'webrtc' | 'setup';
