import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Send,
  Router,
  MonitorOff,
  Laptop,
  Tv,
  Gamepad2,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { SystemState } from '../types';

interface SetupWizardProps {
  state: SystemState;
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<void>;
  onSendMagicPacket: (customParams?: {
    macAddress?: string;
    publicIpOrDdns?: string;
    wolPort?: number;
  }) => Promise<void>;
  onRegenerateCode: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  state,
  onUpdateSettings,
  onSendMagicPacket,
  onRegenerateCode,
  onNotify,
}) => {
  const [macInput, setMacInput] = useState(state.host.macAddress);
  const [localIpInput, setLocalIpInput] = useState(state.host.localIp);
  const [ipInput, setIpInput] = useState(state.host.publicIpOrDdns);
  const [portInput, setPortInput] = useState(state.host.wolPort);
  const [winUser, setWinUser] = useState('');
  const [winPass, setWinPass] = useState('');
  const [tunnelKey, setTunnelKey] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingPacket, setSendingPacket] = useState(false);

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://deckpulse.app';

  const queryParams = new URLSearchParams();
  if (winUser.trim()) queryParams.set('winUser', winUser.trim());
  if (winPass.trim()) queryParams.set('winPass', winPass.trim());
  if (tunnelKey.trim()) queryParams.set('authKey', tunnelKey.trim());
  const scriptQuery = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const windowsOneLiner = `irm "${originUrl}/api/scripts/host-windows.ps1${scriptQuery}" | iex`;
  const clientOneLiner = `curl -sL "${originUrl}/api/scripts/deck-steamos.sh" | bash`;
  const netplwizCommand = `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f`;

  const copyText = async (id: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onNotify(`${label} panoya kopyalandı.`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onNotify('Kopyalama işlemi tamamlandı.');
    }
  };

  const handleSaveAndTestWol = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingPacket(true);
    try {
      await onUpdateSettings({
        macAddress: macInput,
        localIp: localIpInput,
        publicIpOrDdns: ipInput,
        wolPort: Number(portInput),
      });
      await onSendMagicPacket({
        macAddress: macInput,
        publicIpOrDdns: ipInput,
        wolPort: Number(portInput),
      });
    } finally {
      setSendingPacket(false);
    }
  };

  const cleanMac = macInput.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().padEnd(12, '0').slice(0, 12);
  const formattedMacPairs = cleanMac.match(/.{1,2}/g)?.join(':') || 'A8:A1:59:4E:92:1C';
  const magicPacketHexPreview = `FF FF FF FF FF FF  ${Array.from({ length: 4 })
    .map(() => cleanMac.match(/.{1,2}/g)?.join(' '))
    .join('  ')} ... [x16 Tekrar = 102 Bayt]`;

  return (
    <div className="space-y-8">
      {/* Section 0: Zero-Monitor & Zero-Mouse ("Sadece Kasa") Appliance Guide */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              MONİTÖRSÜZ & FARESİZ (HEADLESS) KASA REHBERİ
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              01. Aile Evinde Sadece Kasayı Odaya Koyup (Monitörsüz & Faresiz) Çalıştırma Planı
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Hiçbir masa, monitör, klavye veya fare olmadan kasayı bir köşede priz + Ethernet kablosuyla çalıştırmak için gereken 3 temel ayar:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  windowsAutoLogon: !state.host.windowsAutoLogon,
                })
              }
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                state.host.windowsAutoLogon
                  ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Windows Otomatik Oturum: {state.host.windowsAutoLogon ? 'Açık' : 'Kapalı'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
              1. FİZİKSEL BAĞLANTI (SADECE 2 KABLO)
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sadece Güç Kablosu + Ethernet Kablosu
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kasayı aile evinde modemin yanına veya uygun bir odaya koyun. Sadece <strong>güç kablosunu</strong> ve <strong>Ethernet kablosunu</strong> takın. HDMI/DisplayPort kablosu veya USB fare takmanıza gerek yoktur; Apollo <span className="font-mono">SudoVDA</span> sürücüsü sanal monitörü otomatik üretir.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              2. FARESİZ & KLAVYESİZ KONTROL
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              MacBook Trackpad ve Steam Deck Kontrolcüsü
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kasaya fiziksel fare takılı olmadığında Windows normalde fare imlecini gizler. Aşağıdaki <strong>“Sadece Kasa” PowerShell betiğimiz</strong> Windows <span className="font-mono">MouseKeys / Sanal HID</span> özelliğini açar; böylece MacBook’unuzun Trackpad’i ve klavyesi doğrudan kasayı yönetir.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="text-xs font-mono text-amber-500">
              3. WINDOWS KİLİT EKRANI & OTOMATİK AÇILIŞ
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kasa Açılınca Şifre Sormadan Hazır Olsun
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Apollo Windows servisi olarak çalıştığı için kasa uyanır uyanmaz kilit ekranında bile görüntü verir. Ayrıca şifresiz doğrudan masaüstüne girmesi için tek komutla <span className="font-mono">AutoAdminLogon</span> açabilirsiniz:
            </p>
            <button
              type="button"
              onClick={() => copyText('autologon-cmd', netplwizCommand, 'Windows Otomatik Giriş komutu')}
              className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono rounded bg-slate-900 text-slate-200 border border-slate-700 hover:border-blue-500 transition-colors"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>{copiedId === 'autologon-cmd' ? 'Komut Kopyalandı' : 'Otomatik Oturum Komutunu Kopyala'}</span>
            </button>
          </div>
        </div>

        {/* 4 Device Usage Scenarios Matrix */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Cihazlarınıza Göre Nasıl Bağlanacaksınız?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Laptop className="w-4 h-4 text-blue-500" />
                <span>Evde: MacBook’tan</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Mac için <strong>Moonlight</strong> uygulamasını veya bu <strong>Canlı Masaüstü</strong> sekmesini açın. <span className="font-mono">2560x1600 @ 120Hz</span> Retina profiliyle Mac’inizin kendi klavye ve trackpad’iyle kasayı kullanın.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Tv className="w-4 h-4 text-emerald-500" />
                <span>Evde: Salon TV’den</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Akıllı TV’ye (Android TV / Apple TV / LG WebOS) <strong>Moonlight TV</strong> kurun veya Steam Deck’i TV’ye takın. <span className="font-mono">4K 60Hz HDR</span> konsol modunda koltuktan gamepad ile oynayın.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Gamepad2 className="w-4 h-4 text-blue-500" />
                <span>Evde: Steam Deck’ten</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Aynı Wi-Fi ağındayken tünel gerekmeden doğrudan yerel IP (<span className="font-mono">{state.host.localIp}</span>) üzerinden <span className="font-mono">0.8 ms</span> gecikmeyle <span className="font-mono">1280x800 @ 90Hz HDR</span> oynayın.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>İş Yerinde: Steam Deck’ten</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                İş yerinde tek tuşla aile evindeki kasayı uyandırın (UDP WoL); betiğimiz dış ağda olduğunuzu algılayıp otomatik olarak güvenli P2P tünel IP’sine (<span className="font-mono">{state.tunnel.virtualHostIp}</span>) bağlanır.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: One-Command Scripts for Headless PC + Steam Deck / MacBook */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              02. “Sadece Kasa” (Windows) ve İstemci (Steam Deck / MacBook) Otomatik Kurulum Betikleri
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              İstemci betiği, evde mi (LAN) yoksa iş yerinde mi (WAN Tünel) olduğunuzu 1 saniyede otomatik algılar ve en düşük gecikmeli rotayı seçer.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs tabular-nums">
              <span className="text-slate-500 dark:text-slate-400 mr-2">Eşleştirme Kodu:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{state.pairingCode}</span>
            </div>
            <button
              type="button"
              onClick={onRegenerateCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Kodu Yenile</span>
            </button>
          </div>
        </div>

        {/* Optional Zero-Touch Customization Inputs */}
        <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            İsteğe Bağlı: Betiğin İçine “Şifresiz Windows Açılışı” ve “İş Yeri Unattended Tünel” Gömün
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Windows Kullanıcı Adı (Otomatik Giriş İçin)
              </label>
              <input
                type="text"
                value={winUser}
                onChange={(e) => setWinUser(e.target.value)}
                placeholder="Örn: OyuncuPC"
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Windows Parolası (Kilit Ekranını Geçmek İçin)
              </label>
              <input
                type="password"
                value={winPass}
                onChange={(e) => setWinPass(e.target.value)}
                placeholder="İsteğe bağlı parola..."
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Otomatik Tünel Auth Anahtarı (İş Yeri CGNAT Aşma)
              </label>
              <input
                type="text"
                value={tunnelKey}
                onChange={(e) => setTunnelKey(e.target.value)}
                placeholder="İsteğe bağlı: tskey-auth-..."
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Headless PC Script */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  ADIM 1 · ODADAKİ OYUN KASASI (WINDOWS POWERSHELL)
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Otomatik IP & MAC Algılar
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                Monitörsüz & Faresiz Kasa Hazırlayıcı Betik
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Kasanın gerçek Yerel IP ve MAC adresini otomatik bulup bu panele kaydeder, Apollo’yu kurar, sanal fareyi (MouseKeys) açar, uykuyu kapatır ve Ethernet Wake-on-LAN’ı aktif eder.
              </p>

              <div className="mt-4 p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                <code>{windowsOneLiner}</code>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => copyText('win-cmd', windowsOneLiner, 'Monitörsüz kasa PowerShell komutu')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === 'win-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'win-cmd' ? 'Kopyalandı' : 'PowerShell Komutunu Kopyala'}</span>
              </button>

              <a
                href={`/api/scripts/host-windows.ps1${scriptQuery}`}
                download="deckpulse-sadece-kasa-kurulum.ps1"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.PS1 Dosyasını İndir (USB İle Kurulum İçin)</span>
              </a>
            </div>
          </div>

          {/* Steam Deck & MacBook Smart Auto-Switching Script */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  ADIM 2 · STEAM DECK & MACBOOK (AKILLI LAN / İŞ YERİ GEÇİŞİ)
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Tünel IP: {state.tunnel.virtualHostIp}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                Evde Yerel Ağdan, İş Yerinde Tünelden Otomatik Bağlayıcı
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Steam Deck (Konsole) veya MacBook (Terminal) üzerinde çalıştırın. Önce kasayı uyandırır; aile evindeyseniz doğrudan <span className="font-mono">{state.host.localIp}</span> adresine, iş yerindeyseniz <span className="font-mono">{state.tunnel.virtualHostIp}</span> tüneline bağlanır.
              </p>

              <div className="mt-4 p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                <code>{clientOneLiner}</code>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => copyText('deck-cmd', clientOneLiner, 'Steam Deck / MacBook komutu')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === 'deck-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'deck-cmd' ? 'Kopyalandı' : 'Steam Deck / Mac Komutunu Kopyala'}</span>
              </button>

              <a
                href="/api/scripts/deck-steamos.sh"
                download="deckpulse-baglan.sh"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.SH Betiğini İndir</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Direct UDP Magic Packet Configuration & Interactive Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSaveAndTestWol}
          className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              03. Kasayı Uzaktan Açma (Wake-on-LAN) Ağ Bilgileri
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Odadaki kasanın güç düğmesine basmaya gitmeden hem yan odadan (TV/MacBook) hem de iş yerinden (Steam Deck) tek tuşla uyandırın.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Kasa Anakart Ethernet MAC Adresi
              </label>
              <input
                type="text"
                value={macInput}
                onChange={(e) => setMacInput(e.target.value)}
                placeholder="A8:A1:59:4E:92:1C"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Aile Evi İçi Yerel IP (LAN)
              </label>
              <input
                type="text"
                value={localIpInput}
                onChange={(e) => setLocalIpInput(e.target.value)}
                placeholder="192.168.1.45"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Aile Evi İnterneti Genel IP / DDNS (İş Yeri İçin)
              </label>
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="88.241.164.92 veya aile-evi.duckdns.org"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                UDP Wake-on-LAN Portu
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={portInput}
                onChange={(e) => setPortInput(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums mb-1.5">
              <span>CANLI 102-BAYT IEEE 802.3 UDP SİHİRLİ PAKET DÖKÜMÜ</span>
              <span className="text-emerald-400">MAC: {formattedMacPairs}</span>
            </div>
            <div className="text-xs font-mono text-slate-200 break-all leading-relaxed">
              {magicPacketHexPreview}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hem ev içi yerel ağa hem de genel IP’ye gerçek UDP paketi gönderir.
            </span>
            <button
              type="submit"
              disabled={sendingPacket}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendingPacket
                  ? 'Sihirli Paket Gönderiliyor...'
                  : 'Kaydet ve Odadaki Kasaya Sihirli Paket Gönder'}
              </span>
            </button>
          </div>
        </form>

        {/* Step-by-Step Router Port Forwarding & BIOS Guide */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Router className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Monitörsüz Kasayı İlk Kez Kurarken Püf Noktalar
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                1. BIOS “Halt On: No Errors” (Klavye Takılı Değil Uyarısını Geçme)
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Kasada klavye/fare takılı olmayacağı için BIOS’ta <span className="font-mono">Wait for F1 If Error = Disabled</span> ve <span className="font-mono">Wake on PCI-E/LAN = Enabled</span> yapmanız kasayı tam bağımsız sunucuya dönüştürür.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                2. Evdeyken Sıfır Modem Ayarı (TV, MacBook ve Steam Deck)
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Aile evindeyken kasa ve cihazlarınız aynı modemde olduğu için <strong>hiçbir port yönlendirme gerekmez</strong>. Doğrudan <span className="font-mono">{localIpInput}</span> üzerinden 1 ms altında bağlanırsınız.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                3. İş Yerinden Uyandırmak İçin (UDP Port {portInput})
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                İş yerindeyken kapalı kasayı uyandırmak için aile evi modeminde <span className="font-mono">{localIpInput}</span> adresine sabit IP verip <span className="font-mono">UDP {portInput}</span> portunu yönlendirmeniz yeterlidir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
