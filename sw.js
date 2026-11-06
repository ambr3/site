const CACHE = "seclusa-site-v15.11";
const BASE = self.location.pathname.replace(/\/[^/]*$/, "/");
const V = "15.11";

/**
 * Whether a URL is one this worker is allowed to keep a copy of.
 *
 * Only two shapes are cacheable: no query at all, and the exact `?v=` stamp
 * this file emits for cache-busting. Any other query is still fetched — it is
 * never written down — so a crafted `?v=` cannot fill the cache with copies.
 *
 * `URL.search` includes the leading `?`, so the stamp check must too.
 */
function cacheable(url) {
  return url.search === "" || url.search === "?v=" + V;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

// The fallback document is served under the failed URL. Relative links would
// resolve against that URL, so pin them to this worker's scope with <base>.
function withBase(html) {
  if (/<base[\s/>]/i.test(html)) return html;
  const baseHref = escapeAttr(new URL(BASE, self.location.origin).href);
  return html.replace(/<head[^>]*>/i, (open) => open + '<base href="' + baseHref + '">');
}

function asPage(res) {
  if (!res) return Promise.resolve(null);
  return res.text().then(
    (html) =>
      new Response(withBase(html), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
  );
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
  BASE + "icons/apple-touch-icon.png?v=" + V,
  BASE + "icons/weather-glyph.png",
  BASE + "icons/notes-glyph.png",
  BASE + "icons/calendar-glyph.png",
  BASE + "icons/games-glyph.png",
  BASE + "icons/blood-pressure-glyph.png",
  BASE + "icons/convert-glyph.png",
  BASE + "icons/privacy-glyph.png",
  BASE + "icons/email.svg",
  BASE + "icons/github.svg",
  BASE + "icons/matrix.svg",
  BASE + "fonts/CascadiaMono.ttf",
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
      .then(() => caches.open(CACHE))
      .then((cache) =>
        cache.keys().then((reqs) =>
          Promise.all(
            reqs.map((req) => {
              try {
                const u = new URL(req.url);
                if (u.origin === self.location.origin && u.search && !cacheable(u)) {
                  return cache.delete(req);
                }
              } catch (_) { /* ignore a bad cache key */ }
              return false;
            })
          )
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
          if (keep && res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            e.waitUntil(own().then((c) => c.put(url.href, copy)).catch(() => {}));
          }
          return res;
        })
        .catch(() =>
          ownMatch(req).then((hit) => {
            if (hit) return hit;
            return ownMatch(BASE + "offline.html")
              .then((res) => res || ownMatch(BASE + "index.html"))
              .then(asPage)
              .then(
                (page) =>
                  page ||
                  new Response("Offline", {
                    status: 503,
                    headers: {
                      "Content-Type": "text/plain; charset=utf-8",
                      "Cache-Control": "no-store",
                    },
                  })
              );
          })
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
            e.waitUntil(own().then((c) => c.put(url.href, copy)).catch(() => {}));
          }
          return res;
        })
        .catch(() => hit || new Response("", { status: 504, statusText: "Gateway Timeout" }));
      return hit || net;
    }).catch(() => new Response("", { status: 504, statusText: "Gateway Timeout" }))
  );
});
