const CACHE_NAME = 'pinball-rivals-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './constants.js',
  './entities.js',
  './ball.js',
  './collision.js',
  './camera.js',
  './effects.js',
  './race.js',
  './maps/neon.js',
  './maps/canyon.js',
  './sound.js',
  './ui.js',
  './game.js',
  './hud.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all([
        self.clients.claim(),
        ...cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      ]);
    })
  );
});
