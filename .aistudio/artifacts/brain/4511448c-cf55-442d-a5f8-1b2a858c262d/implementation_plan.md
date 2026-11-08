# DeckPulse — Kişisel GeForce NOW, Tek Tuşla Güvenli Tünel ve Uzaktan PC Uyandırma Merkezi

**DeckPulse**, evinizdeki masaüstü oyun bilgisayarınızı (Apollo / Sunshine sunucusu) farklı bir ağdayken (örneğin aile evindeyken) **tek tuşla uzaktan uyandırmanızı (Wake-on-LAN)**, karmaşık VPN veya Tailscale yapılandırmalarıyla uğraşmadan **otomatik sıfır-ayar P2P tünel** kurmanızı ve **Steam Deck (Moonlight) veya doğrudan tarayıcı içinden (WebRTC)** düşük gecikmeli olarak oyun oynamanızı sağlayan kişisel bulut oyun kontrol merkezidir.

---

## Kullanıcı Onayı ve Kritik Kararlar

> [!IMPORTANT]
> Aşağıdaki mimari ve ürün kararları, yanıtladığınız tercihler doğrultusunda netleştirilmiştir. Planı onayladığınızda doğrudan uygulamaya geçilecektir.

- **Onaylanan Karar 1 — Hibrit Çalışma Yapısı (Web Kontrol Merkezi + Otomatik PC ve Steam Deck Kurulum Betikleri)**: Uygulama yalnızca görsel bir arayüz olmakla kalmayıp, evdeki Windows PC'nizde ve Steam Deck'inizde (SteamOS/Linux) tek komutla çalışan gerçek eşleştirme/tünel betikleri (PowerShell ve Bash), otomatik PIN eşleştirme servisi ve gerçek zamanlı WebSocket sinyalizasyon sunucusu içerir.
- **Onaylanan Karar 2 — Doğrudan UDP Sihirli Paket (Magic Packet) Gönderimi ve Port Yönlendirme Rehberi**: Sunucu tarafında gerçek 102-baytlık IEEE 802.3 Wake-on-LAN UDP Sihirli Paketi oluşturularak ev ağınızın genel IP/DDNS adresine (UDP Port 9 / 7 / özel port) doğrudan gönderilir. Ayrıca modem/anakart BIOS ayarlarını adım adım doğrulayan interaktif bir Port ve WoL Doğrulama Sihirbazı yer alır.
- **Onaylanan Karar 3 — Oyun Kütüphanesi, Sanal Ekran (Apollo) Kontrolü, Telemetri ve WebRTC Masaüstü Görüntüleyici**:
  - **Oyun Başlatıcı ve Apollo Sanal Ekran Yöneticisi**: Steam Deck'in ekran çözünürlüğüne (`1280x800 @ 90Hz` HDR veya `1920x1080 @ 120Hz`) uygun sanal ekran (Virtual Display) profilini tek tıkla aktif ederek fiziksel monitör kapalıyken bile oyunu doğrudan başlatır.
  - **Anlık Tünel Sağlığı ve Yayın Telemetrisi**: Gecikme (Ping/RTT), Jitter, Bitrate (Mbps), Kare Hızı (FPS), Paket Kaybı ve enkoder (NVENC AV1 / HEVC) istatistiklerini gerçek zamanlı izler.
  - **Tarayıcı İçi Düşük Gecikmeli WebRTC Masaüstü Görüntüleyici**: Steam Deck yanınızda olmadığında veya hızlıca masaüstünü kontrol etmek istediğinizde doğrudan tarayıcı üzerinden düşük gecikmeli canlı ekran yayını ve fare/klavye/gamepad kontrolü sunar.

---

## 1. Genel Bakış ve Temel Konsept

- **Ne Yapar?**: Evdeki masaüstü oyun PC'niz ile uzaktaki Steam Deck'iniz arasında tek tuşla güvenli tünel kuran, kapalı/uykudaki PC'yi UDP Sihirli Paket ile uyandıran, Apollo sanal ekran profillerini yöneten ve oyunlarınızı kendi kişisel GeForce NOW bulutunuz gibi başlatan tam kapsamlı bir kontrol platformudur.
- **Hedef Kullanıcı ve Senaryo**: Kendi evinde güçlü bir oyun bilgisayarı (Apollo sunuculu) bulunan ve aile evinde, seyahatte veya farklı bir Wi-Fi/mobil ağda Steam Deck (Moonlight) ya da web tarayıcısı üzerinden sıfır kurulum zahmetiyle oyun oynamak isteyen oyuncular.
- **Temel Değer**: Tailscale, port çatışmaları, sanal adaptör IP karmaşası ve fiziksel monitör açık bırakma zorunluluğunu ortadan kaldırarak **"PC'yi Uyandır -> Tüneli Bağla -> Oyunu Başlat"** sürecini tek bir butona indirger.

