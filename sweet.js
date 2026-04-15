// sw.js - Basic Service Worker to pass install criteria

self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activated');
    return self.clients.claim();
});

// A fetch listener is strictly required by Chrome to trigger the install prompt
self.addEventListener('fetch', (event) => {
    // Simply fetch from the network for now
    event.respondWith(fetch(event.request));
});
