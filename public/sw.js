const CACHE_NAME = 'deep-signal-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];
const MAX_CACHED_REQUESTS = 100;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL).catch(() => undefined);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('deep-signal-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isPublicSupabaseMedia = url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/');
  const isSupabaseApi = url.hostname.endsWith('.supabase.co') && !isPublicSupabaseMedia;
  const isSameOrigin = url.origin === self.location.origin;

  // Auth, database rows, and private storage are never persisted by this worker.
  if (isSupabaseApi || (!isSameOrigin && !isPublicSupabaseMedia)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (isPublicSupabaseMedia && cached) {
      event.waitUntil(fetchAndCache(request, cache));
      return cached;
    }

    try {
      return await fetchAndCache(request, cache);
    } catch {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const appShell = await cache.match('/index.html');
        if (appShell) return appShell;
      }
      return Response.error();
    }
  })());
});

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  const hasRangeHeader = request.headers.has('range');
  if (!hasRangeHeader && response.ok && (response.type === 'basic' || response.type === 'cors')) {
    const copy = response.clone();
    await cache.put(request, copy);
    const keys = await cache.keys();
    if (keys.length > MAX_CACHED_REQUESTS) {
      await cache.delete(keys[0]);
    }
  }
  return response;
}