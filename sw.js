/* Conti di Famiglia — service worker
   App shell: network-first (così un nuovo deploy si vede subito quando sei online,
   e resta disponibile offline). CDN/font: cache-first. I dati Firestore hanno la
   loro cache offline integrata e non passano da qui. */
const CACHE = 'conti-v3-6';
const SHELL = [
  './', './index.html', './style.css', './app.js', './store.js',
  './firebase-config.js', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Lascia passare le chiamate Firebase/Google: Firestore gestisce l'offline da solo.
  if (/firestore|googleapis|identitytoolkit|firebaseio|firebaseinstallations|google-analytics/.test(url.hostname)) return;

  if (url.origin === location.origin) {
    // App shell: rete prima (rivalidando sempre col server), cache come fallback offline.
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
  } else {
    // CDN Firebase + Google Fonts: cache prima.
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => m))
    );
  }
});
