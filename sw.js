const CACHE_NAME = "overload-cache-v98";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./db.js",
    "./manifest.json",
    "./icons/apple-touch-icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                    return null;
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore browser-extension and other non-http(s) schemes.
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return;
    }

    // Never attempt to cache non-GET requests (e.g. Supabase POST/PUT).
    if (request.method !== "GET") {
        event.respondWith(fetch(request));
        return;
    }

    // Always fetch runtime credentials fresh; avoid stale cached config.js on phones.
    if (url.pathname.endsWith("/config.js")) {
        event.respondWith(
            fetch(request, { cache: "no-store" })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Network-first for Chart.js CDN
    if (url.hostname.includes("cdn.jsdelivr.net")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for app assets
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            });
        })
    );
});
