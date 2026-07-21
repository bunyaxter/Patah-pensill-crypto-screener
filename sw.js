const CACHE_NAME = 'pp-screener-v2.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ===== INSTALL: Cache static assets =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW: Gagal cache beberapa asset:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ===== ACTIVATE: Bersihkan cache lama =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW: Hapus cache lama:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ===== FETCH: Network-first untuk API Binance, Cache-first untuk static =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API Binance: network-first, fallback ke cache kalau offline
  if (url.hostname.includes('binance.com') || url.hostname.includes('fapi.binance.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response buat cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Return empty JSON array kalau API fail & nggak ada cache
            return new Response('[]', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Static assets: cache-first, fallback ke network
  if (request.mode === 'navigate' || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        }).catch(() => {
          // Fallback ke index.html untuk SPA routing
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Default: network dengan cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Patah Pensill Alert', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Ada sinyal baru di scanner!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'pp-alert',
    requireInteraction: data.requireInteraction || false,
    renotify: data.renotify || false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Buka App' },
      { action: 'dismiss', title: 'Abaikan' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🚨 Patah Pensill Alert',
      options
    )
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, notification } = event;

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = notification.data?.url || '/';

      // Fokus ke tab yang sudah terbuka
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      // Buka tab baru kalau belum ada
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ===== BACKGROUND SYNC (untuk journal entries saat offline) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'pp-sync-journal') {
    event.waitUntil(syncJournalEntries());
  }
});

async function syncJournalEntries() {
  // Journal entries disimpan di IndexedDB atau localStorage —
  // Service Worker nggak bisa akses localStorage langsung, tapi app bisa trigger sync
  // begitu online lagi. Ini placeholder untuk future enhancement.
  console.log('SW: Background sync triggered for journal');
}

// ===== PERIODIC BACKGROUND SYNC (untuk refresh data pas app tertutup) =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'pp-refresh-data') {
    event.waitUntil(refreshDataInBackground());
  }
});

async function refreshDataInBackground() {
  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('https://fapi.binance.com/fapi/v1/ticker/24hr', response.clone());

      // Notify all clients bahwa data baru tersedia
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ type: 'DATA_REFRESHED', timestamp: Date.now() });
      });
    }
  } catch (err) {
    console.warn('SW: Background refresh gagal:', err);
  }
}

// ===== MESSAGE FROM CLIENT (bi-directional communication) =====
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source.postMessage({ type: 'VERSION', version: CACHE_NAME });
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          event.source.postMessage({ type: 'CACHE_CLEARED' });
        })
      );
      break;

    case 'CACHE_ASSETS':
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(payload || []).then(() => {
            event.source.postMessage({ type: 'ASSETS_CACHED' });
          });
        })
      );
      break;
  }
});

// ===== ONLINE/OFFLINE STATUS BROADCAST =====
function broadcastStatus(online) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: online ? 'ONLINE' : 'OFFLINE' });
    });
  });
}

self.addEventListener('online', () => broadcastStatus(true));
self.addEventListener('offline', () => broadcastStatus(false));

console.log('SW: Patah Pensill Service Worker aktif —', CACHE_NAME);
