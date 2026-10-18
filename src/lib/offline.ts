"use client";

import type { Client } from "@/lib/supabase/types";
import type { Answers } from "@/lib/ebook-format";

// Offline e-books: Cache Storage (page, app code, audio) + a manifest the service worker reads,
// mirrored in public.offline_downloads so access is re-checked (renew_offline_downloads) on every reconnect.

export const PAGES = "celsu-pages-v1";
export const ASSETS = "celsu-assets-v1";
export const MEDIA = "celsu-media-v1";
const META = "celsu-meta-v1";
const MANIFEST_KEY = "/__offline/manifest";
/** Who is signed in on this device, as last seen online; the service worker serves books only to their owner. */
const USER_KEY = "/__offline/user";
const PENDING = "celsu:pending:";

/** A download: an e-book (one page) or a whole episode (`pages`: the episode and its parts, never the video). */
export type OfflineBook = { moduleId: string; ebookId: string; expiresAt: string; page: string; pages?: string[]; media: string[]; bytes: number };
export type Manifest = { userId: string | null; books: Record<string, OfflineBook> };

export const offlineSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

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

/**
 * Everything user-specific goes: downloaded pages (they carry the student's own answers), audio,
 * the manifest and unsent answers. Whole caches are deleted, so half-finished downloads go too.
 */
export async function wipeOffline() {
  if (!offlineSupported()) return;
  await Promise.all([PAGES, MEDIA, META].map((c) => caches.delete(c)));
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PENDING))
    .forEach((k) => localStorage.removeItem(k));
}

