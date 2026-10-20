"use server";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";
import { episodeStatus } from "@/lib/episode-status";
import type { UsRole } from "@/lib/course-page";

/**
 * Call after any CelsUS part is finished (video, flashcards, book, audio, class or quiz): when that was the last
 * missing part, `complete` is true and `href` is the completion screen (state B); otherwise `href` is the episode.
 * `next` is the first part still to do. Track C (65/20) skips the quiz: it counts as done here, so their episode
 * completes with the other five parts.
 */
export async function afterPartFinished(
  courseSlug: string,
  n: number,
): Promise<{ complete: boolean; href: string; done: number; total: number; next: { role: UsRole; href: string; index: number } | null }> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return { complete: false, href: "/app", done: 0, total: 0, next: null };
  let s = await episodeStatus(supabase, viewer.user.id, courseSlug, n, viewer.isStaff);
  if (!s) return { complete: false, href: "/app/cursos", done: 0, total: 0, next: null };
  const quiz = s.parts.find((p) => p.role === "quiz");
  if (quiz && !quiz.done && !quiz.draft) {
    const { data: me } = await supabase.from("profiles").select("civics_track").eq("id", viewer.user.id).maybeSingle();
    if (me?.civics_track === "C") {
      const { error } = await supabase.rpc("record_lesson_progress", { p_lesson: quiz.id, p_finish: true });
      if (!error) s = (await episodeStatus(supabase, viewer.user.id, courseSlug, n, viewer.isStaff)) ?? s;
    }
  }
  return { complete: s.complete, href: s.complete ? s.completionHref : s.episodeHref, done: s.done, total: s.total, next: s.next };
}
