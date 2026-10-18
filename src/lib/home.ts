// Data for the student home (/app): enrollments grouped by program brand, lesson progress,
// the lesson to continue, this week's activity and the civics pre-test link.
import type { Client } from "@/lib/supabase/types";
import { themeForCourse, type ThemeKey } from "@/lib/themes";

export const BRANDS: ThemeKey[] = ["celstv", "celsbsns", "celsus", "celsglobal"];

export type HomeCourse = { id: string; slug: string; title: string; done: number; total: number };
export type HomeProgram = { brand: ThemeKey; courses: HomeCourse[]; done: number; total: number };
export type ContinueLesson = { lessonId: string; lessonTitle: string; courseTitle: string; brand: ThemeKey; started: boolean };

const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Monday 00:00 of the current week, in the student's time zone approximated by Mexico City. */
function weekStart() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const day = (now.getDay() + 6) % 7; // Monday = 0
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - day);
  return now;
}

export async function loadHome(supabase: Client, userId: string) {
  const [{ data: profile }, { data: game }, { data: enrollments }, { data: setting }] = await Promise.all([
    supabase.from("profiles").select("display_name, evaluation_level, evaluation_date, starting_level").eq("id", userId).maybeSingle(),
    supabase.from("gamification").select("current_streak, weekly_xp, last_activity_date").eq("user_id", userId).maybeSingle(),
    supabase
      .from("enrollments")
      .select("course:courses(id, slug, title, sort_order), program:programs(id, program_courses(sort_order, course:courses(id, slug, title, sort_order, status)))")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase.from("settings").select("value").eq("key", "civics_pretest_url").maybeSingle(),
  ]);

  // Every course the student can open: direct enrollments plus the published courses of their programs.
  const courses = new Map<string, { id: string; slug: string; title: string; sort: number }>();
  for (const e of enrollments ?? []) {
    const c = pick(e.course);
    if (c?.slug) courses.set(c.id, { id: c.id, slug: c.slug, title: c.title, sort: c.sort_order });
    for (const pc of pick(e.program)?.program_courses ?? []) {
      const pcCourse = pick(pc.course);
      if (pcCourse?.slug && pcCourse.status === "published") courses.set(pcCourse.id, { id: pcCourse.id, slug: pcCourse.slug, title: pcCourse.title, sort: pcCourse.sort_order });
    }
  }
  const ids = [...courses.keys()];

  const [{ data: lessons }, { data: progress }] = ids.length
    ? await Promise.all([
        supabase.from("lessons").select("id, title, sort_order, module:modules!inner(course_id, sort_order)").in("module.course_id", ids).eq("status", "published").eq("teacher_only", false),
        supabase.from("progress").select("lesson_id, status, last_activity").eq("user_id", userId).order("last_activity", { ascending: false, nullsFirst: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const doneIds = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const lessonInfo = new Map<string, { title: string; courseId: string; order: [number, number] }>();
  const totals = new Map<string, { done: number; total: number }>();
  for (const l of lessons ?? []) {
    const m = pick(l.module);
    if (!m) continue;
    lessonInfo.set(l.id, { title: l.title, courseId: m.course_id, order: [m.sort_order, l.sort_order] });
    const t = totals.get(m.course_id) ?? { done: 0, total: 0 };
    t.total++;
    if (doneIds.has(l.id)) t.done++;
    totals.set(m.course_id, t);
  }

  const programs: HomeProgram[] = BRANDS.map((brand) => {
    const list = [...courses.values()]
      .filter((c) => themeForCourse({ slug: c.slug }) === brand)
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({ id: c.id, slug: c.slug, title: c.title, ...(totals.get(c.id) ?? { done: 0, total: 0 }) }));
    return { brand, courses: list, done: list.reduce((n, c) => n + c.done, 0), total: list.reduce((n, c) => n + c.total, 0) };
  }).filter((p) => p.courses.length);

  // Continue: the last lesson touched if it isn't finished, else the next lesson of that course;
  // with no activity yet, the first lesson of the first program.
  const byOrder = (a: string, b: string) => {
    const x = lessonInfo.get(a)!.order;
    const y = lessonInfo.get(b)!.order;
    return x[0] - y[0] || x[1] - y[1];
  };
  const lessonsOf = (courseId: string) => [...lessonInfo.keys()].filter((id) => lessonInfo.get(id)!.courseId === courseId).sort(byOrder);
  let next: { id: string; started: boolean } | null = null;
  const last = (progress ?? []).find((p) => lessonInfo.has(p.lesson_id));
  if (last) {
    if (last.status !== "completed") next = { id: last.lesson_id, started: true };
    else {
      const list = lessonsOf(lessonInfo.get(last.lesson_id)!.courseId);
      const after = list.slice(list.indexOf(last.lesson_id) + 1).find((id) => !doneIds.has(id));
      if (after) next = { id: after, started: true };
    }
  }
  if (!next && programs[0]) {
    const first = lessonsOf(programs[0].courses[0].id).find((id) => !doneIds.has(id));
    if (first) next = { id: first, started: false };
  }
  const nextInfo = next ? lessonInfo.get(next.id)! : null;
  const nextCourse = nextInfo ? courses.get(nextInfo.courseId)! : null;
  const continueLesson: ContinueLesson | null =
    next && nextInfo && nextCourse ? { lessonId: next.id, lessonTitle: nextInfo.title, courseTitle: nextCourse.title, brand: themeForCourse({ slug: nextCourse.slug }), started: next.started } : null;

  // This week, Monday to Sunday: a day counts when any lesson was touched.
  const start = weekStart();
  const week = Array.from({ length: 7 }, () => false);
  for (const p of progress ?? []) {
    if (!p.last_activity) continue;
    const d = new Date(new Date(p.last_activity).toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    const i = Math.floor((d.getTime() - start.getTime()) / 864e5);
    if (i >= 0 && i < 7) week[i] = true;
  }

  const url = typeof setting?.value === "string" && /^(https:\/\/|\/)/.test(setting.value) ? setting.value : null;

  return {
    name: (profile?.display_name ?? "").trim().split(/\s+/)[0] || null,
    level: profile?.evaluation_level ?? profile?.starting_level ?? null,
    evaluationDate: profile?.evaluation_date ?? null,
    streak: game?.current_streak ?? 0,
    weeklyXp: game?.weekly_xp ?? 0,
    week,
    today: (new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })).getDay() + 6) % 7,
    programs,
    continueLesson,
    civicsUrl: url,
  };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;
