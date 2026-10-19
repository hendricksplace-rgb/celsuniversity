// Data for the student home (/app): programs with lesson progress, the lesson to continue, this week's
// activity and goal, the medals, the updates band, open class assignments and the civics pre-test link.
import type { Client } from "@/lib/supabase/types";
import type { ThemeKey } from "@/lib/themes";
import { accessibleCourses, courseStats, myAssignments, nextLesson, todayIndex, weekIndex, weekStart, type CourseStats } from "@/lib/learning";
import { PART_NAME, partKeyOf } from "@/lib/course-page";

export const BRANDS: ThemeKey[] = ["celstv", "celsbsns", "celsus", "celsglobal"];

/** Weekly XP goal when the `weekly_xp_goal` setting is missing (staff can change it in `settings`). */
export const DEFAULT_WEEKLY_GOAL = 250;

const pick = <T>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
/** "CelsCards" for a CelsTV part, else the lesson's own title. */
const partName = (title: string) => {
  const k = partKeyOf({ title, lesson_type: null });
  return k ? PART_NAME[k] : title;
};

export type HomeCourse = {
  id: string;
  slug: string;
  title: string;
  done: number;
  total: number;
};
export type NextUp = { lessonId: string; part: string; started: boolean };
export type HomeProgram = {
  brand: ThemeKey;
  courses: HomeCourse[];
  done: number;
  total: number;
  /** The course shown on the card: the one touched last, else the first. */
  focus: { title: string; module: string | null } | null;
  next: NextUp | null;
  /** CelsGLOBAL: month of the 6-month plan, from the enrollment start. */
  month: number | null;
};
export type ContinueLesson = {
  lessonId: string;
  lessonTitle: string;
  part: string;
  module: string | null;
  courseTitle: string;
  brand: ThemeKey;
  started: boolean;
  /** Share of the episode (module) done, 0–1. */
  progress: number;
};
export type OpenAssignment = {
  id: string;
  courseSlug: string;
  courseTitle: string;
  note: string | null;
  dueAt: string | null;
  lessonId: string | null;
};
export type Medal = {
  code: string;
  name: string;
  state: "on" | "next" | "off";
};
export type NextMedal = {
  name: string;
  requirement: string;
  unit: "days" | "xp" | null;
  have: number;
  min: number;
};
export type BandItem =
  | { kind: "yesterday" | "firstDay" | "app" | "keepGoing" }
  | { kind: "streakToday" | "goal"; n: number }
  | { kind: "medal"; name: string }
  | { kind: "fresh"; part: string; episode: string };

const TN_COURSE = "tu-camino-con-la-visa-tn-empieza-aqui";

function focusOf(courses: CourseStats[]) {
  const c = courses.filter((x) => x.last).sort((a, b) => (a.last!.at < b.last!.at ? 1 : -1))[0] ?? courses[0];
  if (!c) return null;
  const n = nextLesson(c);
  const mod = n ? c.order.find((o) => o.id === n.id)?.moduleId : null;
  const m = c.modules.find((x) => x.id === mod) ?? null;
  return { course: c, next: n, module: m };
}

