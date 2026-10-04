/* High Seas — service worker: cache the whole game for offline play. */
const CACHE = 'high-seas-v1';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.svg',
  'js/engine.js', 'js/data.js', 'js/audio.js', 'js/world.js', 'js/ship.js',
  'js/combat.js', 'js/ai.js', 'js/people.js', 'js/ui.js', 'js/game.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('index.html'))));
});
