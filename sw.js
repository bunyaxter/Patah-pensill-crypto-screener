const CACHE_NAME = "pp-screener-v53";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

// File yang SERING berubah selama pengembangan aktif — network-first, cache cuma jadi fallback
// offline. Sebelumnya cache-first bikin HP suka nunjukin versi lama walau file di server udah baru
// (harus double-refresh atau clear cache manual). Sekarang: tiap buka app, browser CEK ke server dulu;
// cuma kalau bener-bener offline/network gagal, baru pakai salinan cache yang terakhir berhasil disimpan.
const NETWORK_FIRST_FILES = ["index.html", "manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Data live Binance: selalu network, jangan pernah di-cache (biar harga selalu real-time)
  if (url.includes("fapi.binance.com") || url.includes("fstream.binance.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isNetworkFirst = NETWORK_FIRST_FILES.some((f) => url.endsWith(f)) || url.endsWith("/");

  if (isNetworkFirst) {
    // NETWORK-FIRST: coba ambil versi terbaru dari server dulu. Kalau berhasil, simpan ke cache
    // (buat fallback offline nanti) DAN langsung dipakai — jadi update kamu langsung kelihatan
    // begitu HP online, tanpa nunggu siklus cache lama.
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // File statis lain (icon, dll) yang jarang berubah: cache-first, fallback ke network — tetap cepat dimuat.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        }).catch(() => cached)
      );
    })
  );
});
