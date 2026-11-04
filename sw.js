const CACHE = "seclusa-site-v15.8";
const BASE = self.location.pathname.replace(/\/[^/]*$/, "/");
const V = "15.8";

/**
 * Whether a URL is one this worker is allowed to keep a copy of.
 *
 * Only two shapes are cacheable: no query at all, and the `?v=` stamp this file
 * emits itself for cache-busting. Everything else still gets its network
 * response — it is simply never written down.
 *
 * `URL.search` includes the leading `?`, so the stamp check must too.
 */
function cacheable(url) {
  return url.search === "" || /^\?v=[0-9][\d.]*$/.test(url.search);
}
const PRECACHE = [
  BASE,
  BASE + "index.html",
  BASE + "offline.html",
  BASE + "about/",
  BASE + "privacy/",
  BASE + "css/site.css?v=" + V,
  BASE + "js/site.js?v=" + V,
  BASE + "js/theme-boot.js?v=" + V,
  BASE + "icons/icon-192.png?v=" + V,
  BASE + "icons/icon-512.png?v=" + V,
  BASE + "icons/logo.png?v=" + V,
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("seclusa-site-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const own = () => caches.open(CACHE);
  const ownMatch = (u) => own().then((c) => c.match(u));

  if (req.mode === "navigate") {
    const keep = cacheable(url);
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (keep && res && res.status === 200) {
            const copy = res.clone();
            e.waitUntil(own().then((c) => c.put(req, copy)).catch(() => {}));
          }
          return res;
        })
        .catch(() =>
          ownMatch(req)
            .then((h) => h || ownMatch(BASE + "offline.html"))
            .then((h) => h || ownMatch(BASE + "index.html"))
        )
    );
    return;
  }

  const keep = cacheable(url);
  e.respondWith(
    ownMatch(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (keep && res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            e.waitUntil(own().then((c) => c.put(req, copy)).catch(() => {}));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