export async function loadHome(supabase: Client, userId: string) {
  const [{ data: profile }, { data: game }, { data: settings }, access, assignments, { data: recent }, { data: enrollments }, { data: catalog }] = await Promise.all([
    supabase.from("profiles").select("display_name, evaluation_level, evaluation_date, starting_level").eq("id", userId).maybeSingle(),
    supabase.from("gamification").select("current_streak, weekly_xp, weekly_reset_date, last_activity_date, total_xp, badges").eq("user_id", userId).maybeSingle(),
    supabase.from("settings").select("key, value").in("key", ["civics_pretest_url", "weekly_xp_goal"]),
    accessibleCourses(supabase, userId),
    myAssignments(supabase, userId),
    supabase
      .from("progress")
      .select("last_activity")
      .eq("user_id", userId)
      .gte("last_activity", new Date(Date.now() - 8 * 864e5).toISOString()),
    supabase.from("enrollments").select("starts_at, created_at, course_id, program:programs(program_courses(course_id))").eq("user_id", userId).eq("status", "active"),
    supabase.from("badges").select("code, name, requirement, rule").eq("active", true).order("sort_order"),
  ]);
  const weekAgo = Date.now() - 7 * 864e5;
  const starts = (enrollments ?? []).map((e) => new Date(e.starts_at ?? e.created_at).getTime());
  const [stats, { data: fresh }] = await Promise.all([
    courseStats(supabase, userId, access.ids),
    access.ids.length && starts.length
      ? supabase
          .from("lessons")
          .select("title, created_at, module:modules!inner(title, course_id)")
          .in("module.course_id", access.ids)
          .eq("status", "published")
          .eq("teacher_only", false)
          .eq("has_content", true)
          .gt("created_at", new Date(Math.max(weekAgo, Math.min(...starts))).toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
      : { data: null },
  ]);
  const all = [...stats.values()].sort((a, b) => a.sort - b.sort);
  const setting = (key: string) => settings?.find((s) => s.key === key)?.value;
  const since = (e: { starts_at: string | null; created_at: string }) => new Date(e.starts_at ?? e.created_at).getTime();

  // CelsGLOBAL month: 1 in the first 30 days of access to its courses (program or course enrollment), up to 6.
  const globalIds = new Set(all.filter((c) => c.brand === "celsglobal").map((c) => c.id));
  const global = (enrollments ?? []).filter((e) => (e.course_id && globalIds.has(e.course_id)) || (pick(e.program)?.program_courses ?? []).some((pc) => globalIds.has(pc.course_id))).map(since);
  const month = global.length ? Math.min(6, Math.max(1, Math.floor((Date.now() - Math.min(...global)) / (30.44 * 864e5)) + 1)) : null;

  // Tu Camino TN is in the CelsGLOBAL package (Mis cursos shows it as MES 1) but stays off Inicio for now (Matt, 2026-10-19).
  const programs: HomeProgram[] = BRANDS.map((brand) => {
    const mine = all.filter((c) => c.brand === brand && c.slug !== TN_COURSE);
    const list = mine.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      done: c.done,
      total: c.lessons,
    }));
    const f = focusOf(mine);
    return {
      brand,
      courses: list,
      done: list.reduce((n, c) => n + c.done, 0),
      total: list.reduce((n, c) => n + c.total, 0),
      focus: f ? { title: f.course.title, module: f.module?.title ?? null } : null,
      next: f?.next
        ? {
            lessonId: f.next.id,
            part: partName(f.next.title),
            started: f.course.started,
          }
        : null,
      month: brand === "celsglobal" ? (month ?? 1) : null,
    };
  }).filter((p) => p.courses.length);

  // Continue: the course touched last; with no activity yet, the first course.
  const f = focusOf(all);
  const continueLesson: ContinueLesson | null =
    f && f.next
      ? {
          lessonId: f.next.id,
          lessonTitle: f.next.title,
          part: partName(f.next.title),
          module: f.module?.title ?? null,
          courseTitle: f.course.title,
          brand: f.course.brand,
          started: f.course.started,
          progress: f.module ? f.module.done / f.module.lessons : f.course.lessons ? f.course.done / f.course.lessons : 0,
        }
      : null;

  // Class assignments stay on the home until the course is started.
  const open: OpenAssignment[] = assignments.flatMap((a) => {
    const c = stats.get(a.courseId);
    if (!c || c.started) return [];
    return [
      {
        id: a.id,
        courseSlug: c.slug,
        courseTitle: a.moduleTitle ? `${c.title} · ${a.moduleTitle}` : c.title,
        note: a.note,
        dueAt: a.dueAt,
        lessonId: nextLesson(c)?.id ?? null,
      },
    ];
  });

  const week = Array.from({ length: 7 }, () => false);
  for (const p of recent ?? []) {
    const i = p.last_activity ? weekIndex(p.last_activity) : -1;
    if (i >= 0) week[i] = true;
  }
  const today = todayIndex();

  // Streak and weekly XP are only current if the last activity was today/yesterday and the reset is this week's.
  const todayYmd = ymd(new Date());
  const yesterdayYmd = ymd(new Date(Date.now() - 864e5));
  const last = game?.last_activity_date ?? null;
  const doneToday = last === todayYmd || week[today];
  const streak = last === todayYmd || last === yesterdayYmd ? (game?.current_streak ?? 0) : 0;
  // weekStart() already holds Mexico City wall-clock fields, so format them as they are.
  const ws = weekStart();
  const monday = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
  const weeklyXp = game?.weekly_reset_date === monday ? (game?.weekly_xp ?? 0) : 0;
  const goalSetting = Number(setting("weekly_xp_goal"));
  const goal = Number.isFinite(goalSetting) && goalSetting > 0 ? Math.round(goalSetting) : DEFAULT_WEEKLY_GOAL;

  // Medals: the catalog (public.badges) and what the student has earned (gamification.badges).
  const owned = game?.badges && typeof game.badges === "object" && !Array.isArray(game.badges) ? (game.badges as Record<string, { at?: string }>) : {};
  const medalsList = catalog ?? [];
  const rule = (r: unknown) => (r && typeof r === "object" ? (r as { type?: string; min?: number }) : {});
  const measurable = (r: unknown) => ["streak", "total_xp"].includes(rule(r).type ?? "");
  const unearned = medalsList.filter((b) => !owned[b.code]);
  const nextB = unearned.find((b) => measurable(b.rule)) ?? unearned[0] ?? null;
  let nextMedal: NextMedal | null = null;
  if (nextB) {
    const r = rule(nextB.rule);
    const unit = r.type === "streak" ? "days" : r.type === "total_xp" ? "xp" : null;
    const have = unit === "days" ? streak : unit === "xp" ? (game?.total_xp ?? 0) : 0;
    nextMedal = {
      name: nextB.name,
      requirement: nextB.requirement,
      unit,
      have: Math.min(have, r.min ?? 0),
      min: r.min ?? 0,
    };
  }
  const earnedList = medalsList.filter((b) => owned[b.code]);
  const afterNext = unearned.filter((b) => b !== nextB);
  const row: Medal[] = [
    ...earnedList.slice(-(nextB ? 2 : 5)).map((b) => ({ code: b.code, name: b.name, state: "on" as const })),
    ...(nextB ? [{ code: nextB.code, name: nextB.name, state: "next" as const }] : []),
  ];
  for (const b of afterNext) {
    if (row.length >= 5) break;
    row.push({ code: b.code, name: b.name, state: "off" });
  }

  // Updates band, newest first. New content: a lesson published in an enrolled course in the last 7 days,
  // and after the student got access (the course import itself isn't news).
  const band: BandItem[] = [];
  if (streak >= 1 && (doneToday ? streak >= 2 : true))
    band.push({
      kind: (doneToday ? streak === 2 : streak === 1) ? "firstDay" : "yesterday",
    });
  if (streak >= 1 && !doneToday) band.push({ kind: "streakToday", n: streak + 1 });
  Object.entries(owned)
    .filter(([, v]) => v?.at && new Date(v.at).getTime() >= weekAgo)
    .sort((a, b) => (a[1].at! < b[1].at! ? 1 : -1))
    .slice(0, 2)
    .forEach(([code]) => {
      const name = medalsList.find((b) => b.code === code)?.name;
      if (name) band.push({ kind: "medal", name });
    });
  // No server-side "app installed" flag exists: the item is marked so the installed app hides it (display-mode: standalone).
  band.push({ kind: "app" });
  const l = fresh?.[0];
  const mod = l ? pick(l.module) : null;
  if (l && mod) band.push({ kind: "fresh", part: partName(l.title), episode: mod.title });
  if (weeklyXp < goal) band.push({ kind: "goal", n: goal - weeklyXp });
  if (band.every((b) => b.kind === "app" || b.kind === "goal")) band.push({ kind: "keepGoing" });

  const civics = setting("civics_pretest_url");
  const url = typeof civics === "string" && /^(https:\/\/|\/)/.test(civics) ? civics : null;

  return {
    name: (profile?.display_name ?? "").trim().split(/\s+/)[0] || null,
    level: profile?.evaluation_level ?? profile?.starting_level ?? null,
    evaluationLevel: profile?.evaluation_date ? (profile.evaluation_level ?? null) : null,
    evaluationDate: profile?.evaluation_date ?? null,
    streak,
    weeklyXp,
    goal,
    week,
    today,
    doneToday,
    programs,
    continueLesson,
    assignments: open,
    civicsUrl: url,
    medals: {
      earned: earnedList.length,
      total: medalsList.length,
      row,
      next: nextMedal,
    },
    band: band.slice(0, 6),
  };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;
