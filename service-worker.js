const CACHE_NAME = 'pinball-rivals-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/constants.js',
  './js/entities.js',
  './js/ball.js',
  './js/collision.js',
  './js/camera.js',
  './js/effects.js',
  './js/race.js',
  './maps/neon.js',
  './maps/canyon.js',
  './js/sound.js',
  './js/ui.js',
  './js/game.js',
  './js/hud.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
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
