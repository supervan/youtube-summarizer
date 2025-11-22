const CACHE_NAME = 'yt-summarizer-v104';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Handle share target POST requests
    if (event.request.url.endsWith('/share') && event.request.method === 'POST') {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                let url = formData.get('url');
                const text = formData.get('text');

                // Android often sends the URL inside the 'text' field
                // Sometimes it's in 'title' too? Let's check everything.
                const contentToCheck = [url, text, formData.get('title')].filter(Boolean).join(' ');

                // Try to find a URL in the combined content
                const urlMatch = contentToCheck.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    url = urlMatch[0];
                } else {
                    // Fallback: use the text if no URL found (maybe it's just an ID?)
                    url = text || url;
                }

                // Redirect to home with URL as query parameter
                return Response.redirect(`/?url=${encodeURIComponent(url || '')}`, 303);
            })()
        );
        return;
    }

    // Normal fetch handling
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});
