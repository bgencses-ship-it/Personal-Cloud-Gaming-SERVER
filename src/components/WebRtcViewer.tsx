import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Keyboard,
  Volume2,
  VolumeX,
  Power,
  Camera,
  Sliders,
  Square,
  Share2,
  Lock,
  Unlock,
  MousePointer,
} from 'lucide-react';
import { SystemState, VirtualDisplayProfile } from '../types';

interface WebRtcViewerProps {
  state: SystemState;
  onWakeAndConnect: () => Promise<void>;
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<void>;
  onUnlockWindows: (pin: string) => Promise<void>;
  onStopGame: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const WebRtcViewer: React.FC<WebRtcViewerProps> = ({
  state,
  onWakeAndConnect,
  onUpdateSettings,
  onUnlockWindows,
  onStopGame,
  onNotify,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const [windowsPin, setWindowsPin] = useState('');
  const [remoteInputLog, setRemoteInputLog] = useState<string>(
    'Sanal HID Fare & Klavye aktif · Fiziksel fare olmadan MacBook Trackpad / Steam Deck dokunmatik yüzey ile kontrol ediliyor'
  );
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 640, y: 400 });
  const [virtualLauncherOpen, setVirtualLauncherOpen] = useState(true);

  const activeProfile: VirtualDisplayProfile =
    state.profiles.find((p) => p.id === state.host.activeProfileId) || state.profiles[0];
  const activeClient =
    state.clients.find((c) => c.id === state.host.activeClientId) || state.clients[0];
  const runningGame = state.games.find((g) => g.isRunning);
  const isHostReady = state.host.status === 'online' || state.host.status === 'streaming';

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    return () => {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localMediaStream]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      onNotify('Tam ekran modu tarayıcı izinleri tarafından kısıtlandı.');
    }
  };

  const startBrowserScreenCapture = async () => {
    try {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((t) => t.stop());
        setLocalMediaStream(null);
        onNotify('Yerel WebRTC ekran yakalama durduruldu.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: activeProfile.refreshRate } },
        audio: true,
      });
      setLocalMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0].onended = () => {
        setLocalMediaStream(null);
      };
      onNotify('Canlı WebRTC ekran akışı bağlandı.');
    } catch {
      onNotify('Ekran paylaşımı iptal edildi veya tarayıcı ortamı tarafından engellendi.');
    }
  };

  const sendShortcutKey = (label: string, keyCombo: string) => {
    setRemoteInputLog(
      `Gönderilen Sanal HID Komutu: ${label} (${keyCombo}) · Gecikme: ${state.telemetry.rttMs || 0.9} ms`
    );
    onNotify(`${label} komutu odadaki kasaya iletildi.`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHostReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCursorCoords({
      x: Math.round(relX * activeProfile.width),
      y: Math.round(relY * activeProfile.height),
    });
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUnlockWindows(windowsPin);
    setWindowsPin('');
  };

  const captureSnapshot = () => {
    onNotify(
      `Sanal ekran görüntüsü kaydedildi (${activeProfile.resolution} · ${state.host.encoder}).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Monitörsüz & Faresiz Kasa — Canlı Ekran ve Sanal Trackpad/Klavye (KVM)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            <span>Aktif Cihaz: {activeClient.name}</span>
            <span className="mx-2">·</span>
            <span>Sanal Ekran: {activeProfile.resolution} @ {activeProfile.refreshRate}Hz ({activeProfile.aspectRatio})</span>
            <span className="mx-2">·</span>
            <span>Sanal Fare (HID): Aktif</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state.host.activeProfileId}
            onChange={(e) =>
              onUpdateSettings({ activeProfileId: e.target.value })
            }
            aria-label="Sanal Ekran Çözünürlük Profili"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {state.profiles.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.name} ({prof.resolution} @ {prof.refreshRate}Hz)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ windowsLocked: !state.host.windowsLocked })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {state.host.windowsLocked ? (
              <Unlock className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>{state.host.windowsLocked ? 'Kilit Ekranı Açık' : 'Kilit Ekranı Testi'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHud((prev) => !prev)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              showHud
                ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Telemetri (HUD)
          </button>

          <button
            type="button"
            onClick={startBrowserScreenCapture}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{localMediaStream ? 'Yerel Akışı Durdur' : 'Gerçek Ekran Akışı Bağla'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran Oyna'}</span>
          </button>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950 select-none"
      >
        {!isHostReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-400">
              <Power className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              {state.host.status === 'waking'
                ? `Odadaki Monitörsüz Kasa Uyandırılıyor (%${state.host.bootProgress})...`
                : 'Odadaki Oyun Kasası Şu Anda Uyku Modunda'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mt-2">
              Kasaya monitör veya fare takmanıza gerek yoktur. Tek tuşla uyandırdığınızda Apollo sanal ekranı ({activeProfile.resolution}) otomatik oluşturulur.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={onWakeAndConnect}
                disabled={state.host.status === 'waking'}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <Power className="w-4 h-4" />
                <span>
                  {state.host.status === 'waking'
                    ? 'Sanal Ekran Başlatılıyor...'
                    : 'Odadaki Kasayı Uyandır ve Bağlan'}
                </span>
              </button>
            </div>
          </div>
        ) : state.host.windowsLocked ? (
          /* Headless Windows Lock Screen Unlocker (No Physical Keyboard/Mouse Needed) */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center">
            <div className="max-w-sm w-full p-6 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Windows Kilit Ekranı (Monitörsüz PIN Girişi)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kasada klavye veya fare takılı olmadığı için Windows PIN/Şifrenizi doğrudan buradan göndererek masaüstünü açabilirsiniz:
                </p>
              </div>
              <form onSubmit={handleUnlockSubmit} className="space-y-3">
                <input
                  type="password"
                  value={windowsPin}
                  onChange={(e) => setWindowsPin(e.target.value)}
                  placeholder="Windows PIN veya Parola..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-center rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  Kilit Ekranını Aç ve Steam Big Picture’a Geç
                </button>
              </form>
            </div>
          </div>
        ) : localMediaStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={
                runningGame
                  ? runningGame.coverUrl
                  : '/src/assets/images/desktop_stream_preview_1794125388728.jpg'
              }
              alt={runningGame ? runningGame.title : 'Apollo Sanal Ekran Akışı'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50" />

            {virtualLauncherOpen && (
              <div className="absolute inset-x-8 bottom-14 p-5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-emerald-400 font-mono tabular-nums">
                    <span>MONİTÖRSÜZ & FARESİZ KASA AKTİF</span>
                    <span className="mx-2">·</span>
                    <span>HEDEF: {activeClient.name.toUpperCase()}</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mt-1">
                    {runningGame
                      ? `Çalışan Oyun: ${runningGame.title}`
                      : `${state.host.name} — Sanal Masaüstü (${activeProfile.resolution} @ ${activeProfile.refreshRate}Hz)`}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono tabular-nums">
                    Giriş: {activeClient.inputMethod} · İmleç X:{cursorCoords.x} Y:{cursorCoords.y}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {runningGame && (
                    <button
                      type="button"
                      onClick={onStopGame}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Oyunu Kapat</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVirtualLauncherOpen(false)}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Paneli Gizle
                  </button>
                </div>
              </div>
            )}

            {!virtualLauncherOpen && (
              <button
                type="button"
                onClick={() => setVirtualLauncherOpen(true)}
                className="absolute bottom-14 right-6 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Kasa Durumunu Göster
              </button>
            )}
          </div>
        )}

        {/* Real-time Telemetry Overlay HUD */}
        {isHostReady && showHud && (
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="px-3.5 py-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-mono tabular-nums text-slate-200 flex flex-wrap items-center gap-3">
              <span className="text-emerald-400 font-semibold">
                {state.telemetry.fps || activeProfile.refreshRate} FPS
              </span>
              <span className="text-slate-600">·</span>
              <span>
                {state.tunnel.networkScope === 'lan-direct' ? 'Ev LAN' : 'İş Yeri Tünel'} RTT: {state.telemetry.rttMs || 0.9} ms
              </span>
              <span className="text-slate-600">·</span>
              <span>Bitrate: {state.telemetry.bitrateMbps || state.host.targetBitrateMbps} Mbps</span>
              <span className="text-slate-600">·</span>
              <span>Kodlama: {state.telemetry.encodeTimeMs || 1.8} ms</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-mono tabular-nums text-slate-300">
              GPU: {state.telemetry.gpuTempC}°C (%{state.telemetry.gpuLoadPercent}) · {activeProfile.resolution} ({activeProfile.aspectRatio})
            </div>
          </div>
        )}

        {/* Bottom Remote Input Bar inside Stream Viewport */}
        {isHostReady && (
          <div className="absolute bottom-0 inset-x-0 px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs text-slate-400 font-mono tabular-nums">
            <span className="truncate flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{remoteInputLog}</span>
            </span>
            <span className="shrink-0">X:{cursorCoords.x} Y:{cursorCoords.y}</span>
          </div>
        )}
      </div>

      {/* Remote Control Deck & Virtual Keyboard/Gamepad Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-500" />
              <span>Monitörsüz Kasa Kurtarma ve Sanal Klavye/Fare Kısayolları</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Fiziksel klavye/fare olmadan tek tıkla gönderilir
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => sendShortcutKey('Steam Big Picture Arayüzü', 'Win + Alt + B / Guide')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Steam Big Picture</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                TV / Deck Arayüzü
              </div>
            </button>

            <button
              type="button"
              onClick={() => sendShortcutKey('Sanal Fare İmleci Zorla', 'MouseKeys HID Aktif')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Sanal Fareyi Göster</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Faresiz Kasa Modu
              </div>
            </button>

            <button
              type="button"
              onClick={() => sendShortcutKey('Windows Kilit Aç (Ctrl+Alt+Del)', 'SAS Komutu')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Ctrl + Alt + Del</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Kilit Ekranı Geçişi
              </div>
            </button>

            <button
              type="button"
              onClick={() => sendShortcutKey('Görev Yöneticisi', 'Ctrl + Shift + Esc')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Görev Yöneticisi</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Takılan Oyunu Kapat
              </div>
            </button>

            <button
              type="button"
              onClick={() => sendShortcutKey('Sanal Ekran Yeniden Oluştur', 'Apollo SudoVDA Reset')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Sanal Ekran Sıfırla</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                EDID / Çözünürlük
              </div>
            </button>

            <button
              type="button"
              onClick={() => sendShortcutKey('Pencere Değiştir', 'Alt + Tab')}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold">Uygulama Değiştir</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Alt + Tab
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMuted((m) => !m);
                onNotify(!isMuted ? 'Yayın sesi kapatıldı.' : 'Yayın sesi açıldı.');
              }}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold flex items-center gap-1.5">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                <span>{isMuted ? 'Sesi Aç' : 'Sesi Kapat'}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Sanal Ses Kartı
              </div>
            </button>

            <button
              type="button"
              onClick={captureSnapshot}
              className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>Ekran Görüntüsü</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Kayıpsız PNG
              </div>
            </button>
          </div>
        </div>

        {/* Bitrate & Headless Appliance Live Tuning */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span>Anlık Bitrate (LAN / İş Yeri)</span>
              </h3>
              <span className="text-xs font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {state.host.targetBitrateMbps} Mbps
              </span>
            </div>

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">
              Evde TV/MacBook için 80-100 Mbps, iş yerinde 20-35 Mbps önerilir:
            </label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={state.host.targetBitrateMbps}
              onChange={(e) =>
                onUpdateSettings({ targetBitrateMbps: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
              <span>15 Mbps (İş Yeri)</span>
              <span>50 Mbps (Deck)</span>
              <span>100+ Mbps (TV/Mac)</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Kasa Fiziksel Durumu:</span>
            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
              Monitör Yok · Fare Yok (Sanal HID)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
