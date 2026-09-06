const CACHE_NAME = 'homework-tracker-v1';
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './config.js',
    './data-mock.js',
    './data-remote.js',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

// App shell files: cache-first, so the app opens instantly and works offline.
// Everything else (e.g. Supabase requests) just goes to the network as normal.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request)
                .then((response) => {
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
