import React, { useState, useEffect, useCallback } from 'react';
import {
  Power,
  Shield,
  Gamepad2,
  Monitor,
  Terminal,
  Activity,
  Plus,
  Play,
  Square,
  Sun,
  Moon,
  Laptop,
  Tv,
  Briefcase,
  MonitorOff,
  MousePointer,
  KeyRound,
} from 'lucide-react';
import { SystemState, ActiveTab, GameApp, ClientEndpoint } from './types';
import { WebRtcViewer } from './components/WebRtcViewer';
import { SetupWizard } from './components/SetupWizard';

export default function App() {
  const [state, setState] = useState<SystemState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('command');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWakingAction, setIsWakingAction] = useState<boolean>(false);

  // Add Game Modal state
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [newGameTitle, setNewGameTitle] = useState<string>('');
  const [newGameCategory, setNewGameCategory] = useState<string>('Aksiyon RPG');
  const [newGameSteamId, setNewGameSteamId] = useState<string>('');
  const [newGameProfileId, setNewGameProfileId] = useState<string>('deck-oled-hdr');

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Initial state fetch + WebSocket real-time synchronization
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data: SystemState = await res.json();
          setState(data);
        }
      } catch {
        // Fallback retry handled by WS
      }
    };

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'state:sync' && payload.state) {
            setState(payload.state);
          }
        } catch {
          // ignore malformed frame
        }
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 2500);
      };
    };

    fetchInitial();
    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const handleWakeAndConnect = async (customParams?: {
    macAddress?: string;
    publicIpOrDdns?: string;
    wolPort?: number;
  }) => {
    setIsWakingAction(true);
    try {
      const res = await fetch('/api/wol/wake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customParams,
          autoTunnel: true,
        }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify(
          `Odadaki monitörsüz kasaya (${data.logEntry.targetHost}:${data.logEntry.targetPort}) UDP Sihirli Paket gönderildi!`
        );
      } else {
        notify(data.error || 'Sihirli Paket gönderilemedi.');
      }
    } catch {
      notify('Sunucu ile iletişim kurulamadı.');
    } finally {
      setIsWakingAction(false);
    }
  };

  const handleSelectClient = async (client: ClientEndpoint) => {
    try {
      const res = await fetch('/api/clients/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        const prof = data.state.profiles.find((p: any) => p.id === client.profileId);
        notify(
          `${client.name} aktif edildi → Sanal ekran ${prof?.resolution} @ ${prof?.refreshRate}Hz (${client.connectionType}) olarak ayarlandı.`
        );
      }
    } catch {
      notify('İstemci cihaz geçişi yapılamadı.');
    }
  };

  const handleUnlockWindows = async (pin: string) => {
    try {
      const res = await fetch('/api/host/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify(data.message || 'Windows kilit ekranı açıldı.');
      }
    } catch {
      notify('Kilit ekranı komutu gönderilemedi.');
    }
  };

  const handlePowerMode = async (mode: 'sleep' | 'wake') => {
    try {
      const res = await fetch('/api/host/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify(
          mode === 'sleep'
            ? 'Odadaki kasa uyku moduna alındı (İstediğiniz an tek tuşla uyandırabilirsiniz).'
            : 'Odadaki kasa çevrimiçi duruma getirildi.'
        );
      }
    } catch {
      notify('Güç komutu iletilemedi.');
    }
  };

  const handleUpdateSettings = async (patch: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/host/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify('Monitörsüz kasa ve Apollo sanal ekran ayarları güncellendi.');
      }
    } catch {
      notify('Ayarlar kaydedilemedi.');
    }
  };

  const handleLaunchGame = async (game: GameApp) => {
    try {
      const res = await fetch('/api/games/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify(`${game.title} sanal ekranda başlatıldı!`);
      }
    } catch {
      notify('Oyun başlatılamadı.');
    }
  };

  const handleStopGame = async () => {
    try {
      const res = await fetch('/api/games/stop', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify('Aktif oyun yayını sonlandırıldı.');
      }
    } catch {
      notify('Oyun durdurulamadı.');
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim()) return;
    try {
      const res = await fetch('/api/games/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGameTitle,
          category: newGameCategory,
          steamAppId: newGameSteamId || '1091500',
          preferredProfileId: newGameProfileId,
        }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        setAddModalOpen(false);
        setNewGameTitle('');
        setNewGameSteamId('');
        notify('Yeni oyun Apollo kütüphanesine eklendi.');
      }
    } catch {
      notify('Oyun eklenirken hata oluştu.');
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await fetch('/api/pairing/regenerate', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.state) {
        setState(data.state);
        notify(`Yeni eşleştirme kodu üretildi: ${data.pairingCode}`);
      }
    } catch {
      notify('Kod yenilenemedi.');
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const activeProfile =
    state.profiles.find((p) => p.id === state.host.activeProfileId) || state.profiles[0];
  const activeClient =
    state.clients.find((c) => c.id === state.host.activeClientId) || state.clients[0];
  const runningGame = state.games.find((g) => g.isRunning);
  const categories = ['Tümü', ...Array.from(new Set(state.games.map((g) => g.category)))];

  const filteredGames = state.games.filter((g) => {
    const matchesCategory = categoryFilter === 'Tümü' || g.category === categoryFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const hostStatusLabel =
    state.host.status === 'streaming'
      ? 'Apollo Yayında'
      : state.host.status === 'online'
      ? 'Çevrimiçi (Monitörsüz Hazır)'
      : state.host.status === 'waking'
      ? `Uyanıyor (%${state.host.bootProgress})`
      : 'Uyku Modunda / Kapalı';

  const getClientIcon = (deviceType: ClientEndpoint['deviceType']) => {
    switch (deviceType) {
      case 'macbook':
        return <Laptop className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'smart-tv':
        return <Tv className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'work-remote':
        return <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Gamepad2 className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#command"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('command');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap shrink-0"
        >
          DeckPulse
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#command"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('command');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'command'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Komuta Merkezi
          </a>
          <a
            href="#library"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('library');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'library'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Oyun Kütüphanesi
          </a>
          <a
            href="#webrtc"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('webrtc');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'webrtc'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Canlı Masaüstü
          </a>
          <a
            href="#setup"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('setup');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'setup'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Sadece Kasa Kurulumu
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleWakeAndConnect()}
            disabled={isWakingAction || state.host.status === 'waking'}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {state.host.status === 'offline'
              ? 'Odadaki Kasayı Uyandır'
              : state.host.status === 'waking'
              ? `Kasa Uyanıyor (%${state.host.bootProgress})`
              : 'Sihirli Paket Gönder'}
          </button>
        </div>
      </header>

      {/* Main Workspace Container (Sidebar + Main Content Viewport) */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Navigation & Headless Host Status Sidebar */}
        <aside className="w-full lg:w-[272px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-400 dark:text-slate-500 px-2 mb-2">
                Çalışma Alanı
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('command')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'command'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                <span>Cihazlar ve Kasa Kontrolü</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'library'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Gamepad2 className="w-4 h-4 shrink-0" />
                <span>Oyunlar ve Sanal Ekran</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('webrtc')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'webrtc'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span>Canlı Masaüstü & Sanal Fare</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'setup'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-4 h-4 shrink-0" />
                <span>Sadece Kasa Kurulum Betiği</span>
              </button>
            </div>

            {/* Headless Tower Status Summary */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Odadaki Oyun Kasası (Headless)
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {state.host.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {state.host.placement}
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums pt-1">
                <div className="flex justify-between">
                  <span>Durum:</span>
                  <span
                    className={
                      state.host.status === 'online' || state.host.status === 'streaming'
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : state.host.status === 'waking'
                        ? 'text-amber-500 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {hostStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Donanım:</span>
                  <span className="text-slate-900 dark:text-slate-200">Monitör & Fare Yok</span>
                </div>
                <div className="flex justify-between">
                  <span>Ev İçi LAN IP:</span>
                  <span className="text-slate-900 dark:text-slate-200">{state.host.localIp}</span>
                </div>
                <div className="flex justify-between">
                  <span>İş Yeri Tünel IP:</span>
                  <span className="text-slate-900 dark:text-slate-200">{state.tunnel.virtualHostIp}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Ekran:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {activeProfile.resolution}@{activeProfile.refreshRate}
                  </span>
                </div>
              </div>

              {runningGame && (
                <div className="pt-2">
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Aktif Yayın: {runningGame.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('webrtc')}
                    className="mt-1.5 w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  >
                    Yayını Görüntüle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Görünüm Modu</span>
              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{isDark ? 'Açık Tema' : 'Koyu Tema'}</span>
              </button>
            </div>

            {(state.host.status === 'online' || state.host.status === 'streaming') && (
              <button
                type="button"
                onClick={() => handlePowerMode('sleep')}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Odadaki Kasayı Uyku Moduna Al
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 min-w-0">
          {toastMessage && (
            <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-600/10 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-between gap-4">
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-xs underline shrink-0"
              >
                Kapat
              </button>
            </div>
          )}

          {/* TAB 1: COMMAND CENTER & MULTI-DEVICE HEADLESS SWITCHER */}
          {activeTab === 'command' && (
            <div className="space-y-8">
              {/* 4-Device One-Click Switcher (Steam Deck Home, MacBook, Salon TV, Work Steam Deck) */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      ÇOKLU CİHAZ VE MEKAN GEÇİŞ MERKEZİ
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                      Şu An Hangi Cihazdan ve Nereden Oynuyorsunuz?
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cihazınızı seçtiğinizde odadaki monitörsüz kasanın sanal ekran çözünürlüğü (16:10 / 16:9), yenileme hızı ve ağ rotası (Ev LAN / İş Yeri Tünel) anında ayarlanır:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {state.clients.map((client) => {
                    const matchedProf = state.profiles.find((p) => p.id === client.profileId);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 ${
                          client.isActive
                            ? 'border-blue-600 bg-blue-600/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            {getClientIcon(client.deviceType)}
                            <span className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                              {client.expectedLatencyMs}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
                            {client.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {client.connectionType}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {matchedProf?.resolution} @ {matchedProf?.refreshRate}Hz
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {matchedProf?.aspectRatio}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Headless PC Appliance Control + Virtual Display Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span>SADECE KASA (MONİTÖRSÜZ & FARESİZ SUNUCU MODU)</span>
                      <span className="mx-2">·</span>
                      <span>{activeClient.connectionType}</span>
                    </div>

                    <h1
                      className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      {state.host.status === 'offline'
                        ? 'Odadaki Monitörsüz Kasayı Uyandırın ve Anında Bağlanın'
                        : state.host.status === 'waking'
                        ? `Odadaki Kasa Uyanıyor ve Sanal Ekran Açılıyor (%${state.host.bootProgress})`
                        : `Odadaki Kasa ${activeClient.name} İçin Yayına Hazır`}
                    </h1>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Kasanızda monitör, klavye veya fare takılı olmadan{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {state.host.gpuModel}
                      </span>{' '}
                      gücünü evde <strong>TV</strong>, <strong>MacBook</strong> ve <strong>Steam Deck</strong>’e yerel ağdan (<span className="font-mono">{state.host.localIp}</span>), iş yerinde ise <strong>Steam Deck</strong>’inize güvenli P2P tünelden (<span className="font-mono">{state.tunnel.virtualHostIp}</span>) aktarın.
                    </p>

                    {/* Headless Hardware Assurance Strip */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          <MonitorOff className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Sanal Monitör (EDID)</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {activeProfile.resolution} ({activeProfile.aspectRatio})
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          <MousePointer className="w-3.5 h-3.5 text-blue-500" />
                          <span>Sanal Fare & Klavye</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          Fiziksel Fare Gerekmez
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>Kilit Ekranı Geçişi</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {state.host.windowsAutoLogon ? 'Otomatik Oturum Açık' : 'Uygulamadan PIN'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Row */}
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    {state.host.status === 'offline' ? (
                      <button
                        type="button"
                        onClick={() => handleWakeAndConnect()}
                        disabled={isWakingAction}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Power className="w-4 h-4" />
                        <span>Odadaki Kasayı Uyandır ve Bağlan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLaunchGame(state.games[0])}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        <span>Steam Big Picture Başlat ({activeProfile.resolution})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('webrtc')}
                      className="inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <span>MacBook / Tarayıcıdan Masaüstünü Kontrol Et</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('setup')}
                      className="inline-flex items-center gap-2 px-4 py-3 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Monitörsüz Kurulum Rehberi</span>
                    </button>
                  </div>
                </div>

                {/* Apollo Virtual Display & Headless Control Card */}
                <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        APOLLO SANAL EKRAN PROFİLLERİ
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {state.host.encoder}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      TV, MacBook ve Steam Deck Sanal Çözünürlükleri
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Kasada monitör takılı olmasa bile seçtiğiniz ekran oranı anında oluşturulur:
                    </p>

                    <div className="mt-3 space-y-2">
                      {state.profiles.map((prof) => {
                        const selected = prof.id === state.host.activeProfileId;
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() =>
                              handleUpdateSettings({ activeProfileId: prof.id })
                            }
                            className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 ${
                              selected
                                ? 'border-blue-600 bg-blue-600/10'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {prof.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {prof.recommendedFor}
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums text-xs shrink-0">
                              <div className="font-semibold text-blue-600 dark:text-blue-400">
                                {prof.resolution}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {prof.refreshRate}Hz · {prof.aspectRatio}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Kasa Açılınca Otomatik Windows Girişi:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSettings({
                          windowsAutoLogon: !state.host.windowsAutoLogon,
                        })
                      }
                      className={`px-3 py-1 rounded-md font-mono text-xs font-semibold transition-colors ${
                        state.host.windowsAutoLogon
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {state.host.windowsAutoLogon ? 'Aktif (Şifre Sormaz)' : 'PIN Sor'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Full-Width 4-Column Real-Time Telemetry Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Bağlantı Gecikmesi ({state.tunnel.networkScope === 'lan-direct' ? 'Ev İçi LAN' : 'İş Yeri Tünel'})
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {state.host.status === 'offline' ? '—' : `${state.telemetry.rttMs || 0.9} ms`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    Jitter: {state.telemetry.jitterMs || 0.1} ms · Kayıp: %{state.telemetry.packetLossPercent.toFixed(1)}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Sanal Ekran Kare Hızı ve Oranı
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {state.host.status === 'offline'
                      ? `${activeProfile.refreshRate} FPS`
                      : `${state.telemetry.fps || activeProfile.refreshRate} FPS`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    {activeProfile.resolution} ({activeProfile.aspectRatio}) · {activeProfile.hdr ? 'HDR10' : 'SDR'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Yayın Bitrate ve Enkoder Süresi
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {state.host.status === 'offline'
                      ? `${state.host.targetBitrateMbps} Mbps`
                      : `${state.telemetry.bitrateMbps || state.host.targetBitrateMbps} Mbps`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    Kodlama: {state.telemetry.encodeTimeMs || 1.8} ms · Çözme: {state.telemetry.decodeTimeMs || 0.9} ms
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Odadaki Kasa Sıcaklığı ({state.host.gpuModel.replace('NVIDIA GeForce ', '')})
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {state.host.status === 'offline'
                      ? 'Uyku Modu'
                      : `${state.telemetry.gpuTempC}°C · %${state.telemetry.gpuLoadPercent}`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    {state.host.cpuModel}
                  </div>
                </div>
              </div>

              {/* Quick Launch Games + Recent UDP Wake-on-LAN Dispatch Log */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Tek Tıkla Oyun ve Konsol Modu Başlatıcı
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Seçili cihazınıza ({activeClient.name}) uygun çözünürlükle doğrudan başlatılır
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('library')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      Tüm Kütüphane ({state.games.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {state.games.slice(0, 4).map((game) => (
                      <div
                        key={game.id}
                        className="group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between"
                      >
                        <div className="relative aspect-video overflow-hidden bg-slate-900">
                          <img
                            src={game.coverUrl}
                            alt={game.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-2.5 left-3 right-3">
                            <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                              <span>{game.category}</span>
                              <span className="mx-1.5">·</span>
                              <span>{game.totalHours} saat</span>
                            </div>
                            <h3 className="text-sm font-semibold text-white truncate">
                              {game.title}
                            </h3>
                          </div>
                        </div>

                        <div className="p-3 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                            {game.isRunning ? 'Şu an yayında' : `Son: ${game.lastPlayed}`}
                          </span>
                          {game.isRunning ? (
                            <button
                              type="button"
                              onClick={handleStopGame}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Square className="w-3 h-3" />
                              <span>Durdur</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLaunchGame(game)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Play className="w-3 h-3" />
                              <span>Başlat</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UDP Wake-on-LAN & Tunnel History Table */}
                <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Kasa Uyandırma (WoL) ve Bağlantı Günlüğü
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('setup')}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        Kasa Ayarları
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ev içi LAN ve iş yeri uzaktan uyandırma kayıtları:
                    </p>

                    <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                      {state.wakeLogs.slice(0, 4).map((log) => (
                        <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                              {log.targetHost}:{log.targetPort}
                            </span>
                            <span className="text-slate-500">{log.timestamp}</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {log.message}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                            Paket: {log.packetHexPreview}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums text-slate-500">
                    <span>Mod: {state.tunnel.protocol}</span>
                    <span>MTU: {state.tunnel.mtu}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAME LIBRARY & APOLLO VIRTUAL DISPLAY LAUNCHER */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Oyun Kütüphanesi (TV, MacBook ve Steam Deck Sanal Ekranlı)
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Odadaki kasada fiziksel monitör olmasa bile seçtiğiniz oyun bağlı olduğunuz cihazın çözünürlüğünde başlatılır.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Oyun / Uygulama Ekle</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Oyun veya kategori ara..."
                  className="px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => {
                  const gameProfile =
                    state.profiles.find((p) => p.id === game.preferredProfileId) ||
                    activeProfile;
                  return (
                    <div
                      key={game.id}
                      className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-video bg-slate-950 overflow-hidden">
                          <img
                            src={game.coverUrl}
                            alt={game.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                          <div className="absolute bottom-3 left-3.5 right-3.5">
                            <div className="text-xs text-slate-300 font-mono tabular-nums">
                              <span>{game.category}</span>
                              <span className="mx-1.5">·</span>
                              <span>{gameProfile.resolution} @ {gameProfile.refreshRate}Hz</span>
                            </div>
                            <h3 className="text-base font-semibold text-white mt-0.5">
                              {game.title}
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            <span>Steam ID: {game.steamAppId}</span>
                            <span>{game.totalHours} saat</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Varsayılan Ekran: <span className="font-medium text-slate-900 dark:text-slate-200">{gameProfile.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {game.isRunning ? 'Yayında (Aktif)' : `Son: ${game.lastPlayed}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {game.isRunning ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveTab('webrtc')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
                              >
                                Ekrana Git
                              </button>
                              <button
                                type="button"
                                onClick={handleStopGame}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap"
                              >
                                Kapat
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLaunchGame(game)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Tek Tıkla Başlat</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: WEBRTC LIVE DESKTOP VIEWER & VIRTUAL KVM */}
          {activeTab === 'webrtc' && (
            <WebRtcViewer
              state={state}
              onWakeAndConnect={() => handleWakeAndConnect()}
              onUpdateSettings={handleUpdateSettings}
              onUnlockWindows={handleUnlockWindows}
              onStopGame={handleStopGame}
              onNotify={notify}
            />
          )}

          {/* TAB 4: HEADLESS TOWER SETUP SCRIPTS & WOL PORT GUIDE */}
          {activeTab === 'setup' && (
            <SetupWizard
              state={state}
              onUpdateSettings={handleUpdateSettings}
              onSendMagicPacket={handleWakeAndConnect}
              onRegenerateCode={handleRegenerateCode}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Add Game Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Apollo Kütüphanesine Oyun veya Uygulama Ekle
            </h3>
            <form onSubmit={handleAddGame} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Oyun / Uygulama Adı
                </label>
                <input
                  type="text"
                  required
                  value={newGameTitle}
                  onChange={(e) => setNewGameTitle(e.target.value)}
                  placeholder="Örn: Baldur's Gate 3"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={newGameCategory}
                    onChange={(e) => setNewGameCategory(e.target.value)}
                    placeholder="RPG / Aksiyon"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Steam App ID
                  </label>
                  <input
                    type="text"
                    value={newGameSteamId}
                    onChange={(e) => setNewGameSteamId(e.target.value)}
                    placeholder="1086940"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Önerilen Apollo Sanal Ekran Profili
                </label>
                <select
                  value={newGameProfileId}
                  onChange={(e) => setNewGameProfileId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {state.profiles.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} ({prof.resolution} @ {prof.refreshRate}Hz)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                >
                  Kütüphaneye Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
