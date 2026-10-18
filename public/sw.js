/* CelsU service worker: offline use of downloaded e-books and episodes (text, audio, images; never video).
 * The page decides what to download (src/lib/offline.ts); this worker only serves it back.
 * Expiry is enforced here from the manifest, which the app renews on every reconnect. */
const PAGES = "celsu-pages-v1";
const ASSETS = "celsu-assets-v1";
const META = "celsu-meta-v1";
const MANIFEST_KEY = "/__offline/manifest";
const USER_KEY = "/__offline/user";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Build assets never change for a given URL: cache-first, fill on the fly.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Downloaded episodes (the episode screen and its parts): same rules as e-books.
  if (req.mode === "navigate" && url.pathname.startsWith("/app/cursos/")) {
    event.respondWith(
      fetch(req).catch(async () => {
        const manifest = await readManifest();
        const user = await readJson(USER_KEY);
        if (!manifest.userId || manifest.userId !== user?.userId) return offlinePage("missing");
        const book = Object.values(manifest.books || {}).find((b) => (b.pages || []).includes(url.pathname));
        if (!book) return offlinePage("missing");
        if (new Date(book.expiresAt).getTime() < Date.now()) return offlinePage("expired");
        const page = await (await caches.open(PAGES)).match(url.pathname);
        return page || offlinePage("missing");
      }),
    );
    return;
  }

  // E-book pages: always the network when online; the downloaded copy only when offline and not expired.
  if (req.mode === "navigate" && url.pathname.startsWith("/app/libros/")) {
    event.respondWith(
      fetch(req).catch(async () => {
        const slug = decodeURIComponent(url.pathname.split("/")[3] || "");
        const manifest = await readManifest();
        // Only the account that downloaded the book, and only while it is the one signed in here.
        const user = await readJson(USER_KEY);
        if (!manifest.userId || manifest.userId !== user?.userId) return offlinePage("missing");
        const book = manifest.books?.[slug];
        if (!book) return offlinePage("missing");
        if (new Date(book.expiresAt).getTime() < Date.now()) return offlinePage("expired");
        const page = await (await caches.open(PAGES)).match(url.pathname);
        return page || offlinePage("missing");
      }),
    );
  }
});

async function readJson(key) {
  const res = await (await caches.open(META)).match(key);
  return res ? res.json().catch(() => null) : null;
}

async function readManifest() {
  return (await readJson(MANIFEST_KEY)) || { books: {} };
}

function offlinePage(reason) {
  const msg =
    reason === "expired"
      ? ["Tu descarga venció", "Conéctate a internet y abre CelsU para renovarla por 7 días más.", "Your download expired. Go online and open CelsU to renew it for 7 more days."]
      : ["Sin conexión", "Esto no está descargado. Conéctate a internet para abrirlo.", "You're offline and this isn't downloaded."];
  return new Response(
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${msg[0]} · CelsU</title><body style="font-family:system-ui,sans-serif;background:#12101f;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;text-align:center">
<div><h1>📵 ${msg[0]}</h1><p>${msg[1]}</p><p style="opacity:.6;font-size:.9em">${msg[2]}</p></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
