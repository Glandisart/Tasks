// Hors ligne : l'app est mise en cache au premier chargement. Incrémenter VERSION à chaque mise à jour.
const VERSION = 'quotidien-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;
  // Page : on sert tout de suite la copie en cache (marche même avec un réseau lent ou "connecté sans internet"),
  // et on récupère la dernière version en arrière-plan pour le lancement suivant.
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match('index.html');
      const refresh = fetch(req).then(r => { if (r.ok) cache.put('index.html', r.clone()); return r; });
      if (hit) { e.waitUntil(refresh.catch(() => {})); return hit; }
      return refresh;
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); }
    return r;
  })));
});
