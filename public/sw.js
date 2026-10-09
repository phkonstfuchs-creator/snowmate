const CACHE_PREFIX = "snowmate-static-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const PRECACHE_ASSETS = ["/logo.png", "/logo-print.png", "/icon.png"];
const PUBLIC_ASSETS = new Set(PRECACHE_ASSETS);
const BUILD_ASSET_PATTERN =
  /^\/_next\/static\/(?:chunks|css|media)\/.+\.(?:avif|css|gif|ico|jpe?g|js|png|webp|woff2?)$/;
const SAFE_DESTINATIONS = new Set(["font", "image", "script", "style"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStaticRequest(request) {
  if (
    request.method !== "GET" ||
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || url.hash) {
    return false;
  }

  if (PUBLIC_ASSETS.has(url.pathname)) {
    return request.destination === "image" || request.destination === "";
  }

  return (
    SAFE_DESTINATIONS.has(request.destination) &&
    BUILD_ASSET_PATTERN.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (!isCacheableStaticRequest(event.request)) {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
