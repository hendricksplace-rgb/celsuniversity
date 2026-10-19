import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/writing";
import { vocabCount } from "@/lib/speaking";
import type { Answer, FeedbackData, Reflection, WeekNumbers } from "@/lib/feedback";

type Client = Awaited<ReturnType<typeof createClient>>;
export type WeekPart = { id: string; type: string | null; title: string; href: string };

export type FeedbackLoad = { data: FeedbackData; numbers: WeekNumbers; reflection: Reflection };

const SPEAKING_REPS = 10;

/** The lesson's "Close your week" page, or null when it has none. "Tu semana en números" only reads rows the other
 *  week pages already saved, as the signed-in student under RLS. weekly_reflections is owner-only. */
export async function loadFeedback(supabase: Client, userId: string, lessonId: string, courseId: string, week: number, parts: WeekPart[]): Promise<FeedbackLoad | null> {
  const find = (type: string, not?: RegExp) => parts.find((x) => x.type === type && !(not && not.test(x.title))) ?? null;
  const reading = find("reading", /syllabus/i);
  const syllabus = parts.find((x) => /syllabus/i.test(x.title)) ?? null;
  const writing = find("writing");
  const research = find("research");
  const video = find("video_submission");
  const speaking = find("speaking");
  const none = Promise.resolve({ data: null });

  const [{ data: row }, { data: refl }, notes, rprog, sub, phrases, rrefl, proof, sprog, sbest, commit, rc, vc] = await Promise.all([
    supabase.from("feedback_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("weekly_reflections").select("self_eval, answers, confidence, next_goal, focus, completed_at").eq("user_id", userId).eq("course_id", courseId).eq("week", week).maybeSingle(),
    reading ? supabase.from("reading_notes").select("body").eq("user_id", userId).eq("lesson_id", reading.id) : none,
    reading ? supabase.from("reading_progress").select("completed_at").eq("user_id", userId).eq("lesson_id", reading.id).maybeSingle() : none,
    writing ? supabase.from("submissions").select("body, status").eq("user_id", userId).eq("lesson_id", writing.id).maybeSingle() : none,
    research ? supabase.from("phrase_bank").select("id").eq("user_id", userId).eq("lesson_id", research.id) : none,
    research ? supabase.from("research_reflections").select("completed_at").eq("user_id", userId).eq("lesson_id", research.id).maybeSingle() : none,
    video ? supabase.from("video_proofs").select("thumb_path, duration_s").eq("user_id", userId).eq("lesson_id", video.id).maybeSingle() : none,
    speaking ? supabase.from("speaking_progress").select("reps, completed_at").eq("user_id", userId).eq("lesson_id", speaking.id).maybeSingle() : none,
    speaking ? supabase.from("speaking_best").select("exercise, text").eq("user_id", userId).eq("lesson_id", speaking.id).order("exercise") : none,
    supabase.from("course_commitments").select("signed_name, signed_at").eq("user_id", userId).eq("course_id", courseId).maybeSingle(),
    reading ? supabase.from("reading_content").select("data").eq("lesson_id", reading.id).maybeSingle() : none,
    video ? supabase.from("video_task_content").select("data").eq("lesson_id", video.id).maybeSingle() : none,
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as FeedbackData;

  const thumbPath = (proof.data as { thumb_path?: string } | null)?.thumb_path;
  const { data: signed } = thumbPath ? await supabase.storage.from("video-proofs").createSignedUrl(thumbPath, 600) : { data: null };

  const s = sub.data as { body: string; status: string } | null;
  const bests = (sbest.data ?? []) as { exercise: number; text: string }[];
  const reps = ((sprog.data as { reps?: number[] } | null)?.reps ?? []).reduce((a, b) => a + Number(b), 0);
  const vocab = Object.entries(((rc.data as { data?: { vocab?: Record<string, { es: string }> } } | null)?.data?.vocab ?? {}) as Record<string, { es: string }>).map(([word, v]) => ({ word, es: v.es }));
  const usedText = [s?.body ?? "", ...bests.map((b) => b.text)].join("\n");
  const c = commit.data;

  const numbers: WeekNumbers = {
    reading: {
      done: !!(rprog.data as { completed_at?: string } | null)?.completed_at,
      notes: ((notes.data ?? []) as { body: string }[]).filter((n) => n.body.trim()).length,
      href: reading?.href ?? null,
      title: ((rc.data as { data?: { original?: { title?: string } } } | null)?.data?.original?.title ?? reading?.title ?? "").split(":")[0],
    },
    writing: { status: (s?.status as WeekNumbers["writing"]["status"]) ?? "none", words: s ? countWords(s.body) : 0, href: writing?.href ?? null },
    research: { done: !!(rrefl.data as { completed_at?: string } | null)?.completed_at, phrases: (phrases.data ?? []).length, href: research?.href ?? null },
    video: {
      done: !!thumbPath,
      thumbUrl: signed?.signedUrl ?? null,
      duration: (proof.data as { duration_s?: number } | null)?.duration_s != null ? Number((proof.data as { duration_s: number }).duration_s) : null,
      href: video?.href ?? null,
      title: (vc.data as { data?: { original?: { title?: string } } } | null)?.data?.original?.title ?? video?.title ?? "",
    },
    speaking: {
      done: !!(sprog.data as { completed_at?: string } | null)?.completed_at || reps >= SPEAKING_REPS,
      tries: reps,
      quote: [...bests].reverse().find((b) => b.text.trim())?.text ?? null,
      href: speaking?.href ?? null,
    },
    commitment: { name: c?.signed_name ?? null, signedAt: c?.signed_at ?? null, href: syllabus?.href ?? null },
    vocabUsed: vocabCount(usedText, vocab),
  };
  const r = refl as { self_eval?: number[]; answers?: string[]; confidence?: number | null; next_goal?: string | null; focus?: string[]; completed_at?: string | null } | null;
  const n = data.statements.length;
  return {
    data,
    numbers,
    reflection: {
      self_eval: Array.from({ length: n }, (_, i) => (r?.self_eval?.[i] ?? null) as Answer | null),
      answers: Array.from({ length: data.questions.length }, (_, i) => r?.answers?.[i] ?? ""),
      confidence: r?.confidence ?? null,
      next_goal: r?.next_goal ?? "",
      focus: (r?.focus ?? []).map((f) => data.focus_options.en.indexOf(f)).filter((i) => i >= 0),
      completed_at: r?.completed_at ?? null,
    },
  };
}

/** Week N's hero: the goal the student wrote when closing week N-1 (weekly_reflections, owner only). */
export async function previousWeekGoal(supabase: Client, userId: string, courseId: string, week: number) {
  if (week < 2) return null;
  const { data } = await supabase.from("weekly_reflections").select("next_goal").eq("user_id", userId).eq("course_id", courseId).eq("week", week - 1).maybeSingle();
  return data?.next_goal?.trim() || null;
}