---

## 2. Kullanıcı Deneyimi ve Görsel Tasarım

### Temel Kullanıcı Akışları
1. **Tek Tuşla "Uyandır ve Bağlan" (Zero-Config Başlangıç)**:
   - Kullanıcı uygulamayı açtığında evdeki PC'nin durumunu görür (*Uyku Modunda / Kapalı*, *Uyanıyor*, *Tünel Aktif*, *Apollo Yayında*).
   - **"PC'yi Uyandır ve Tüneli Başlat"** butonuna bastığında arka uç sunucusu hedef IP/DDNS ve MAC adresine gerçek UDP Magic Packet gönderir, ardından PC çevrimiçi olduğunda güvenli P2P tünelini otomatik kurar ve Moonlight/WebRTC bağlantısını hazır hale getirir.
2. **Oyun Kütüphanesi ve Apollo Sanal Ekran Başlatıcı**:
   - Kullanıcı kütüphanesindeki oyunlardan birine veya *"Steam Big Picture"* / *"Masaüstü"* moduna tıklar.
   - Seçilen cihaza göre (ör. *Steam Deck OLED — 1280x800 @ 90Hz HDR* veya *1080p @ 120Hz*) Apollo sanal ekran komutu iletilir; evdeki fiziksel monitör kapalı kalsa dahi sanal ekran oluşturulur ve oyun tam ekran başlatılır.
3. **Tarayıcı İçi WebRTC Düşük Gecikmeli Masaüstü Görüntüleyici**:
   - Kullanıcı **"Canlı Masaüstü (WebRTC)"** sekmesine geçerek gerçek ekran paylaşımı / uzak masaüstü akışını tarayıcı içinde açabilir, sanal Gamepad/Klavye kısayollarını (*Ctrl+Alt+Del*, *Win+P*, *Görev Yöneticisi*, *Steam Kısayolu*) gönderebilir ve bit hızı/çözünürlük ayarlarını anlık değiştirebilir.
4. **Tek Komutla PC & Steam Deck Eşleştirme Sihirbazı**:
   - **Evdeki PC (Host)** için tek satırlık PowerShell kurulum komutu ve indirilebilir ajan betiği üretilir (Apollo durumunu okur, tüneli ve WebSocket bağlantısını otomatik başlatır).
   - **Steam Deck (Client)** için Konsole'da çalıştırılacak tek satırlık Bash komutu üretilir (Moonlight'a tünel IP'sini otomatik ekler ve masaüstüne kısayol oluşturur).
   - Ayrıca ev modeminde UDP Wake-on-LAN paketlerinin geçmesi için interaktif **Port Yönlendirme ve BIOS WoL Test Aracı** bulunur.

### Görsel Kimlik ve Tema
- **Estetik Yönelim**: Koyu tonlu, yüksek kontrastlı, endüstriyel hassasiyete sahip modern bulut oyun ve telemetri konsolu (SteamOS ve GeForce NOW disiplinini birleştiren temiz yüzey mimarisi).
- **Renk Paleti ve Atmosfer**:
  - **Ana Tuval (%60)**: Derin bazalt koyu arduvaz (`#0F172A`) ve açık mod desteğinde temiz kırık beyaz (`#F8FAFC`).
  - **Yapısal Yüzeyler (%30)**: Tek katmanlı kart yüzeyleri (`#1E293B`), ince `1px` sınır çizgileri (`#334155`) ve yüksek okunabilirlikli tipografi (`#F8FAFC` birincil metin, `#94A3B8` ikincil metin).
  - **Vurgu ve Durum Bütçesi (%10)**: Aktif tünel ve sağlıklı yayın için zümrüt yeşili (`#16A34A`), birincil aksiyonlar ve Steam Deck vurguları için elektrik mavisi (`#2563EB`), Wake-on-LAN uyanma süreci için kehribar (`#D97706`) ve bağlantı hataları için kızıl (`#DC2626`).
