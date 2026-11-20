// ============================================================================
// sw.js - Network-First Service Worker for Centralized MBBS Profs Prep
// ============================================================================
const CACHE_NAME = "mbbs-profs-central-v2026-11-20";

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    // Never intercept non-GET (e.g. GitHub PUT uploads) or cross-origin API requests
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Network-First for HTML, JS, CSS, JSON -> falls back to cache only if offline
    event.respondWith(
        fetch(req)
            .then((networkRes) => {
                if (networkRes && networkRes.ok) {
                    const copy = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return networkRes;
            })
            .catch(() => caches.match(req))
    );
});
