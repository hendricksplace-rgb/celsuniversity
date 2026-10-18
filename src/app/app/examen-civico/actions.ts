"use server";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";
import { loadExam, signExamAudio } from "@/lib/civics-server";

/** Fresh signed audio URLs for a long exam session (they last 10 minutes). Access is checked again. */
export async function refreshExamAudio(evaluationId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return {};
  const loaded = await loadExam(supabase, viewer, evaluationId);
  if (!loaded) return {};
  return signExamAudio(supabase, viewer, loaded.exam, loaded.courseId);
}
