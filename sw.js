// Service Worker for Discord Clone PWA
const CACHE_NAME = 'discord-clone-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle WebSockets and dynamic API calls
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
