/* Service Worker – Veranstaltungs-Dashboard (Offline-App-Shell) */
const CACHE = 'camp-dash-v1';
const SHELL = [
  './',
  'index.html',
  'veranstaltungs-dashboard.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of SHELL) {
      try {
        const sameOrigin = !/^https?:\/\//.test(u) || u.indexOf(self.location.origin) === 0;
        const req = new Request(u, { mode: sameOrigin ? 'same-origin' : 'no-cors' });
        const resp = await fetch(req);
        await c.put(req, resp);
      } catch (_) { /* Datei überspringen, wenn nicht erreichbar */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  // Dynamische Daten immer aus dem Netz holen (nicht cachen):
  if (/docs\.google\.com|\.supabase\.co|open-meteo\.com|bringabottle|paypal\.com|whatsapp\.com|googleusercontent/.test(url)) {
    return; // Standard-Netzwerkverhalten
  }
  // App-Shell & Bibliotheken: erst Cache, dann Netz, dann Fallback auf Dashboard
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => { try { c.put(req, copy); } catch (_) {} });
      return resp;
    }).catch(() => caches.match('veranstaltungs-dashboard.html')))
  );
});
