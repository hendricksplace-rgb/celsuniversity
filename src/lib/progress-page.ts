// Data for Progreso (/app/progreso): the stat tiles, the road map and the program card for each program
// the student is enrolled in, XP per day this week, the English level (with per-skill levels and history),
// the CelsUS practice-exam panel and the medals.
import type { Client } from "@/lib/supabase/types";
import { accessibleCourses, courseStats, todayIndex, weekIndex, type CourseStats } from "@/lib/learning";
import { liveStreak, liveWeeklyXp, nextMedalOf, weeklyGoalOf } from "@/lib/home";
import { ROUTE_CARDS, hrefOf } from "@/lib/my-courses";
import { ROUTE_PROGRAM } from "@/lib/route";
import { activeWeekOf } from "@/lib/bsns";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const frac = (done: number, total: number) => (total ? done / total : 0);

/** Civics topics: the 3 sections of the test, plus the starred (65/20) questions. */
const TOPIC_OF: Record<string, number> = { "American Government": 0, "American History": 1, "Symbols and Holidays": 2 };
/** The score CelsU asks for before the interview (the real test passes at 12 of 20). */
export const CIVICS_GOAL = 18;
/** CelsTV episodes in the series; modules past this ("Episode 33–40") are empty placeholders. */
const TV_EPISODES = 32;
const BSNS_WEEKS = 10;
/** CelsBSNS bars: weeks 1–2, 3–5, 6–9 and 10. */
const BSNS_GROUPS = [
  [1, 2],
  [3, 5],
  [6, 9],
  [10, 10],
] as const;
/**
 * Left out of Progreso entirely (Matt, 2026-10-19): the TN visa course is in the CelsGLOBAL package but is
 * not counted in its route, its position or its totals. The road keeps the mockup's month labels.
 */
const HIDDEN_ROUTE = "tu-camino-con-la-visa-tn-empieza-aqui";
const ROUTE = ROUTE_CARDS.filter((slug) => slug !== HIDDEN_ROUTE);
/** Package courses shown as "included" chips on the CelsGLOBAL card, by course slug (after the AI tools). */
const GLOBAL_INCLUDED: Record<string, string> = {
  "english-for-business": "English For Business",
  "celstv-english-for-our-generation": "CelsTV",
};
/** The AI tools that come with CelsGLOBAL (shown when can_use_ai_tools, as on Mis cursos). */
const GLOBAL_TOOLS = ["Resume Review", "Interview Prep"];

/**
 * A program's road: `units` done out of `total`, and the unit count at which each stop is reached
 * (`at`, one per stop, in order). Stops sit evenly along the drawn road; between two stops the pin
 * moves in proportion to the units of that stretch.
 */
export type Road = {
  units: number;
  total: number;
  at: number[];
  /** Where the pin and "Siguiente" go, when that isn't `units` (CelsBSNS: the week being worked on). */
  pin?: number;
  /** The % shown, when that isn't units / total (CelsBSNS: lessons done, lessons started count half). */
  pct?: number;
};

export type ProgramView =
  | {
      brand: "celsus";
      road: Road;
      href: string;
      /** The last practice exam, and the best one. */
      last: { score: number; total: number } | null;
      best: { score: number; total: number } | null;
      topics: (number | null)[];
      weakest: number | null;
    }
  | {
      brand: "celstv";
      road: Road;
      href: string;
      episodesDone: number;
      episodes: number;
      /** 1-based: the first episode not finished yet. */
      current: number;
      units: { done: number; total: number; from: number; to: number }[];
      /** Index of the unit being worked on (the first one not finished). */
      currentUnit: number;
    }
  | {
      brand: "celsbsns";
      road: Road;
      href: string;
      week: number;
      weeks: number;
      weekTitle: string | null;
      groups: { from: number; to: number; pct: number }[];
      currentGroup: number;
    }
  | {
      brand: "celsglobal";
      road: Road;
      href: string;
      month: number;
      monthCourse: string | null;
      route: { title: string; done: number; total: number }[];
      currentRoute: number;
      included: string[];
    };

