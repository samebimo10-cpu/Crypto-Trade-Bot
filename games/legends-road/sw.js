// Legends Road service worker: caches the game shell so it runs with no connection.
const CACHE = 'legends-road-v19';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './vendor/three.min.js', './shots.json',
  './vendor/FBXLoader.js', './vendor/GLTFLoader.js', './vendor/fflate.min.js', './vendor/CCapture.all.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything (including the optional Google Fonts, cached the first time they load).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Cinema Mode files you edit or add (shot list, actors, voice lines): network first, so changes show up at once.
  if (/\/(shots\.json|actors\/|voice\/)/.test(new URL(e.request.url).pathname)) {
    e.respondWith(fetch(e.request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || new Response('', { status: 404 }))));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
