const CACHE = 'ancrage-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie "network-first" pour index.html : toujours essayer de récupérer la dernière version
// en ligne d'abord, et ne se rabattre sur le cache qu'en cas d'échec réseau (mode hors-ligne).
// Ça évite qu'une ancienne version de l'app (avec d'anciennes couleurs) reste servie indéfiniment
// depuis le cache après une mise à jour, ce qui s'est déjà produit lors de refontes précédentes.
self.addEventListener('fetch', (e) => {
  const isHtml = e.request.mode === 'navigate' || e.request.url.endsWith('.html') || e.request.url.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          caches.open(CACHE).then((c) => c.put(e.request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsList) => {
      for (const client of clientsList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
