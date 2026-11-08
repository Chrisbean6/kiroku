// Service worker di Kiroku: fa funzionare l'app anche offline.
// - i file dell'app: prima la rete (così prendi subito gli aggiornamenti), se manca usa la copia salvata
// - le copertine: prima la copia salvata, poi la rete
// - database e ricerche online: mai in cache
const VERSION = 'kiroku-v2-20261108142221';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/themes.css', 'css/app.css', 'vendor/supabase.js',
  'js/main.js', 'js/util.js', 'js/types.js', 'js/state.js', 'js/store.js', 'js/cloud.js', 'js/config.js', 'js/sources.js',
  'js/cards.js', 'js/views.js', 'js/sheets.js', 'js/detail.js', 'js/form.js', 'js/recs.js', 'js/extra.js', 'js/effects.js',
  'js/mascot.js', 'js/sumi-art.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const IMG_CACHE = 'kiroku-img';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== IMG_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const isImage = (req, url) => req.destination === 'image' && (/\/storage\/v1\/object\/public\/covers\//.test(url.pathname) || /anilist|vndb|openlibrary|mzstatic|coverartarchive|archive\.org|wikimedia/.test(url.hostname));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // copertine: cache prima, rete dopo (con limite di grandezza della cache)
  if (isImage(req, url)) {
    e.respondWith(caches.open(IMG_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(c, 600); }
        return res;
      } catch { return hit || Response.error(); }
    }));
    return;
  }
  // file dell'app (stessa origine) e font: rete prima, cache se offline
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))));
  }
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) for (const k of keys.slice(0, keys.length - max)) await cache.delete(k);
}
