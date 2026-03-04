/**
 * Service Worker — Bananas Heroes
 *
 * Стратегии:
 *   img/, audio/  →  cache-first  (отдаём из кеша, иначе сеть + кешируем)
 *   .js, .css, .html  →  network-first  (сначала сеть, при ошибке — кеш)
 *
 * Для сброса кеша при деплое достаточно поменять CACHE_VERSION.
 */

const CACHE_VERSION = 'bh-v1';
const CACHE_ASSETS  = CACHE_VERSION + '-assets'; // img + audio
const CACHE_CODE    = CACHE_VERSION + '-code';   // js + css + html

// Критичные ресурсы для предзагрузки при install (небольшой набор — самые нужные)
const PRECACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './img/forest.png',
    './img/forest2.png',
    './img/avs-bg.png',
    './img/bg-avs.png',
    './img/bg-avs2.png',
    './img/bn-bg.png',
    './img/pl-bg.png',
    './img/ud-bg.png',
    './img/lb-bg.png',
    './img/lb2-bg.png',
    './img/kuzy.png',
    './img/kuzy_jump.png',
    './img/kuzy_shoot.png',
    './img/dron.png',
    './img/dron_bullet.png',
    './img/max.png',
    './img/max-stand.png',
    './img/max_bullet.png',
];

// ---- Install: предзагружаем критичный набор ----
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_ASSETS)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// ---- Activate: удаляем старые кеши ----
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_ASSETS && k !== CACHE_CODE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ---- Fetch ----
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Только GET, только наш origin
    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    // Не перехватываем chrome-extension и прочее
    if (!url.protocol.startsWith('http')) return;

    const path = url.pathname;

    // img/ и audio/ — cache-first
    if (path.startsWith('/img/') || path.startsWith('/audio/')) {
        event.respondWith(cacheFirst(event.request, CACHE_ASSETS));
        return;
    }

    // .js, .css, .html — network-first (чтобы обновления подхватывались)
    if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html') || path === '/') {
        event.respondWith(networkFirst(event.request, CACHE_CODE));
        return;
    }
});

/**
 * Cache-first: отдаём из кеша, при промахе — сеть + кешируем ответ.
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Сеть недоступна и кеша нет — ничего не можем сделать
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first: пробуем сеть, при ошибке — кеш.
 */
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Offline', { status: 503 });
    }
}
