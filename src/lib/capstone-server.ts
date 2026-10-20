import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { CoursePage } from "@/lib/course-page";
import { currentWeekOf, weekPath } from "@/lib/bsns";
import { countWords } from "@/lib/writing";
import { loadInterviewBest, type InterviewBest } from "@/lib/interview-practice";
import { CAPSTONE_PARTS, PITCH_EXERCISE_ORDER, emailToBackground, type CapFields } from "@/lib/capstone";

type Client = Awaited<ReturnType<typeof createClient>>;

export type CapRow = { fields: CapFields; sources: Record<string, string>; completedAt: string | null };
type Missing = { href: string; missing: true };

/** "Ya lo traes de tu semana N": what the week's Writing, Video, Speaking and Research pages already saved. */
export type Evidence = {
  writing: { href: string; id: string; words: number; finished: boolean; body: string } | Missing | null;
  video: { href: string; id: string; thumb: string | null; script: string } | Missing | null;
  speaking: { href: string; id: string; text: string } | Missing | null;
  /** Only a fill source (no evidence card): the Research analysis. */
  research: { id: string; text: string } | null;
};

export type CapstoneLoad = {
  courseId: string;
  slug: string;
  currentWeek: number;
  weekHref: string;
  rows: Record<number, CapRow>;
  /** Per week (1–10), only for weeks already open. */
  evidence: Record<number, Evidence>;
  /** The newest video thumbnail, for the profile header. */
  thumb: string | null;
  prefillName: string;
  phrases: string[];
  /** The AI interview practice's best score per question (certificate checklist, interviewPracticeDone). */
  interview: InterviewBest;
};

/** Writing counts as "terminado" once it left the draft state (the coach step is gone: 'finished'). */
const FINISHED = new Set(["finished", "submitted", "reviewed"]);

