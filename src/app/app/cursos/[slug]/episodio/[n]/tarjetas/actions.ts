"use server";

import { createClient } from "@/lib/supabase/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadCoursePage } from "@/lib/course-page";
import { themeForCourse } from "@/lib/themes";
import { signStorageRefs } from "@/lib/storage";
import { deckAudioRefs, loadEpisodeDecks, tracksFromDecks } from "@/lib/celsus-cards";

/** Saves the student's exam track (A, B or C) on their own profile (RLS: own row). */
export async function setCivicsTrack(track: string): Promise<boolean> {
  if (track !== "A" && track !== "B" && track !== "C") return false;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return false;
  const { error } = await supabase.from("profiles").update({ civics_track: track }).eq("id", viewer.user.id);
  return !error;
}

/** Fresh signed URLs for an episode's card audio (they last 10 minutes). Access is checked again. */
export async function refreshCardsAudio(courseSlug: string, n: number): Promise<Record<string, string>> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return {};
  const page = await loadCoursePage(supabase, viewer.user.id, courseSlug, themeForCourse({ slug: courseSlug }), viewer.isStaff);
  const part = page?.episodes.find((e) => e.n === n)?.parts.find((p) => p.role === "cards");
  if (!page || !part || !(await canAccessCourse(supabase, viewer, page.course.id))) return {};
  const { en, es } = await loadEpisodeDecks(supabase, part.id);
  const signed = await signStorageRefs(supabase, deckAudioRefs(tracksFromDecks(en, es)), { courseId: page.course.id, viewer, access: true });
  return Object.fromEntries(signed);
}
