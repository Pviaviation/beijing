const CACHE = 'beijing-2026-shell-v3';
const PHOTO_CACHE = 'beijing-2026-photos-v1';
const SUPABASE_PUBLIC = 'https://kwtprdxdoofblazaqcgc.supabase.co/storage/v1/object/public/trip-photos/';

const SHELL = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('beijing-2026-shell-') && k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // The unchanged app still renders uploaded photos as
  // /beijing/data/photos/... . Serve those from Supabase transparently.
  const photoMarker = '/beijing/data/photos/';
  const pos = url.pathname.indexOf(photoMarker);
  if (url.origin === self.location.origin && pos >= 0) {
    const rel = 'data/photos/' + url.pathname.slice(pos + photoMarker.length);
    event.respondWith((async () => {
      const pc = await caches.open(PHOTO_CACHE);
      const cached = await pc.match(req);
      if (!self.navigator || self.navigator.onLine !== false) {
        try {
          const remote = await fetch(SUPABASE_PUBLIC + rel, { cache: 'no-store' });
          if (remote.ok) {
            pc.put(req, remote.clone());
            return remote;
          }
        } catch (_) {}
      }
      return cached || new Response('', { status: 404 });
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // app.html changes frequently: prefer network, retain last good version.
  if (url.pathname.endsWith('/app.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res.ok) caches.open(CACHE).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Stable shell: cache first.
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
