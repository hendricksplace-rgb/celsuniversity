"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Offline e-books: Cache Storage (page, app code, audio) + a manifest the service worker reads,
// mirrored in public.offline_downloads so access is re-checked (renew_offline_downloads) on every reconnect.

export const PAGES = "celsu-pages-v1";
export const ASSETS = "celsu-assets-v1";
export const MEDIA = "celsu-media-v1";
const META = "celsu-meta-v1";
const MANIFEST_KEY = "/__offline/manifest";

export type OfflineBook = { moduleId: string; ebookId: string; expiresAt: string; page: string; media: string[]; bytes: number };
export type Manifest = { userId: string | null; books: Record<string, OfflineBook> };

export const offlineSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

export function deviceId() {
  const key = "celsu:device";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function readManifest(): Promise<Manifest> {
  const res = await (await caches.open(META)).match(MANIFEST_KEY);
  return res ? res.json() : { userId: null, books: {} };
}

async function writeManifest(m: Manifest) {
  await (await caches.open(META)).put(MANIFEST_KEY, new Response(JSON.stringify(m), { headers: { "Content-Type": "application/json" } }));
}

/** Signed Storage URLs change every load; cache audio by object path so any signed URL finds it. */
export function mediaKey(url: string) {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

export async function cachedMediaUrl(url: string): Promise<string | null> {
  if (!offlineSupported()) return null;
  const hit = await (await caches.open(MEDIA)).match(mediaKey(url));
  return hit ? URL.createObjectURL(await hit.blob()) : null;
}

export async function registerServiceWorker() {
  if (!offlineSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** The app code this page needs: every /_next/static file the document loaded. */
function pageAssets() {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => urls.add(s.src));
  document.querySelectorAll<HTMLLinkElement>("link[href]").forEach((l) => urls.add(l.href));
  performance.getEntriesByType("resource").forEach((e) => urls.add(e.name));
  return [...urls].filter((u) => {
    try {
      const p = new URL(u);
      return p.origin === location.origin && p.pathname.startsWith("/_next/static/");
    } catch {
      return false;
    }
  });
}

export async function downloadBook(
  supabase: SupabaseClient,
  opts: { slug: string; ebookId: string; moduleId: string; userId: string; audio: string[] },
): Promise<OfflineBook> {
  await registerServiceWorker();
  const page = `/app/libros/${opts.slug}`;
  let bytes = 0;

  const pageRes = await fetch(page, { credentials: "same-origin" });
  if (!pageRes.ok) throw new Error(`page ${pageRes.status}`);
  bytes += Number(pageRes.headers.get("content-length") ?? 0);
  await (await caches.open(PAGES)).put(page, pageRes);

  const assets = await caches.open(ASSETS);
  for (const a of pageAssets()) {
    if (!(await assets.match(a))) await assets.add(a).catch(() => undefined);
  }

  const media = await caches.open(MEDIA);
  const keys: string[] = [];
  for (const url of opts.audio) {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) continue;
    const blob = await res.blob();
    bytes += blob.size;
    const key = mediaKey(url);
    await media.put(key, new Response(blob, { headers: { "Content-Type": blob.type || "audio/mp4" } }));
    keys.push(key);
  }

  const { data, error } = await supabase
    .from("offline_downloads")
    .upsert(
      {
        user_id: opts.userId,
        module_id: opts.moduleId,
        device_id: deviceId(),
        bytes,
        downloaded_at: new Date().toISOString(),
        last_validated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        removed_at: null,
      },
      { onConflict: "user_id,module_id,device_id" },
    )
    .select("expires_at")
    .single();
  if (error) throw error;

  const book: OfflineBook = { moduleId: opts.moduleId, ebookId: opts.ebookId, expiresAt: data.expires_at, page, media: keys, bytes };
  const manifest = await readManifest();
  await writeManifest({ userId: opts.userId, books: { ...manifest.books, [opts.slug]: book } });
  return book;
}

async function dropFromCache(book: OfflineBook) {
  await (await caches.open(PAGES)).delete(book.page);
  const media = await caches.open(MEDIA);
  await Promise.all(book.media.map((k) => media.delete(k)));
}

export async function removeBook(supabase: SupabaseClient | null, slug: string) {
  const manifest = await readManifest();
  const book = manifest.books[slug];
  if (!book) return;
  await dropFromCache(book);
  const { [slug]: _removed, ...rest } = manifest.books;
  void _removed;
  await writeManifest({ ...manifest, books: rest });
  // Other books may share the module; only mark it removed when none is left.
  if (supabase && !Object.values(rest).some((b) => b.moduleId === book.moduleId)) {
    await supabase
      .from("offline_downloads")
      .update({ removed_at: new Date().toISOString() })
      .eq("module_id", book.moduleId)
      .eq("device_id", deviceId());
  }
}

/** On every reconnect: renew the 7 days, and delete books the student can no longer access. */
export async function renewDownloads(supabase: SupabaseClient, userId: string | null) {
  if (!offlineSupported()) return;
  const manifest = await readManifest();
  const slugs = Object.keys(manifest.books);
  if (!slugs.length) return;
  // Signed out, or a different account on this device: nothing downloaded may stay.
  if (!userId || (manifest.userId && manifest.userId !== userId)) {
    for (const slug of slugs) await removeBook(null, slug);
    return;
  }
  const { data, error } = await supabase.rpc("renew_offline_downloads", { p_device: deviceId() });
  if (error) return; // offline or transient: try again next time
  const rows = new Map((data as { module_id: string; expires_at: string; allowed: boolean }[]).map((r) => [r.module_id, r]));
  const books = { ...manifest.books };
  for (const [slug, book] of Object.entries(manifest.books)) {
    const row = rows.get(book.moduleId);
    if (!row || !row.allowed) {
      await dropFromCache(book);
      delete books[slug];
    } else {
      books[slug] = { ...book, expiresAt: row.expires_at };
    }
  }
  await writeManifest({ userId, books });
}

// ---------- answers written while offline ----------

const PENDING = "celsu:pending:";
export type PendingAnswers = { user_id: string; ebook_id: string; answers: unknown; last_screen: string | null; completed_at: string | null; savedAt: string };

export function keepLocal(row: PendingAnswers) {
  localStorage.setItem(PENDING + row.ebook_id, JSON.stringify(row));
}
export function readLocal(ebookId: string): PendingAnswers | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING + ebookId) ?? "null");
  } catch {
    return null;
  }
}
export function clearLocal(ebookId: string) {
  localStorage.removeItem(PENDING + ebookId);
}

export async function flushPending(supabase: SupabaseClient, userId: string | null) {
  for (const key of Object.keys(localStorage).filter((k) => k.startsWith(PENDING))) {
    const row = JSON.parse(localStorage.getItem(key) ?? "null") as PendingAnswers | null;
    if (!row) continue;
    if (row.user_id !== userId) {
      localStorage.removeItem(key);
      continue;
    }
    const { savedAt: _s, ...dbRow } = row;
    void _s;
    const { error } = await supabase.from("ebook_answers").upsert(dbRow, { onConflict: "user_id,ebook_id" });
    if (!error) localStorage.removeItem(key);
  }
}
