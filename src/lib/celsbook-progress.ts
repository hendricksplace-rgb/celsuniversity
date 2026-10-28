// C-030: the CelsUS CelsBook covers (public-assets/covers/celsus, ebooks.cover_path) and how far a student is in
// each book: the page they're on (ebook_answers.last_screen) out of the book's screens, without downloading them.
import type { Client } from "@/lib/supabase/types";

/**
 * The screen count without downloading the screens (they hold the whole book): the id of each of the
 * first MAX_SCREENS slots, counted where present.
 */
const MAX_SCREENS = 40;
export const SCREEN_PROBE = Array.from({ length: MAX_SCREENS }, (_, i) => `s${i}:screens->${i}->>id`).join(", ");
export const screenCount = (row: object) => Object.entries(row).filter(([k, v]) => /^s\d+$/.test(k) && v != null).length;

const PUBLIC = "storage://public-assets/";

/** A public-assets storage:// ref as its public URL (the covers bucket is public, cached for a year). */
export function coverUrl(ref: string | null | undefined): string | null {
  if (!ref?.startsWith(PUBLIC)) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/${ref.slice(PUBLIC.length)}`;
}

export type BookProgress = { pages: number; page: number; pct: number; done: boolean; started: boolean; updatedAt: string | null };

/** Screen ids in order, from a SCREEN_PROBE row. */
export const screenIds = (row: object) =>
  Object.entries(row)
    .filter(([k, v]) => /^s\d+$/.test(k) && v != null)
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([, v]) => String(v));

export function progressOf(
  ids: string[],
  a: { last_screen: string | null; completed_at: string | null; updated_at?: string | null } | null | undefined,
): BookProgress {
  const pages = ids.length;
  const at = a?.last_screen ? ids.indexOf(a.last_screen) : -1;
  const done = !!a?.completed_at;
  const page = done ? pages : at >= 0 ? at + 1 : 0;
  return { pages, page, pct: done ? 100 : pages ? Math.round((page / pages) * 100) : 0, done, started: done || at >= 0, updatedAt: a?.updated_at ?? null };
}

/** Progress for a set of books (by id). */
export async function bookProgress(supabase: Client, userId: string, ebookIds: string[]) {
  const out = new Map<string, BookProgress>();
  if (!ebookIds.length) return out;
  const [{ data: probes }, { data: answers }] = await Promise.all([
    supabase
      .from("ebooks")
      .select(`id, ${SCREEN_PROBE}` as "id")
      .in("id", ebookIds),
    supabase.from("ebook_answers").select("ebook_id, last_screen, completed_at, updated_at").eq("user_id", userId).in("ebook_id", ebookIds),
  ]);
  const ans = new Map((answers ?? []).map((a) => [a.ebook_id, a]));
  for (const p of probes ?? []) out.set(p.id, progressOf(screenIds(p), ans.get(p.id)));
  return out;
}