export async function setOfflineUser(userId: string | null) {
  const meta = await caches.open(META);
  if (userId) await meta.put(USER_KEY, new Response(JSON.stringify({ userId })));
  else await meta.delete(USER_KEY);
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

export async function downloadBook(supabase: Client, opts: { slug: string; ebookId: string; moduleId: string; userId: string; audio: string[] }): Promise<OfflineBook> {
  await registerServiceWorker();
  const page = `/app/libros/${opts.slug}`;
  let bytes = 0;
  const keys: string[] = [];
  const before = await readManifest();
  if (before.userId && before.userId !== opts.userId) await wipeOffline();
  // Owner first, so anything cached below is always attributable (and wiped with the rest).
  await writeManifest({ userId: opts.userId, books: before.userId === opts.userId ? before.books : {} });

  try {
    const pageRes = await fetch(page, { credentials: "same-origin" });
    if (!pageRes.ok) throw new Error(`page ${pageRes.status}`);
    bytes += Number(pageRes.headers.get("content-length") ?? 0);
    await (await caches.open(PAGES)).put(page, pageRes);

    const assets = await caches.open(ASSETS);
    for (const a of pageAssets()) {
      if (!(await assets.match(a))) await assets.add(a).catch(() => undefined);
    }

    const media = await caches.open(MEDIA);
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
  } catch (err) {
    // Don't leave a half-downloaded book behind.
    await dropFromCache({ moduleId: opts.moduleId, ebookId: opts.ebookId, expiresAt: "", page, media: keys, bytes });
    throw err;
  }
}

/** Audio and image files a downloaded page points to (signed Storage URLs). Video is never downloaded. */
function mediaIn(html: string) {
  const urls = new Set<string>();
  for (const m of html.matchAll(/https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/(?:sign|public)\/[^"'\s<>]+/gi)) {
    const url = m[0].replace(/&amp;/g, "&");
    if (/\.(mp3|m4a|aac|wav|ogg|oga|webm|png|jpe?g|webp|gif|svg)(\?|$)/i.test(new URL(url).pathname + "?")) urls.add(url);
  }
  return [...urls];
}

/**
 * Whole episode for 7 days: the episode screen and each part's page (not the video), their app code
 * and the audio and images they use. `key` is the episode path.
 */
export async function downloadEpisode(
  supabase: Client,
  opts: { key: string; moduleId: string; userId: string; pages: string[]; onProgress?: (done: number, total: number) => void },
): Promise<OfflineBook> {
  await registerServiceWorker();
  const before = await readManifest();
  if (before.userId && before.userId !== opts.userId) await wipeOffline();
  await writeManifest({ userId: opts.userId, books: before.userId === opts.userId ? before.books : {} });
  let bytes = 0;
  const keys: string[] = [];
  const book: OfflineBook = { moduleId: opts.moduleId, ebookId: "", expiresAt: "", page: opts.key, pages: opts.pages, media: keys, bytes: 0 };
  try {
    const pages = await caches.open(PAGES);
    const media = new Set<string>();
    let step = 0;
    const total = opts.pages.length * 2;
    for (const page of opts.pages) {
      const res = await fetch(page, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`page ${res.status}`);
      const html = await res.clone().text();
      bytes += html.length;
      mediaIn(html).forEach((u) => media.add(u));
      await pages.put(page, res);
      opts.onProgress?.(++step, total);
    }
    const assets = await caches.open(ASSETS);
    for (const a of pageAssets()) if (!(await assets.match(a))) await assets.add(a).catch(() => undefined);
    const store = await caches.open(MEDIA);
    const list = [...media];
    for (const [i, url] of list.entries()) {
      const res = await fetch(url, { mode: "cors" }).catch(() => null);
      if (res?.ok) {
        const blob = await res.blob();
        bytes += blob.size;
        const key = mediaKey(url);
        await store.put(key, new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } }));
        keys.push(key);
      }
      opts.onProgress?.(opts.pages.length + Math.round(((i + 1) / list.length) * opts.pages.length), total);
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
    const done: OfflineBook = { ...book, expiresAt: data.expires_at, bytes };
    const manifest = await readManifest();
    await writeManifest({ userId: opts.userId, books: { ...manifest.books, [opts.key]: done } });
    return done;
  } catch (err) {
    await dropFromCache(book);
    throw err;
  }
}

export async function offlineEntry(key: string): Promise<OfflineBook | null> {
  if (!offlineSupported()) return null;
  const manifest = await readManifest();
  const book = manifest.books[key];
  return book && new Date(book.expiresAt).getTime() > Date.now() ? book : null;
}

async function dropFromCache(book: OfflineBook) {
  const pages = await caches.open(PAGES);
  await Promise.all([book.page, ...(book.pages ?? [])].map((p) => pages.delete(p)));
  const media = await caches.open(MEDIA);
  await Promise.all(book.media.map((k) => media.delete(k)));
}

export async function removeBook(supabase: Client | null, slug: string) {
  const manifest = await readManifest();
  const book = manifest.books[slug];
  if (!book) return;
  await dropFromCache(book);
  const { [slug]: _removed, ...rest } = manifest.books;
  void _removed;
  await writeManifest({ ...manifest, books: rest });
  // Other books may share the module; only mark it removed when none is left.
  if (supabase && !Object.values(rest).some((b) => b.moduleId === book.moduleId)) {
    await supabase.from("offline_downloads").update({ removed_at: new Date().toISOString() }).eq("module_id", book.moduleId).eq("device_id", deviceId());
  }
}

/** On every reconnect: renew the 7 days, and delete books the student can no longer access. */
export async function renewDownloads(supabase: Client, userId: string | null) {
  if (!offlineSupported()) return;
  await setOfflineUser(userId);
  const manifest = await readManifest();
  // Signed out, or a different account on this device: nothing downloaded may stay.
  if (manifest.userId && manifest.userId !== userId) {
    await wipeOffline();
    if (userId) await setOfflineUser(userId);
    return;
  }
  if (!userId || !Object.keys(manifest.books).length) return;
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

export type PendingAnswers = { user_id: string; ebook_id: string; answers: Answers; last_screen: string | null; completed_at: string | null; savedAt: string };

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

export async function flushPending(supabase: Client, userId: string | null) {
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

// ---------- parts finished while offline ----------

const DONE = "celsu:lessondone:";

/** Record a finished part; offline (or on a network error) it waits in localStorage until the next sync. */
export async function finishLesson(supabase: Client, userId: string, lessonId: string): Promise<{ xp: number; queued: boolean }> {
  const { data, error } = navigator.onLine ? await supabase.rpc("record_lesson_progress", { p_lesson: lessonId, p_finish: true }) : { data: null, error: true };
  if (!error && data) return { xp: (data as { xp: number }).xp ?? 0, queued: false };
  localStorage.setItem(DONE + lessonId, JSON.stringify({ userId, at: new Date().toISOString() }));
  return { xp: 0, queued: true };
}

export async function flushFinishedLessons(supabase: Client, userId: string | null) {
  for (const key of Object.keys(localStorage).filter((k) => k.startsWith(DONE))) {
    const row = JSON.parse(localStorage.getItem(key) ?? "null") as { userId: string } | null;
    if (!row || row.userId !== userId) {
      localStorage.removeItem(key);
      continue;
    }
    const { error } = await supabase.rpc("record_lesson_progress", { p_lesson: key.slice(DONE.length), p_finish: true });
    if (!error) localStorage.removeItem(key);
  }
}
