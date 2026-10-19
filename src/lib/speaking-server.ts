import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { SpeakingBest, SpeakingData, VocabWord } from "@/lib/speaking";

type Client = Awaited<ReturnType<typeof createClient>>;

export type SpeakingLoad = {
  data: SpeakingData;
  vocab: VocabWord[];
  best: SpeakingBest[];
  reps: number[];
  partner: number[];
  completedAt: string | null;
};

/** The lesson's Speaking Practice, or null when it has none (the lesson then renders as before). Only text and counts
 *  are stored: the best try per exercise (speaking_best) and the rep counts (speaking_progress). */
export async function loadSpeaking(supabase: Client, userId: string, lessonId: string): Promise<SpeakingLoad | null> {
  const [{ data: row }, { data: best }, { data: prog }] = await Promise.all([
    supabase.from("speaking_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("speaking_best").select("exercise, text, duration_s, points").eq("user_id", userId).eq("lesson_id", lessonId),
    supabase.from("speaking_progress").select("reps, partner_feedback, completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as SpeakingData;
  // The week's vocabulary: the Reading lesson's vocab list.
  const { data: reading } = data.vocab_from_lesson_id
    ? await supabase.from("reading_content").select("data").eq("lesson_id", data.vocab_from_lesson_id).maybeSingle()
    : { data: null };
  const v = ((reading?.data as { vocab?: Record<string, { es: string }> } | undefined)?.vocab ?? {}) as Record<string, { es: string }>;
  return {
    data,
    vocab: Object.entries(v).map(([word, x]) => ({ word, es: x.es.split(",")[0].trim() })),
    best: (best ?? []).map((b) => ({ exercise: b.exercise, text: b.text, duration_s: b.duration_s === null ? null : Number(b.duration_s), points: (b.points ?? []).map(Number) })),
    reps: [0, 1, 2].map((i) => Number(prog?.reps?.[i] ?? 0)),
    partner: [0, 1, 2].map((i) => Number(prog?.partner_feedback?.[i] ?? 0)),
    completedAt: prog?.completed_at ?? null,
  };
}