- **Tipografi ve Hiyerarşi**:
  - **Başlık ve Navigasyon**: `Outfit` (600/700 ağırlık, dengeli başlık yapısı).
  - **Gövde ve Arayüz Metinleri**: `Plus Jakarta Sans` (400/500/600 ağırlık, yüksek tarama hızı).
  - **Telemetri, IP, MAC ve Gecikme Değerleri**: `JetBrains Mono` (`tabular-nums` ile dikey hizalı sayısal metrikler).
- **Bileşen ve Yerleşim Kuralları**:
  - Sol sabit kenar çubuğu (`260px` genişlik) + üst bağlamsal durum başlığı + `1440px` geniş masaüstü çalışma alanı (ve Steam Deck `1280x800` ekranına tam uyumlu duyarlı yerleşim).
  - İç içe kart karmaşasından kaçınan tek seviyeli yüzey derinliği ve `tabular-nums` veri tabloları.

---

## 3. Temel Ürün Kararları ve Ödünleşimler

- **Karar 1 — Gerçek UDP Magic Packet Gönderen Sunucu + WebSocket Sinyalizasyon Mimarisi**
  - *Seçilen Yaklaşım*: Express arka uç sunucusunda Node.js `dgram` (UDP soketi) kullanarak gerçek IEEE 802.3 102-baytlık Sihirli Paket (`6x 0xFF` + `16x MAC adresi`) oluşturup kullanıcının belirttiği genel IP/DDNS ve UDP portuna gönderen uç nokta, ayrıca WebSocket (`ws`) üzerinden PC ajanı, Steam Deck ve Web arayüzünü gerçek zamanlı senkronize eden sinyalizasyon katmanı.
  - *Neden*: Tarayıcılar güvenlik kısıtlamaları nedeniyle doğrudan ham UDP paketi gönderemez. Arka uç sunucusu üzerinden gerçek UDP paketi göndermek, uzaktan PC uyandırma işleminin gerçekten çalışmasını sağlar.
- **Karar 2 — Sıfır-Ayar Tünel Otomasyonu ve Otomatik Betik Üretici**
  - *Seçilen Yaklaşım*: Kullanıcının Tailscale veya karmaşık ağ ayarlarıyla uğraşmaması için 6 haneli eşleştirme kodu ile çalışan, kopyala-yapıştır tek satırlık Windows (Host) ve Steam Deck (SteamOS) kurulum betikleri üreten dinamik yapılandırma motoru.
  - *Neden*: Kullanıcı deneyimini "kurulum gerektirmeyen tek tuşla tünel" hedefine ulaştırırken gerçek cihazlarda da doğrudan çalışabilir bir köprü sunar.
- **Karar 3 — Apollo Sanal Ekran (Virtual Display) Profilleri**
  - *Seçilen Yaklaşım*: Sunshine'dan farklı olarak Apollo'nun en güçlü özelliği olan "Sanal Ekran (headless virtual display)" yönetimini doğrudan arayüze entegre etmek (Steam Deck `1280x800 @ 90Hz HDR`, `1920x1080 @ 60/120Hz`, `2560x1440 @ 120Hz`).
  - *Neden*: Evdeki PC'nin fiziksel monitörü kapalıyken bile Steam Deck ekran oranına (16:10) tam uyan siyah çubuksuz ve düşük gecikmeli bir yayın sağlar.

---

## 4. Teknik Mimari ve Veri Stratejisi

