import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/writing";
import { repsNeeded, vocabCount } from "@/lib/speaking";
import { loadInterviewBest } from "@/lib/interview-practice";
import { actionNote, type Answer, type FeedbackData, type Reflection, type WeekNumbers } from "@/lib/feedback";

type Client = Awaited<ReturnType<typeof createClient>>;
export type WeekPart = { id: string; type: string | null; title: string; href: string };

export type FeedbackLoad = { data: FeedbackData; numbers: WeekNumbers; reflection: Reflection };

/** Week 1's total tries (3 + 2 + 5), used when the Speaking lesson has no content row. */
const SPEAKING_REPS = 10;
const heroTitle = (x: unknown) => {
  const h = (x as { data?: { hero?: { title_a?: unknown; title_b?: unknown } } } | null)?.data?.hero;
  return typeof h?.title_a === "string" ? `${h.title_a} ${typeof h.title_b === "string" ? h.title_b : ""}`.trim() : "";
};

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

  const [{ data: row }, { data: refl }, notes, rprog, sub, phrases, rrefl, proof, sprog, sbest, commit, rc, vc, wc, resc, sc, w1, cap] = await Promise.all([
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
    writing ? supabase.from("writing_content").select("data").eq("lesson_id", writing.id).maybeSingle() : none,
    research ? supabase.from("research_content").select("data").eq("lesson_id", research.id).maybeSingle() : none,
    speaking ? supabase.from("speaking_content").select("data").eq("lesson_id", speaking.id).maybeSingle() : none,
    // Week 10 compares with the week-1 self-check.
    week >= 10
      ? supabase.from("weekly_reflections").select("self_eval, confidence").eq("user_id", userId).eq("course_id", courseId).eq("week", 1).maybeSingle()
      : none,
    // Matt (Capstone brief): a week closes only once its Capstone part (part N = week N) is complete.
    supabase.from("capstone_parts").select("completed_at").eq("user_id", userId).eq("course_id", courseId).eq("part", week).maybeSingle(),
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as FeedbackData;
  // The course close (week 10) points to the AI interview practice and shows the best score per question.
  const interview = data.next?.final ? await loadInterviewBest(supabase, userId) : null;

  const thumbPath = (proof.data as { thumb_path?: string } | null)?.thumb_path;
  const { data: signed } = thumbPath ? await supabase.storage.from("video-proofs").createSignedUrl(thumbPath, 600) : { data: null };

  const s = sub.data as { body: string; status: string } | null;
  const bests = (sbest.data ?? []) as { exercise: number; text: string }[];
  const repsBy = ((sprog.data as { reps?: number[] } | null)?.reps ?? []).map(Number);
  const reps = repsBy.reduce((a, b) => a + b, 0);
  const exercises = (sc.data as { data?: { exercises?: { reps?: number }[] } } | null)?.data?.exercises ?? [];
  // Every exercise has the tries "Terminar la práctica" needs (repsNeeded: Matt's switch in lib/speaking).
  const repsReady = exercises.length ? exercises.every((e, i) => (repsBy[i] ?? 0) >= repsNeeded({ reps: Number(e.reps ?? 0) })) : reps >= SPEAKING_REPS;
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
    writing: { status: (s?.status as WeekNumbers["writing"]["status"]) ?? "none", words: s ? countWords(s.body) : 0, href: writing?.href ?? null, title: heroTitle(wc.data) },
    research: {
      done: !!(rrefl.data as { completed_at?: string } | null)?.completed_at,
      phrases: (phrases.data ?? []).length,
      href: research?.href ?? null,
      title: heroTitle(resc.data),
    },
    video: {
      done: !!thumbPath,
      thumbUrl: signed?.signedUrl ?? null,
      duration: (proof.data as { duration_s?: number } | null)?.duration_s != null ? Number((proof.data as { duration_s: number }).duration_s) : null,
      href: video?.href ?? null,
      title: (vc.data as { data?: { original?: { title?: string } } } | null)?.data?.original?.title ?? video?.title ?? "",
    },
    speaking: {
      done: !!(sprog.data as { completed_at?: string } | null)?.completed_at || repsReady,
      tries: reps,
      quote: [...bests].reverse().find((b) => b.text.trim())?.text ?? null,
      href: speaking?.href ?? null,
      situations: exercises.length || 3,
    },
    commitment: { name: c?.signed_name ?? null, signedAt: c?.signed_at ?? null, href: syllabus?.href ?? null },
    vocabUsed: vocabCount(usedText, vocab),
    week1: null,
    interview,
    capstone: { part: week, done: !!(cap.data as { completed_at?: string | null } | null)?.completed_at },
  };
  const r = refl as { self_eval?: number[]; answers?: string[]; confidence?: number | null; next_goal?: string | null; focus?: string[]; completed_at?: string | null } | null;
  const n = data.statements.length;
  const first = w1.data as { self_eval?: number[] | null; confidence?: number | null } | null;
  if (first) {
    const ev = (first.self_eval ?? []).map(Number);
    // Different statement counts (week 1 has 6, week 10 has 5): compare only the confidence score.
    numbers.week1 = { confidence: first.confidence ?? null, yes: ev.length === n ? ev.filter((x) => x === 0).length : null, of: n };
  }
  // The answers column holds the reflection questions, then the week's action note when it has one.
  const nAnswers = data.questions.length + (actionNote(data) ? 1 : 0);
  return {
    data,
    numbers,
    reflection: {
      self_eval: Array.from({ length: n }, (_, i) => (r?.self_eval?.[i] ?? null) as Answer | null),
      answers: Array.from({ length: nAnswers }, (_, i) => r?.answers?.[i] ?? ""),
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