/** Lesson-weighted share of each module done: one unit per module. */
const moduleUnits = (mods: CourseStats["modules"]) => mods.reduce((n, m) => n + frac(m.done, m.lessons), 0);
const numberIn = (title: string, re: RegExp) => {
  const m = re.exec(title);
  return m ? Number(m[1]) : null;
};

function celsusView(c: CourseStats, exams: { score: number; total: number }[], civics: { topics: (number | null)[]; weakest: number | null }): ProgramView {
  const episodes = c.modules.filter((m) => {
    const n = numberIn(m.title, /episod[eio]+\s*(\d+)/i);
    return n !== null && n >= 1 && n <= 5;
  });
  const best = exams.reduce<{ score: number; total: number } | null>((b, a) => (!b || a.score / a.total > b.score / b.total ? a : b), null);
  const passed = !!best && best.score / best.total >= CIVICS_GOAL / 20;
  // Episodes 1–5, then the practice exam (18/20); the goal is the interview.
  return {
    brand: "celsus",
    road: { units: moduleUnits(episodes) + (passed ? 1 : 0), total: 6, at: [0, 1, 2, 3, 4, 5, 6] },
    href: "/app/examen-civico",
    last: exams[0] ?? null,
    best,
    ...civics,
  };
}

function celstvView(c: CourseStats): ProgramView {
  const eps = c.modules.filter((m) => {
    const n = numberIn(m.title, /episode\s*(\d+)/i);
    return n !== null && n <= TV_EPISODES;
  });
  const E = eps.length;
  const units = [0, 1, 2, 3].map((u) => {
    const from = u * 8 + 1;
    const to = Math.min(E, (u + 1) * 8);
    const list = eps.slice(from - 1, to);
    return { done: list.filter((m) => m.complete).length, total: list.length, from, to: (u + 1) * 8 };
  });
  const firstOpen = eps.findIndex((m) => !m.complete);
  const currentUnit = Math.max(0, units.findIndex((u) => u.done < u.total));
  // Inicio, then the end of units 1–4 (episodes 8 / 16 / 24 / 32); the goal is the whole series.
  return {
    brand: "celstv",
    road: { units: moduleUnits(eps), total: E, at: [0, 8, 16, 24, 32, 32].map((n) => Math.min(n, E)) },
    href: hrefOf(c),
    episodesDone: eps.filter((m) => m.complete).length,
    episodes: E,
    current: firstOpen === -1 ? E : firstOpen + 1,
    units,
    currentUnit: units.every((u) => u.done >= u.total) ? 3 : currentUnit,
  };
}

