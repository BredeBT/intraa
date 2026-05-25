// Intraa Service Worker
// Bump CACHE_VERSION ved hver merkbare endring så gamle filer kastes ved installasjon.
const CACHE_VERSION  = "intraa-v1";
const APP_SHELL_NAME = `${CACHE_VERSION}-shell`;
const RUNTIME_NAME   = `${CACHE_VERSION}-runtime`;

// Filer som forhåndshentes ved install — minimum app-skall så siden vises offline.
const APP_SHELL = [
  "/offline",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// ─── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: rydde opp gamle cache-versjoner ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: strategi per resurstype ─────────────────────────────────────────
// Vi vil IKKE cache POST/PATCH/DELETE eller server-actions — bare GET.
// API-kall: network-first (alltid fersk data, men offline-fallback til cache).
// /_next/static/*: cache-first (immutable, hash'a filer).
// HTML/navigering: network-first med /offline-fallback hvis ingen nett.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bare same-origin håndteres
  if (url.origin !== self.location.origin) return;

  // Server-actions, NextAuth, auth-callbacks: alltid nett, aldri cache
  if (
    url.pathname.startsWith("/api/auth/") ||
    url.pathname.includes("/_action") ||
    request.headers.get("next-action")
  ) {
    return;
  }

  // Statisk Next-build (immutable hashes) → cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Statiske bilder/ikoner → cache-first
  if (
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.json" ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API-kall: network-first, fallback til cache (kun GET)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, { fallback: null }));
    return;
  }

  // HTML-sider (navigering): network-first med /offline-fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request, { fallback: "/offline" }));
    return;
  }
});

async function cacheFirst(request) {
  const cache  = await caches.open(RUNTIME_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, { fallback }) {
  const cache = await caches.open(RUNTIME_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh.ok && request.method === "GET") cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) {
      const fb = await caches.match(fallback);
      if (fb) return fb;
    }
    return new Response("Offline", { status: 503 });
  }
}

// ─── Push notifications ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || "/icon-192x192.png",
      badge:   "/icon-192x192.png",
      data:    { url: data.url || "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
});

// Lytter etter beskjed fra appen om umiddelbar aktivering av ny SW.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
