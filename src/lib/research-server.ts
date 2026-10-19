import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { emptyEntry, type Phrase, type ResearchData, type ResearchEntry } from "@/lib/research";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ResearchLoad = {
  data: ResearchData;
  entries: ResearchEntry[];
  reflection: { field: string; patterns: number[]; change: string; completedAt: string | null };
  phrases: Phrase[];
};

/** The lesson's Interactive Research Task, or null when it has none (the lesson then renders as before).
 *  research_content's RLS lets in staff and students with access; entries, reflection and phrases are the student's own. */
export async function loadResearch(supabase: Client, userId: string, lessonId: string): Promise<ResearchLoad | null> {
  // One round trip: the content and the student's rows together.
  const [{ data: row }, { data: rows }, { data: refl }, { data: bank }] = await Promise.all([
    supabase.from("research_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("research_entries").select("slot, source_type, url, who, field, share, tone, borrow, liked, analysis").eq("user_id", userId).eq("lesson_id", lessonId),
    supabase.from("research_reflections").select("field, patterns, change, completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("phrase_bank").select("id, text, source, lesson_id").eq("user_id", userId).order("created_at"),
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as ResearchData;
  const entries = Array.from({ length: data.min_examples ?? 2 }, (_, i) => {
    const r = (rows ?? []).find((x) => x.slot === i + 1);
    return r
      ? {
          ...emptyEntry(i + 1),
          source_type: r.source_type,
          url: r.url ?? "",
          who: r.who ?? "",
          field: r.field ?? "",
          share: (r.share ?? []).map(Number),
          tone: (r.tone ?? []).map(Number),
          borrow: r.borrow ?? "",
          liked: r.liked ?? "",
          analysis: r.analysis ?? "",
        }
      : emptyEntry(i + 1);
  });
  return {
    data,
    entries,
    reflection: { field: refl?.field ?? "", patterns: (refl?.patterns ?? []).map(Number), change: refl?.change ?? "", completedAt: refl?.completed_at ?? null },
    phrases: bank ?? [],
  };
}
