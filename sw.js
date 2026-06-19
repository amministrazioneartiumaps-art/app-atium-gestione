// ============================================================
// SERVICE WORKER — Protezione 360
// Aggiorna CACHE_NAME ad ogni deploy importante per forzare
// il refresh automatico su tutti i dispositivi installati.
// ============================================================
var CACHE_NAME = 'p360-v4';
var FILES = [
  './protezione360.html',
  './artium_app.html',
  './admin_app.html',
  './app_web.html'
];

// Installazione: metti in cache i file
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Attivazione: elimina le vecchie cache
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first per tutti gli HTML, ignora Supabase/R2
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  // Ignora chiamate a Supabase e R2 — vanno sempre in rete
  if (url.hostname.includes('supabase.co') || url.hostname.includes('r2.dev')) return;

  var isHTML = url.pathname.endsWith('.html') ||
               url.pathname.endsWith('/') ||
               url.pathname === '/';

  if (isHTML) {
    // Network-first per gli HTML: sempre versione aggiornata
    e.respondWith(
      fetch(e.request).then(function(networkRes) {
        var clone = networkRes.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return networkRes;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
  } else {
    // Cache-first per tutto il resto (icone, font, ecc.)
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request);
      })
    );
  }
});

// Messaggio dal client per forzare aggiornamento
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
