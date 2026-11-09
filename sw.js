const CACHE = "chukui-v6";
const FILES = ["./", "index.html", "xlsx.full.min.js", "manifest.json", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "PretendardVariable.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

function save(req, res) { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if (isPage) {
    // the page: newest version when online (3s limit), saved copy when offline
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match("index.html"));
      const timer = setTimeout(() => { if (!done) { done = true; resolve(fallback()); } }, 3000);
      fetch(req).then(res => { save(req, res); if (!done) { done = true; clearTimeout(timer); resolve(res); } })
        .catch(() => { if (!done) { done = true; clearTimeout(timer); resolve(fallback()); } });
    }));
    return;
  }
  // other files (library, font, icons): saved copy first, refreshed in the background
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fetch(req).then(res => save(req, res)).catch(() => hit);
    return hit || net;
  }));
});
