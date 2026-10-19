import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ReadingData, ReadingState } from "@/lib/reading";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ReadingLoad = {
  data: ReadingData;
  notes: Record<string, string>;
  state: ReadingState;
  completedAt: string | null;
};

/** The lesson's Interactive Reading, or null when it has none (the lesson then renders as before).
 *  reading_content's RLS lets in staff and students with access to the course; notes are the student's own. */
export async function loadReading(supabase: Client, userId: string, lessonId: string): Promise<ReadingLoad | null> {
  // One round trip: the content and the student's rows together.
  const [{ data: row }, { data: notes }, { data: progress }] = await Promise.all([
    supabase.from("reading_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("reading_notes").select("block_id, body").eq("user_id", userId).eq("lesson_id", lessonId),
    supabase.from("reading_progress").select("state, completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (!row?.data) return null;
  return {
    data: row.data as unknown as ReadingData,
    notes: Object.fromEntries((notes ?? []).map((n) => [n.block_id, n.body])),
    state: ((progress?.state ?? {}) as ReadingState) || {},
    completedAt: progress?.completed_at ?? null,
  };
}
