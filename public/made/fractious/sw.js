var cacheName = "fractious-v20260108a";

// Cache a very basic selection of resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        return cache.addAll([
          "/made/fractious/",
          "/made/fractious/index.html",
          "/made/fractious/mandel.frag.glsl",
          "/made/fractious/mandel.vert.glsl",
          "/made/fractious/sampler.frag.glsl",
          "/made/fractioussampler.vert.glsl",
        ]);
      })
      .then(() => {
        return self.skipWaiting();
      }),
  );
});

// Clean out old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((existingCacheNames) => {
        return Promise.all(
          existingCacheNames.map((existingCacheName) => {
            if (existingCacheName !== cacheName) {
              return caches.delete(existingCacheName);
            }
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
