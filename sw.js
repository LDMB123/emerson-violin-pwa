const CACHE_NAME = "violin-pwa-v16";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192-maskable.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-120.png",
  "./assets/icons/icon-152.png",
  "./assets/icons/icon-167.png",
  "./assets/icons/icon-180.png",
  "./assets/fonts/fraunces-vf.woff2",
  "./assets/fonts/nunito-vf.woff2",
  "./assets/illustrations/kawaii-pattern.svg",
  "./assets/illustrations/sticker-panda.svg",
  "./assets/illustrations/sticker-violin.svg",
  "./assets/illustrations/sticker-star.svg",
  "./assets/illustrations/sticker-bow.svg",
  "./assets/illustrations/sticker-badge-bow.svg",
  "./assets/illustrations/sticker-badge-rhythm.svg",
  "./assets/illustrations/sticker-badge-focus.svg",
  "./assets/illustrations/sticker-badge-brave.svg",
  "./assets/illustrations/mascot-panda-violin.svg",
  "./assets/illustrations/mascot-panda-cheer.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached)
    )
  );
});
