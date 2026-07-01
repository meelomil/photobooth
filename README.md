# 🎀 Cutie Booth — Photobooth Website

Website photobooth lucu bergaya pastel, langsung jalan di browser pakai HTML, CSS, dan JavaScript murni (tanpa framework, tanpa build tool).

## ✨ Fitur
- 4 pilihan layout: Strip 3, Strip 4, Grid 2x2, Polaroid
- 6 filter foto: Normal, B&W, Vintage, Warm, Cool, Dreamy
- 6 tema warna bingkai + stiker lucu otomatis (bintang, hati, sparkle)
- Hitung mundur 3-2-1 sebelum tiap jepretan + efek flash
- Hasil akhir bisa langsung didownload sebagai gambar PNG

## 📁 Struktur Project
```
cutie-photobooth/
├── index.html      # struktur halaman
├── style.css        # semua styling & animasi
├── script.js         # logika kamera, capture, dan compose hasil foto
└── README.md
```

## 🚀 Cara Menjalankan di Komputer
1. Download / clone folder ini
2. Buka `index.html` langsung di browser, **atau** (disarankan) jalankan local server supaya kamera pasti berfungsi:
   ```bash
   # kalau punya Python
   python3 -m http.server 8000
   # lalu buka http://localhost:8000
   ```
3. Izinkan akses kamera saat diminta browser

> ⚠️ Kamera browser hanya bisa diakses lewat **HTTPS** atau **localhost**. Membuka file langsung (`file://`) kadang tidak diizinkan oleh sebagian browser.

## 🌐 Cara Deploy Gratis ke GitHub Pages
1. Buat repository baru di GitHub, misalnya `cutie-booth`
2. Upload/push 3 file ini (`index.html`, `style.css`, `script.js`) ke repo tersebut:
   ```bash
   git init
   git add .
   git commit -m "Cutie Booth photobooth website"
   git branch -M main
   git remote add origin https://github.com/USERNAME/cutie-booth.git
   git push -u origin main
   ```
3. Di GitHub, buka repo → **Settings** → **Pages**
4. Pada bagian **Source**, pilih branch `main` dan folder `/root`, lalu **Save**
5. Tunggu 1-2 menit, website akan aktif di:
   ```
   https://USERNAME.github.io/cutie-booth/
   ```
   (GitHub Pages otomatis pakai HTTPS, jadi kamera pasti berfungsi ✅)

## 🎨 Kustomisasi
- Ganti warna tema di `script.js` pada objek `THEME_COLORS`
- Ganti font di `index.html` (link Google Fonts) dan `style.css`
- Tambah filter baru di `FILTER_CSS` (pakai CSS `filter` syntax)
- Ubah ukuran foto/strip di fungsi `composeResult()` (variabel `cellW`, `cellH`, `gap`)

## 🛠️ Cara Kerja Singkat
1. `getUserMedia()` mengakses webcam pengguna
2. Filter diterapkan lewat CSS `filter` (preview) dan `ctx.filter` di Canvas (saat capture) supaya hasilnya konsisten
3. Setiap foto disimpan sementara sebagai data URL
4. Setelah semua foto terkumpul, semuanya digambar ulang ke satu `<canvas>` sesuai layout, tema warna, dan stiker
5. Tombol download memanggil `canvas.toDataURL('image/png')` untuk menyimpan hasil akhir

---
Made with ♡
