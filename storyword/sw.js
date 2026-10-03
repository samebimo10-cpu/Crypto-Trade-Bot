// Service worker: after the first visit, StoryWord plays with no connection.
// It precaches the app shell and every content file listed in story.json,
// then serves from the cache first. Bump VERSION when shipping changes.
const VERSION = 'storyword-v3';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icon.svg',
  'src/main.js',
  'src/engine/story.js',
  'src/engine/puzzle.js',
  'src/engine/progress.js',
  'src/ui/portrait.js',
  'src/ui/scenes.js',
  'src/ui/audio.js',
  'content/story.json',
  'content/characters.json',
  'content/puzzles.json',
  'content/daily.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL);
      const story = await (await cache.match('content/story.json')).json();
      await cache.addAll(story.chapters.map((c) => `content/${c.file}`));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      const res = await fetch(event.request);
      if (res.ok && new URL(event.request.url).origin === location.origin) {
        const cache = await caches.open(VERSION);
        cache.put(event.request, res.clone());
      }
      return res;
    })(),
  );
});
