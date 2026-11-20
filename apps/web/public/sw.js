// Brain Gym service worker.
//
// Goal: open instantly from the iPad home screen and survive a flaky
// connection. The app shell and hashed assets are cached; API calls
// always go to the network (progress must be live and never stale).
//
// Note: browsers only run service workers on HTTPS (or localhost).
// Serve Brain Gym through `tailscale serve` to get HTTPS on the tailnet.

const VERSION = "v1";
const SHELL = `brain-gym-shell-${VERSION}`;
const RUNTIME = `brain-gym-runtime-${VERSION}`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data: never cache.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // Page loads: network first so deploys show up, cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Everything else (icons, avatars, sounds, Google Fonts): serve cached,
  // refresh in the background.
  event.respondWith(
    caches.open(RUNTIME).then((cache) =>
      cache.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok || res.type === "opaque") cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    )
  );
});