/** Everything the Capstone page needs, read as the signed-in student (RLS: own rows only). */
export async function loadCapstone(supabase: Client, page: CoursePage, userId: string, displayName: string | null): Promise<CapstoneLoad> {
  const currentWeek = currentWeekOf(page.episodes.map((e) => ({ n: e.n, done: e.parts.map((p) => p.done) })));
  const open = page.episodes.filter((e) => e.n <= currentWeek && CAPSTONE_PARTS.some((c) => c.week === e.n));
  // The week's lesson of each type; drafts (e.g. Week 4's duplicate Writing lesson) never count.
  const pick = (type: string) =>
    open.flatMap((e) => {
      const p = e.parts.find((x) => x.type === type && !x.draft);
      return p ? [{ week: e.n, p }] : [];
    });
  const writing = pick("writing");
  const video = pick("video_submission");
  const speaking = pick("speaking");
  const research = pick("research");
  const none = Promise.resolve({ data: null });
  const ids = (xs: { p: { id: string } }[]) => xs.map((x) => x.p.id);

  const [{ data: caps }, subs, proofs, bests, entries, refls, { data: bank }, interview] = await Promise.all([
    supabase.from("capstone_parts").select("part, fields, sources, completed_at").eq("user_id", userId).eq("course_id", page.course.id),
    writing.length ? supabase.from("submissions").select("id, lesson_id, body, status").eq("user_id", userId).in("lesson_id", ids(writing)) : none,
    video.length ? supabase.from("video_proofs").select("id, lesson_id, thumb_path, script, updated_at").eq("user_id", userId).in("lesson_id", ids(video)) : none,
    speaking.length ? supabase.from("speaking_best").select("id, lesson_id, exercise, text").eq("user_id", userId).in("lesson_id", ids(speaking)) : none,
    research.length ? supabase.from("research_entries").select("lesson_id, slot, analysis").eq("user_id", userId).in("lesson_id", ids(research)).order("slot") : none,
    research.length ? supabase.from("research_reflections").select("lesson_id, change").eq("user_id", userId).in("lesson_id", ids(research)) : none,
    // "Mis frases" (phrase_bank, owner only), oldest first.
    supabase.from("phrase_bank").select("text").eq("user_id", userId).order("created_at"),
    loadInterviewBest(supabase, userId),
  ]);

  const rows: Record<number, CapRow> = {};
  for (const c of caps ?? [])
    rows[c.part] = {
      fields: (c.fields && typeof c.fields === "object" && !Array.isArray(c.fields) ? c.fields : {}) as CapFields,
      sources: (c.sources && typeof c.sources === "object" && !Array.isArray(c.sources) ? c.sources : {}) as Record<string, string>,
      completedAt: c.completed_at,
    };

  // Video thumbnails: short-lived signed URLs from the private video-proofs bucket (the video never leaves the device).
  const proofRows = (proofs.data ?? []) as { id: string; lesson_id: string; thumb_path: string; script: string | null; updated_at: string }[];
  const signed = new Map(
    await Promise.all(
      proofRows.map(async (v) => {
        const { data } = await supabase.storage.from("video-proofs").createSignedUrl(v.thumb_path, 3600);
        return [v.lesson_id, data?.signedUrl ?? null] as const;
      }),
    ),
  );
  const subRows = (subs.data ?? []) as { id: string; lesson_id: string; body: string; status: string }[];
  const bestRows = (bests.data ?? []) as { id: string; lesson_id: string; exercise: number; text: string }[];
  const entryRows = (entries.data ?? []) as { lesson_id: string; slot: number; analysis: string | null }[];
  const reflRows = (refls.data ?? []) as { lesson_id: string; change: string | null }[];

  const evidence: Record<number, Evidence> = {};
  for (const e of open) {
    const w = writing.find((x) => x.week === e.n)?.p;
    const v = video.find((x) => x.week === e.n)?.p;
    const sp = speaking.find((x) => x.week === e.n)?.p;
    const rs = research.find((x) => x.week === e.n)?.p;
    const sub = w && subRows.find((r) => r.lesson_id === w.id);
    const proof = v && proofRows.find((r) => r.lesson_id === v.id);
    // Speaking: Week 1's pitch is exercise 1 (else 3, else 2); later weeks take their longest best try.
    const tries = sp ? bestRows.filter((r) => r.lesson_id === sp.id && r.text.trim()) : [];
    const best = e.n === 1 ? PITCH_EXERCISE_ORDER.map((n) => tries.find((r) => r.exercise === n)).find(Boolean) : [...tries].sort((a, b) => b.text.length - a.text.length)[0];
    // Research: the analysis of each source (slot 1, then 2), else the reflection's "what I'll change".
    const analysis = rs
      ? entryRows
          .filter((r) => r.lesson_id === rs.id && r.analysis?.trim())
          .map((r) => r.analysis!.trim())
          .join("\n\n") || (reflRows.find((r) => r.lesson_id === rs.id)?.change ?? "").trim()
      : "";
    evidence[e.n] = {
      writing: w
        ? sub && sub.body.trim()
          ? { href: w.href, id: sub.id, words: countWords(sub.body), finished: FINISHED.has(sub.status), body: emailToBackground(sub.body) }
          : { href: w.href, missing: true }
        : null,
      video: v ? (proof ? { href: v.href, id: proof.id, thumb: signed.get(v.id) ?? null, script: (proof.script ?? "").trim() } : { href: v.href, missing: true }) : null,
      speaking: sp ? (best ? { href: sp.href, id: best.id, text: best.text.trim() } : { href: sp.href, missing: true }) : null,
      research: rs && analysis ? { id: rs.id, text: analysis } : null,
    };
  }
  const newest = [...proofRows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  return {
    courseId: page.course.id,
    slug: page.course.slug,
    currentWeek,
    weekHref: weekPath(page.course.slug, currentWeek),
    rows,
    evidence,
    thumb: newest ? (signed.get(newest.lesson_id) ?? null) : null,
    prefillName: (displayName ?? "").trim(),
    phrases: [...new Set((bank ?? []).map((b) => b.text))],
    interview,
  };
}

/** Week page: the parts whose completed_at is set (the week's Capstone milestone is done only then). */
export async function completedCapstoneParts(supabase: Client, userId: string, courseId: string) {
  const { data } = await supabase.from("capstone_parts").select("part").eq("user_id", userId).eq("course_id", courseId).not("completed_at", "is", null);
  return new Set((data ?? []).map((r) => r.part));
}
