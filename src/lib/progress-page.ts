// Data for Progreso (/app/progreso): stats, XP per day this week, the English level and its history,
// the CelsUS practice-exam panel and the medals.
import type { Client } from "@/lib/supabase/types";
import { accessibleCourses, courseStats, todayIndex, weekIndex } from "@/lib/learning";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Civics topics: the 3 sections of the test, plus the starred (65/20) questions. */
const TOPIC_OF: Record<string, number> = { "American Government": 0, "American History": 1, "Symbols and Holidays": 2 };

export async function loadProgress(supabase: Client, userId: string) {
  const [{ data: profile }, { data: game }, { data: week }, { data: history }, { data: books }, access, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("evaluation_level, evaluation_date").eq("id", userId).maybeSingle(),
    supabase.from("gamification").select("current_streak, longest_streak, total_xp, badges").eq("user_id", userId).maybeSingle(),
    supabase.from("progress").select("xp_earned, last_activity").eq("user_id", userId).gte("last_activity", new Date(Date.now() - 8 * 864e5).toISOString()),
    supabase.rpc("my_evaluation_history"),
    supabase.from("ebook_answers").select("completed_at").eq("user_id", userId).not("completed_at", "is", null),
    accessibleCourses(supabase, userId),
    supabase
      .from("evaluation_attempts")
      .select("score, total, answers, evaluation_id, created_at, evaluation:evaluations(test_version, large_text)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // XP per day, Monday → Sunday, from the lessons touched this week.
  const xpWeek = Array.from({ length: 7 }, () => 0);
  for (const p of week ?? []) {
    const i = p.last_activity ? weekIndex(p.last_activity) : -1;
    if (i >= 0) xpWeek[i] += p.xp_earned ?? 0;
  }

  // CelsUS panel: only for students who have the CelsUS course.
  const { data: brandCourses } = await supabase.from("courses").select("id, slug").in("slug", ["celsus-para-ciudadania", "celstv-english-for-our-generation"]);
  const celsus = brandCourses?.find((c) => c.slug === "celsus-para-ciudadania");
  const celstvId = brandCourses?.find((c) => c.slug === "celstv-english-for-our-generation")?.id;
  const hasCelsus = !!celsus && access.ids.includes(celsus.id);
  const exams = (attempts ?? []).filter((a) => pick(a.evaluation)?.test_version === "2025" && a.total > 0);
  let civics: { best: { score: number; total: number } | null; topics: (number | null)[]; weakest: number | null } | null = null;
  if (hasCelsus) {
    const best = exams.reduce<{ score: number; total: number } | null>((b, a) => (!b || a.score / a.total > b.score / b.total ? { score: a.score, total: a.total } : b), null);
    // Per topic: share of right answers over the last 10 attempts, by question number → section.
    const recent = exams.slice(0, 10);
    const evalIds = [...new Set(recent.map((a) => a.evaluation_id))];
    const { data: qs } = evalIds.length ? await supabase.from("evaluation_questions").select("evaluation_id, is_asterisked, data").in("evaluation_id", evalIds) : { data: [] };
    const meta = new Map((qs ?? []).map((q) => {
      const d = (q.data ?? {}) as { n?: number; section?: string; star?: boolean };
      return [`${q.evaluation_id}:${d.n}`, { topic: TOPIC_OF[d.section ?? ""] ?? -1, star: q.is_asterisked || d.star === true }];
    }));
    const right = [0, 0, 0, 0];
    const asked = [0, 0, 0, 0];
    for (const a of recent) {
      for (const ans of (Array.isArray(a.answers) ? a.answers : []) as { n?: number; ok?: boolean }[]) {
        const m = meta.get(`${a.evaluation_id}:${ans.n}`);
        if (!m) continue;
        for (const k of [m.topic, m.star ? 3 : -1]) {
          if (k < 0) continue;
          asked[k]++;
          if (ans.ok) right[k]++;
        }
      }
    }
    const topics = asked.map((n, i) => (n ? Math.round((right[i] / n) * 100) : null));
    const scored = topics.map((v, i) => [v, i] as const).filter(([v]) => v !== null) as [number, number][];
    civics = { best, topics, weakest: scored.length ? scored.sort((x, y) => x[0] - y[0])[0][1] : null };
  }

  // Medals: stored badges, plus the ones the data already proves.
  const stored = new Set(
    (Array.isArray(game?.badges) ? game.badges : []).map((b) => (typeof b === "string" ? b : typeof b === "object" && b && "id" in b ? String((b as { id: unknown }).id) : "")),
  );
  const levels = (history ?? []).map((h) => LEVELS.indexOf(h.level)).filter((i) => i >= 0);
  const celstv = celstvId && access.ids.includes(celstvId) ? (await courseStats(supabase, userId, [celstvId])).get(celstvId) : undefined;
  const longest = Math.max(game?.longest_streak ?? 0, game?.current_streak ?? 0);
  const earned = new Set(stored);
  if (celstv && celstv.done > 0) earned.add("primer-episodio");
  if (longest >= 7) earned.add("racha-7");
  if (longest >= 30) earned.add("racha-30");
  if ((books ?? []).length >= 3) earned.add("lector");
  if (levels.some((l, i) => i > 0 && l > Math.min(...levels.slice(0, i)))) earned.add("subiste-nivel");
  if (exams.some((a) => a.total === 20 && a.score >= 18)) earned.add("ciudadano-listo");
  if ((game?.total_xp ?? 0) >= 10000) earned.add("imparable");

  const retakeAt = profile?.evaluation_date ? new Date(profile.evaluation_date).getTime() + 30 * 864e5 : 0;
  return {
    streak: game?.current_streak ?? 0,
    totalXp: game?.total_xp ?? 0,
    level: profile?.evaluation_level ?? null,
    xpWeek,
    today: todayIndex(),
    history: (history ?? []).filter((h) => LEVELS.includes(h.level)),
    retakeDays: retakeAt > Date.now() ? Math.ceil((retakeAt - Date.now()) / 864e5) : 0,
    civics,
    earned,
  };
}

export type ProgressData = Awaited<ReturnType<typeof loadProgress>>;
