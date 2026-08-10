const CACHE_NAME = "trading-tracker-cache-v1";

// App shell: file statis milik web-app ini sendiri (bukan data trading).
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // PENTING: jangan pernah cache request ke luar (Supabase, CDN supabase-js, dll).
  // Data akun trading harus SELALU realtime dari network, bukan dari cache.
  if (url.origin !== self.location.origin) {
    return; // biarkan browser tangani seperti biasa, tanpa campur tangan service worker
  }

  // Untuk file app-shell sendiri: stale-while-revalidate
  // (langsung tampil dari cache biar cepat/offline, sambil diam-diam update di background)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || networkFetch;
    })
  );
});