### Sistem ve Bileşen Mimarisi Diyagramı

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     DeckPulse Web & Steam Deck Arayüzü                       │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │  Komuta Merkezi &    │  │  Oyun Kütüphanesi &  │  │  Canlı Masaüstü    │  │
│  │  Tek Tuş Tünel/WoL   │  │  Apollo Sanal Ekran  │  │  (WebRTC Görüntü)  │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬──────────┘  │
│             │                         │                        │             │
│  ┌──────────┴─────────────────────────┴────────────────────────┴──────────┐  │
│  │        Tünel Telemetri Paneli & PC / Steam Deck Eşleştirme Sihirbazı   │  │
│  └────────────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                        │ HTTP REST (/api/*) & WebSocket (/ws)
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Arka Uç Sunucusu (Express + WS + UDP)                    │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │  UDP Sihirli Paket   │  │  P2P Tünel & Röle    │  │  Oyun / Apollo     │  │
│  │  Motoru (dgram WoL)  │  │  Sinyalizasyon (WS)  │  │  Durum Yöneticisi  │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬──────────┘  │
└─────────────┼─────────────────────────┼────────────────────────┼─────────────┘
              │ UDP (Port 9/7/Özel)     │ Güvenli Tünel / WS     │ Komut / Yayın
              ▼                         ▼                        ▼
┌─────────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐
│  Ev Modemi / Anakart    │  │  Evdeki Gaming PC    │  │  Steam Deck        │
│  (Wake-on-LAN Alıcısı)  │  │  (Apollo Host Ajanı) │  │  (Moonlight İstemci)│
└─────────────────────────┘  └──────────────────────┘  └────────────────────┘
```

### Veri Modeli ve Durum Yönetimi
- **Host PC Yapılandırması (`HostProfile`)**: Cihaz adı, MAC adresi, Genel IP / DDNS adresi, WoL UDP Portu (varsayılan `9`), Apollo API portu (`47989`), güç durumu (`offline`, `waking`, `online`, `streaming`), aktif sanal ekran profili (`1280x800@90`, `1920x1080@120` vb.), GPU/CPU yükü ve enkoder bilgisi.
- **Tünel Oturumu (`TunnelSession`)**: Tünel durumu (`disconnected`, `handshaking`, `connected`), tünel sanal IP'si, şifreleme protokolü (`WireGuard / WebRTC DTLS`), anlık RTT gecikmesi (ms), jitter (ms), paket kaybı (%), anlık bitrate (Mbps) ve aktif istemci cihazlar.
- **Oyun ve Uygulama Kütüphanesi (`GameApp`)**: Oyun başlığı, kapak görseli, başlatma komutu / Steam App ID, önerilen Apollo çözünürlük/FPS profili, son oynanma süresi ve tek tıkla başlatma durumu.

### Etkileşimli Bileşen ve Durum Eşlemesi
- **Tek Tuşla PC Uyandırma ve Tünel Kurulumu**: Kullanıcı *"PC'yi Uyandır ve Bağlan"* butonuna bastığında `POST /api/wol/wake` uç noktası MAC adresini doğrular, 102-baytlık gerçek UDP Sihirli Paketini hedef IP/Port'a gönderir, gönderilen paketin hex dökümünü ve durumunu kaydeder; eşzamanlı olarak WebSocket üzerinden uyanma ve tünel el sıkışma adımlarını canlı ilerleme çubuğuyla günceller.
- **Apollo Sanal Ekran ve Yayın Profili Değiştirici**: Çözünürlük (`1280x800 Steam Deck`, `1920x1080 FHD`, `2560x1440 QHD`), yenileme hızı (`60Hz`, `90Hz`, `120Hz`), Bitrate kaydırıcısı (`10 Mbps` – `150 Mbps`) ve HDR/AV1 anahtarları değiştirildiğinde `POST /api/apollo/profile` üzerinden sunucu durumu güncellenir ve bağlı tüm istemcilere WebSocket ile anında yayınlanır.
- **Oyun Başlatma ve Kütüphane Yönetimi**: Kullanıcı mevcut oyunlardan birini başlatabilir, durdurabilir veya *"Yeni Oyun / Uygulama Ekle"* modalı ile kendi PC'sindeki bir oyunun Steam ID / dosya yolunu kütüphaneye ekleyebilir.
- **Tarayıcı İçi WebRTC Masaüstü Görüntüleyici**: Gerçek `navigator.mediaDevices.getDisplayMedia` / WebRTC akışı veya uzaktan bağlı PC ekran akışı üzerinden tam ekran masaüstü kontrolü, gecikme katmanı (HUD overlay), sanal klavye/gamepad tuş gönderimi ve anlık ekran görüntüsü yakalama işlevlerini çalıştırır.
- **Kurulum Betiği Üretici ve WoL Port Test Aracı**: Kullanıcının girdiği MAC, IP ve eşleştirme koduna göre anlık güncellenen, tek tıkla kopyalanabilir veya `.ps1` / `.sh` dosyası olarak indirilebilir gerçek kurulum betikleri sunar.
