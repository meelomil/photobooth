# 🎀 Caca Booth

Website photobooth lucu yang bisa dipakai **sendiri** atau **berdua secara realtime** dari lokasi berbeda — kayak video call tapi hasilnya jadi strip foto bareng!

---

## 📁 Struktur Project

```
caca-booth/
├── frontend/              ← upload ke GitHub Pages
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── signaling-server/      ← deploy ke Railway / Render
    ├── server.js
    └── package.json
```

---

## 🚀 Langkah 1 — Deploy Signaling Server (Railway)

Signaling server diperlukan agar dua browser bisa saling "kenalan" sebelum terkoneksi WebRTC.

### Cara deploy ke Railway (gratis):

1. Buat akun di **https://railway.app** (bisa login pakai GitHub)
2. Klik **"New Project" → "Deploy from GitHub repo"**
3. Upload / push folder `signaling-server/` ke repo GitHub terpisah
   ```bash
   cd signaling-server
   git init
   git add .
   git commit -m "Caca Booth signaling server"
   git branch -M main
   git remote add origin https://github.com/USERNAME/caca-booth-signal.git
   git push -u origin main
   ```
4. Di Railway, pilih repo tersebut → Railway otomatis deteksi `package.json` dan jalankan `npm start`
5. Setelah deploy selesai, klik **"Settings" → "Networking" → "Generate Domain"**
6. Kamu akan dapat URL seperti: `caca-booth-signal.up.railway.app`

### Cara deploy ke Render (alternatif gratis):

1. Buat akun di **https://render.com**
2. Klik **"New" → "Web Service"** → sambungkan repo `signaling-server`
3. Build Command: *(kosongkan)*
4. Start Command: `node server.js`
5. Setelah deploy, kamu dapat URL seperti: `caca-booth-signal.onrender.com`

---

## ✏️ Langkah 2 — Hubungkan Frontend ke Server

Buka file `frontend/script.js`, cari baris ini di bagian atas:

```javascript
const SIGNAL_URL = 'wss://YOUR-SIGNALING-SERVER.up.railway.app';
```

Ganti dengan URL server kamu, contoh:

```javascript
// Railway:
const SIGNAL_URL = 'wss://caca-booth-signal.up.railway.app';

// Render:
const SIGNAL_URL = 'wss://caca-booth-signal.onrender.com';
```

> ⚠️ Pastikan pakai **`wss://`** (bukan `ws://`) karena GitHub Pages pakai HTTPS

---

## 🌐 Langkah 3 — Deploy Frontend ke GitHub Pages

1. Push 3 file di folder `frontend/` ke repo GitHub kamu (repo yang sudah ada sebelumnya):
   ```bash
   cd frontend
   git add .
   git commit -m "Caca Booth - mode bareng WebRTC"
   git push
   ```
2. Di GitHub → **Settings → Pages → Source: main / root → Save**
3. Website live di: `https://USERNAME.github.io/NAMA-REPO/`

---

## 🎮 Cara Pakai Mode Bareng

1. **User 1** buka website → klik **"Bareng"** → klik **"Buat Room"** → dapat kode 6 huruf
2. **User 2** buka website yang sama → klik **"Bareng"** → masukkan kode → klik **"Masuk"**
3. Kedua kamera tersambung otomatis (WebRTC peer-to-peer)
4. Salah satu tekan **"Jepret!"** → countdown muncul di kedua layar bersamaan
5. Hasil foto digabung jadi 1 strip (kamu | teman) per baris
6. Download sebagai PNG! 🎀

---

## ✨ Fitur Lengkap

| Fitur | Keterangan |
|---|---|
| Mode Solo | Foto sendiri, semua layout tersedia |
| Mode Bareng | WebRTC realtime, maks 2 orang |
| Room code | 6 karakter, bisa disalin 1 klik |
| Layout | Strip 3, Strip 4, Grid 2x2, Polaroid |
| Filter | Normal, B&W, Vintage, Warm, Cool, Dreamy |
| Tema bingkai | 7 warna pastel + stiker otomatis |
| Countdown | 3-2-1 sinkron di kedua layar |
| Download | PNG resolusi penuh |

---

## 🛠️ Cara Kerja Teknis

```
Browser A ──── WebSocket ────► Signaling Server ◄──── WebSocket ──── Browser B
     │                                                                    │
     └─────────────────── WebRTC (peer-to-peer) ────────────────────────┘
                         (video stream langsung)
```

1. Signaling server hanya dipakai untuk **pertukaran SDP offer/answer dan ICE candidate**
2. Setelah koneksi WebRTC terbentang, video stream mengalir **langsung** antar browser (p2p)
3. Saat jepret, tiap browser capture kameranya sendiri lalu kirim foto ke peer lewat WebSocket
4. Peer yang menerima foto menyimpannya, lalu kedua set foto digabung di canvas

---

## 🎨 Kustomisasi

- **Ganti nama booth**: cari `Caca Booth` di `index.html`
- **Tambah tema warna**: tambah entry baru di objek `THEMES` di `script.js`
- **Ganti filter**: tambah di `FILTER_CSS` (gunakan CSS filter syntax)
- **Ubah ukuran foto**: edit variabel `cellW`, `cellH` di fungsi `composeCanvas_*`

---

Made with ♡
