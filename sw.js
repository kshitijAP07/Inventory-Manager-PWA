/**
 * IM Platform — Service Worker
 * Provides offline caching with a Network-First strategy for HTML
 * and a Cache-First strategy for static assets (CSS, JS, images, fonts).
 */

const CACHE_NAME = 'im-pwa-cache-v2';

// Core shell files to pre-cache on install
// Core shell files to pre-cache on install
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    // Manager PWA
    './MANAGER_PWA/manager-dashboard.html',
    './MANAGER_PWA/alerts.html',
    './MANAGER_PWA/operators.html',
    './MANAGER_PWA/quick-allot.html',
    './MANAGER_PWA/ws-detail.html',
    './MANAGER_PWA/edit-task.html',
    // Inventory Manager PWA
    './Inventory_Manager_PWA/im-dashboard.html',
    './Inventory_Manager_PWA/inventory.html',
    './Inventory_Manager_PWA/add-product.html',
    './Inventory_Manager_PWA/allot-kit.html',
    './Inventory_Manager_PWA/create-kit.html',
    './Inventory_Manager_PWA/im-alerts.html',
    './Inventory_Manager_PWA/item-detail.html',
    './Inventory_Manager_PWA/quick-allot.html',
    './Inventory_Manager_PWA/scanned-product.html',
    './Inventory_Manager_PWA/ws-detail.html',
    // Operator PWA
    './Operator_PWA/home.html',
    './Operator_PWA/alerts.html',
    './Operator_PWA/raise-issue.html'
];

// ─── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching app shell');
                // Use addAll with individual error handling so a single 404 doesn't
                // break the entire install (common in dev environments)
                return Promise.allSettled(
                    PRECACHE_URLS.map((url) =>
                        cache.add(url).catch((err) => {
                            console.warn(`[SW] Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Skip cross-origin requests except Google Fonts
    const url = new URL(request.url);
    const isGoogleFont = url.hostname === 'fonts.googleapis.com' ||
                         url.hostname === 'fonts.gstatic.com';

    if (url.origin !== location.origin && !isGoogleFont) return;

    // For HTML pages → Network-First (so users always get fresh content when online)
    if (request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // For static assets → Cache-First (faster loads)
    event.respondWith(cacheFirst(request));
});

// ─── STRATEGIES ────────────────────────────────────────────

/**
 * Network-First: Try network, fall back to cache.
 * Good for HTML pages where freshness matters.
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        return offlineFallback();
    }
}

/**
 * Cache-First: Try cache, fall back to network.
 * Good for CSS, JS, images, fonts that rarely change.
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('', { status: 408, statusText: 'Offline' });
    }
}

/**
 * Offline fallback page when no cache is available.
 */
function offlineFallback() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IM - Offline</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Space Grotesk', sans-serif;
            background: #FFFFFF;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #0F0F0F;
        }
        .offline-container {
            text-align: center;
            padding: 32px;
            animation: fadeIn 0.5s ease;
        }
        .offline-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FF7A3D, #FF631C);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .offline-icon svg { width: 36px; height: 36px; }
        h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        p { color: rgba(15,15,15,0.5); font-size: 15px; margin-bottom: 28px; }
        .retry-btn {
            background: linear-gradient(135deg, #FF7A3D, #FF631C);
            color: #fff;
            border: none;
            padding: 14px 36px;
            border-radius: 28px;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(255,99,28,0.25);
            transition: transform 0.15s ease;
        }
        .retry-btn:active { transform: scale(0.97); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">
            <svg fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
        </div>
        <h1>You're Offline</h1>
        <p>Check your internet connection and try again.</p>
        <button class="retry-btn" onclick="window.location.reload()">Retry Connection</button>
    </div>
</body>
</html>`;
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