function bsnsView(c: CourseStats): ProgramView {
  const weeks = c.modules
    .map((m) => ({ m, n: numberIn(m.title, /(?:week|module|semana)\s*(\d+)/i) }))
    .filter((x): x is { m: CourseStats["modules"][number]; n: number } => x.n !== null && x.n >= 1 && x.n <= BSNS_WEEKS);
  // The week of the latest activity (the next one once it's complete), as on Inicio, Mis cursos and the course link.
  const week = activeWeekOf(weeks.map((w) => ({ n: w.n, done: [w.m.complete], last: w.m.lastActivity })));
  // Work in progress shows: a lesson started counts as half a lesson; "completed" still drives the checks.
  const worked = (m: CourseStats["modules"][number]) => m.done + 0.5 * m.started;
  const groups = BSNS_GROUPS.map(([from, to]) => {
    const list = weeks.filter((w) => w.n >= from && w.n <= to);
    const lessons = list.reduce((n, w) => n + w.m.lessons, 0);
    const done = list.reduce((n, w) => n + worked(w.m), 0);
    return { from, to, pct: Math.round(frac(done, lessons) * 100) };
  });
  const currentGroup = Math.max(0, BSNS_GROUPS.findIndex(([from, to]) => week >= from && week <= to));
  const cur = weeks.find((w) => w.n === week)?.m ?? null;
  const allDone = weeks.length > 0 && weeks.every((w) => w.m.complete);
  const lessons = weeks.reduce((n, w) => n + w.m.lessons, 0);
  const total = Math.max(weeks.length, 1);
  // The pin sits in the current week, moved along it by the share of that week worked on.
  const pin = allDone ? total : Math.min(total, week - 1 + (cur ? Math.min(1, frac(worked(cur), cur.lessons)) : 0));
  // Weeks 1, 3, 5, 7 and 9, then the final project (week 10).
  return {
    brand: "celsbsns",
    road: {
      units: moduleUnits(weeks.map((w) => w.m)),
      total,
      at: [0, 2, 4, 6, 8, 10].map((n) => Math.min(n, weeks.length)),
      pin,
      pct: Math.round(frac(weeks.reduce((n, w) => n + worked(w.m), 0), lessons) * 100),
    },
    href: hrefOf(c),
    week,
    weeks: BSNS_WEEKS,
    // "Week 3 – Management and Leadership" → "Management and Leadership".
    weekTitle: cur ? cur.title.replace(/^(?:week|module|semana)\s*\d+\s*[:–—-]\s*/i, "") : null,
    groups,
    currentGroup,
  };
}

function globalView(route: CourseStats[], month: number, included: string[]): ProgramView {
  const n = route.length;
  // The course of this month of the plan (months 2–4: resume, interview, finances), if the student has it.
  const monthSlug = month >= 2 && month <= 4 ? ROUTE_CARDS[month - 1] : null;
  const monthCourse = monthSlug ? (route.find((c) => c.slug === monthSlug) ?? null) : null;
  const currentIdx = monthCourse && !monthCourse.completed ? route.indexOf(monthCourse) : route.findIndex((c) => !c.completed);
  const current = route[currentIdx] ?? null;
  // Six months, one course a month: the pin moves with the share of each route course done.
  return {
    brand: "celsglobal",
    road: { units: route.reduce((s, c) => s + frac(c.done, c.lessons), 0), total: Math.max(n, 1), at: [0, 1, 2, 3, 4, 5].map((i) => (i * Math.max(n, 1)) / 5) },
    href: current ? hrefOf(current) : "/app/programas/celsglobal",
    month,
    // Month 1 (whose course isn't shown here): the route course being worked on.
    monthCourse: (month <= 4 ? (monthCourse ?? current)?.title : null) ?? null,
    route: route.map((c) => ({ title: c.title, done: c.modulesDone, total: c.modules.length })),
    currentRoute: Math.max(currentIdx, 0),
    included,
  };
}

