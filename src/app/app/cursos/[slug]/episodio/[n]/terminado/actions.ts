"use server";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";
import { episodeStatus } from "@/lib/episode-status";

/**
 * Call after any CelsUS part is finished (video, flashcards, book, audio, class or quiz): when that was the last
 * missing part, `complete` is true and `href` is the completion screen (state B); otherwise `href` is the episode.
 */
export async function afterPartFinished(courseSlug: string, n: number): Promise<{ complete: boolean; href: string; done: number; total: number }> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return { complete: false, href: "/app", done: 0, total: 0 };
  const s = await episodeStatus(supabase, viewer.user.id, courseSlug, n, viewer.isStaff);
  if (!s) return { complete: false, href: "/app/cursos", done: 0, total: 0 };
  return { complete: s.complete, href: s.complete ? s.completionHref : s.episodeHref, done: s.done, total: s.total };
}
