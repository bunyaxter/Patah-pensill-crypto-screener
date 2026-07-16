# 📟 Patah Pensill — Live Futures Screener

Progressive Web App (PWA) untuk screening Binance USDT-M Futures secara real-time, langsung dari browser HP atau PC — tanpa API key, tanpa backend, tanpa biaya server.

**Live:** https://bunyaxter.github.io/patah-pensill-screener-crypto/

## Fitur

**Data & Skor**
- Live 24H ticker seluruh pair USDT-M Perpetual dari Binance Futures
- Quick Score (semua pair) & Deep Signal (RSI + tren, on-demand/batch scan)
- Skor Long/Short 8 faktor: Struktur Market (bobot 2x), Trend, Momentum (RSI), MACD, AVWAP, Fibonacci, Volume, Funding Rate — dengan modulator kekuatan tren (ADX)

**Indikator (di modal detail, per timeframe 1H–Monthly)**
- EMA21/30, MA200
- Anchored VWAP + Band 0.5σ (anchor otomatis ke swing terbaru)
- Fibonacci Retracement
- MACD, StochRSI
- ATR, Bollinger Bands
- ADX (+DI/-DI)
- Struktur Market: swing HH/HL vs LH/LL, deteksi BOS & CHoCH
- Funding Rate & Open Interest
- Konfluensi multi-timeframe (1H/4H/1D): trend + struktur

**Alat Bantu**
- Rencana entry otomatis (Entry/SL/TP/RR) berbasis level struktural
- Watchlist (⭐) dengan alert otomatis: RSI ekstrem, funding ekstrem, harga mendekati level struktural, CHoCH
- Notifikasi browser
- Tombol "Copy Ringkasan buat AI" — merangkum semua indikator jadi prompt siap-tempel ke Claude/AI lain
- PWA installable, bisa dipakai offline untuk shell app (data tetap butuh koneksi)

## Struktur File

```
index.html              seluruh app (HTML+CSS+JS, single file)
sw.js                    service worker (cache shell app, data selalu live/no-cache)
manifest.json            metadata PWA
icon-192.png             ikon 192x192
icon-512.png             ikon 512x512
icon-512-maskable.png    ikon maskable 512x512
```

## Deploy ke GitHub Pages

1. Push semua file di atas ke root branch `main` (atau folder `/docs`, sesuaikan setting Pages).
2. Repo → Settings → Pages → Source: pilih branch & folder yang berisi file-file ini.
3. Tunggu build selesai, akses via `https://<username>.github.io/<repo>/`.
4. Setiap update `index.html`/`sw.js`, **naikkan versi `CACHE_NAME`** di `sw.js` (baris pertama) — ini yang memastikan HP pengguna otomatis ambil versi baru, bukan versi lama dari cache.

## Catatan Teknis

- **Tanpa API key**: semua request langsung ke endpoint publik `fapi.binance.com` dari browser pengguna sendiri (client-side). Tidak ada data yang lewat server pihak ketiga.
- **Data pribadi** (watchlist, pengaturan alert, riwayat alert) tersimpan di `localStorage` HP/browser masing-masing pengguna — tidak dikirim ke mana pun.
- **Rate limit**: fitur yang butuh banyak candle per pair (Deep Scan, alert Watchlist, konfluensi multi-timeframe) sengaja dibatasi jumlah pair/concurrency-nya supaya tidak kena limit Binance.
- Kalau data gagal dimuat, kemungkinan besar ISP/jaringan memblokir domain Binance — coba VPN.
- Ini **bukan rekomendasi finansial**. Semua skor & sinyal murni hasil kalkulasi struktur teknikal, bukan saran investasi.

## Lisensi / Penggunaan

Proyek pribadi untuk keperluan trading & konten edukasi "Patah Pensill". Silakan modifikasi untuk kebutuhan sendiri.