export async function loadProgress(supabase: Client, userId: string) {
  const [{ data: profile }, { data: game }, { data: week }, { data: history }, access, { data: attempts }, { data: settings }, { data: enrollments }, { data: ipd }, { data: catalog }, { data: tools }] =
    await Promise.all([
      supabase.from("profiles").select("evaluation_level, evaluation_date, evaluation_skills").eq("id", userId).maybeSingle(),
      supabase.from("gamification").select("current_streak, longest_streak, last_activity_date, total_xp, weekly_xp, weekly_reset_date, badges").eq("user_id", userId).maybeSingle(),
      supabase.from("progress").select("xp_earned, last_activity").eq("user_id", userId).gte("last_activity", new Date(Date.now() - 8 * 864e5).toISOString()),
      supabase.rpc("my_evaluation_history"),
      accessibleCourses(supabase, userId),
      supabase
        .from("evaluation_attempts")
        .select("score, total, answers, evaluation_id, created_at, evaluation:evaluations(test_version, large_text)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("settings").select("key, value").eq("key", "weekly_xp_goal"),
      supabase.from("enrollments").select("course_id, starts_at, created_at, expires_at, program:programs(slug)").eq("user_id", userId).eq("status", "active"),
      // The CelsGLOBAL package: its courses come from program_courses.
      supabase.from("programs").select("program_courses(course:courses(id, slug))").eq("slug", ROUTE_PROGRAM).maybeSingle(),
      // Medals: the catalog (public.badges); what the student earned is gamification.badges (awarded by
      // private.award_badges; the shell's BadgeWatcher celebrates new ones).
      supabase.from("badges").select("code, name, requirement, rule").eq("active", true).order("sort_order"),
      supabase.rpc("can_use_ai_tools"),
    ]);
  const [stats, { data: prefs }] = await Promise.all([
    courseStats(supabase, userId, access.ids),
    supabase.from("user_preferences").select("daily_goal_xp").eq("user_id", userId).maybeSingle(),
  ]);
  const all = [...stats.values()].sort((a, b) => a.sort - b.sort);
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  // XP per day, Monday → Sunday. There is no per-day XP log: a lesson's XP (progress.xp_earned, given once
  // when it is finished) goes on the day of its last activity.
  const xpWeek = Array.from({ length: 7 }, () => 0);
  const active = Array.from({ length: 7 }, () => false);
  for (const p of week ?? []) {
    const i = p.last_activity ? weekIndex(p.last_activity) : -1;
    if (i < 0) continue;
    xpWeek[i] += p.xp_earned ?? 0;
    active[i] = true;
  }

  // CelsUS practice exams (2025 test): last and best score, and the share right per topic.
  const exams = (attempts ?? []).filter((a) => pick(a.evaluation)?.test_version === "2025" && a.total > 0);
  const celsusCourse = bySlug.get("celsus-para-ciudadania");
  let civics: { topics: (number | null)[]; weakest: number | null } = { topics: [null, null, null, null], weakest: null };
  if (celsusCourse) {
    // Per topic: share of right answers over the last 10 attempts, by question number → section.
    const recent = exams.slice(0, 10);
    const evalIds = [...new Set(recent.map((a) => a.evaluation_id))];
    const { data: qs } = evalIds.length ? await supabase.from("evaluation_questions").select("evaluation_id, is_asterisked, data").in("evaluation_id", evalIds) : { data: [] };
    const meta = new Map(
      (qs ?? []).map((q) => {
        const d = (q.data ?? {}) as { n?: number; section?: string; star?: boolean };
        return [`${q.evaluation_id}:${d.n}`, { topic: TOPIC_OF[d.section ?? ""] ?? -1, star: q.is_asterisked || d.star === true }];
      }),
    );
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
    civics = { topics, weakest: scored.length ? scored.sort((x, y) => x[0] - y[0])[0][1] : null };
  }

  // Programs: one road and one card per program the student is enrolled in. A course that comes only with
  // the CelsGLOBAL package belongs to the CelsGLOBAL card (the Mis cursos rule), not a program of its own.
  const live = (enrollments ?? []).filter((e) => !e.expires_at || new Date(e.expires_at) > new Date());
  const hasIpd = live.some((e) => pick(e.program)?.slug === ROUTE_PROGRAM);
  const pkgCourses = (ipd?.program_courses ?? []).map((pc) => pick(pc.course)).filter((c): c is { id: string; slug: string } => !!c?.slug);
  const pkgIds = new Set(hasIpd ? pkgCourses.map((c) => c.id) : []);
  const direct = new Set(live.map((e) => e.course_id).filter((id): id is string => !!id));
  const own = (slug: string) => {
    const c = bySlug.get(slug);
    return c && (direct.has(c.id) || !pkgIds.has(c.id)) ? c : null;
  };
  const programs: ProgramView[] = [];
  if (celsusCourse) programs.push(celsusView(celsusCourse, exams.map((a) => ({ score: a.score, total: a.total })), civics));
  const tv = own("celstv-english-for-our-generation");
  if (tv) programs.push(celstvView(tv));
  const bs = own("english-for-business");
  if (bs) programs.push(bsnsView(bs));
  const globalCourses = all.filter((c) => c.brand === "celsglobal" && c.slug !== HIDDEN_ROUTE);
  if (hasIpd || globalCourses.length) {
    // Route courses: the package's own (program_courses), in route order, without the TN visa course;
    // without the package, the ones owned.
    const inPkg = new Set(pkgCourses.map((c) => c.slug));
    const route = ROUTE.flatMap((slug) => {
      const c = bySlug.get(slug);
      return c && (hasIpd ? inPkg.has(slug) : true) ? [c] : [];
    });
    // Month of the 6-month plan, from the first access to it (program or course enrollment), as on Mis cursos.
    const gIds = new Set(globalCourses.map((c) => c.id));
    const starts = live.filter((e) => pick(e.program)?.slug === ROUTE_PROGRAM || (e.course_id && gIds.has(e.course_id))).map((e) => new Date(e.starts_at ?? e.created_at).getTime());
    const month = starts.length ? Math.min(6, Math.max(1, Math.floor((Date.now() - Math.min(...starts)) / (30.44 * 864e5)) + 1)) : 1;
    const included = hasIpd ? [...(tools ? GLOBAL_TOOLS : []), ...Object.keys(GLOBAL_INCLUDED).filter((slug) => pkgCourses.some((c) => c.slug === slug)).map((slug) => GLOBAL_INCLUDED[slug])] : [];
    if (route.length) programs.push(globalView(route, month, included));
  }

  // Medals.
  const owned = game?.badges && typeof game.badges === "object" && !Array.isArray(game.badges) ? (game.badges as Record<string, { at?: string }>) : {};
  const streak = liveStreak(game);
  const totalXp = game?.total_xp ?? 0;
  const list = catalog ?? [];
  const nm = nextMedalOf(list, owned, streak, totalXp);
  const medals = list.map((b) => ({
    code: b.code,
    name: b.name,
    requirement: b.requirement,
    state: (owned[b.code] ? "on" : b.code === nm?.badge.code ? "next" : "off") as "on" | "next" | "off",
    at: owned[b.code]?.at ?? null,
  }));

  const skills = profile?.evaluation_skills && typeof profile.evaluation_skills === "object" && !Array.isArray(profile.evaluation_skills) ? (profile.evaluation_skills as Record<string, string>) : null;
  const evaluatedAt = profile?.evaluation_date ? new Date(profile.evaluation_date).getTime() : null;
  const retakeAt = evaluatedAt ? evaluatedAt + 30 * 864e5 : null;
  const goalSetting = settings?.find((s) => s.key === "weekly_xp_goal")?.value;
  return {
    streak,
    // gamification.longest_streak is kept by record_lesson_progress; the current streak can't be higher.
    record: Math.max(game?.longest_streak ?? 0, streak),
    totalXp,
    weeklyXp: liveWeeklyXp(game),
    weeklyGoal: weeklyGoalOf(goalSetting),
    // Cuenta → Preferencias → Meta diaria de XP.
    dailyGoal: prefs?.daily_goal_xp ?? 50,
    xpWeek,
    activeDays: active.filter(Boolean).length,
    today: todayIndex(),
    level: profile?.evaluation_level && LEVELS.includes(profile.evaluation_level) ? profile.evaluation_level : null,
    evaluatedAt: profile?.evaluation_date ?? null,
    skills: skills && Object.values(skills).some((v) => LEVELS.includes(v)) ? skills : null,
    history: (history ?? []).filter((h) => LEVELS.includes(h.level)),
    /** When the evaluation can be taken again (30 days after the last one); null when it already can. */
    retakeAt: retakeAt && retakeAt > Date.now() ? new Date(retakeAt).toISOString() : null,
    programs,
    medals,
    earnedCount: medals.filter((m) => m.state === "on").length,
    nextMedal: nm?.next ?? null,
  };
}

export type ProgressData = Awaited<ReturnType<typeof loadProgress>>;
export type MedalView = ProgressData["medals"][number];
