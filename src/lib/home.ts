// Data for the student home (/app): programs with lesson progress, the lesson to continue,
// this week's activity, open class assignments and the civics pre-test link.
import type { Client } from "@/lib/supabase/types";
import type { ThemeKey } from "@/lib/themes";
import { accessibleCourses, courseStats, myAssignments, nextLesson, todayIndex, weekIndex } from "@/lib/learning";

export const BRANDS: ThemeKey[] = ["celstv", "celsbsns", "celsus", "celsglobal"];

export type HomeCourse = { id: string; slug: string; title: string; done: number; total: number };
export type HomeProgram = { brand: ThemeKey; courses: HomeCourse[]; done: number; total: number };
export type ContinueLesson = { lessonId: string; lessonTitle: string; courseTitle: string; brand: ThemeKey; started: boolean };
export type OpenAssignment = { id: string; courseSlug: string; courseTitle: string; note: string | null; dueAt: string | null; lessonId: string | null };

export async function loadHome(supabase: Client, userId: string) {
  const [{ data: profile }, { data: game }, { data: setting }, access, assignments, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("display_name, evaluation_level, evaluation_date, starting_level").eq("id", userId).maybeSingle(),
    supabase.from("gamification").select("current_streak, weekly_xp").eq("user_id", userId).maybeSingle(),
    supabase.from("settings").select("value").eq("key", "civics_pretest_url").maybeSingle(),
    accessibleCourses(supabase, userId),
    myAssignments(supabase, userId),
    supabase.from("progress").select("last_activity").eq("user_id", userId).gte("last_activity", new Date(Date.now() - 8 * 864e5).toISOString()),
  ]);
  const stats = await courseStats(supabase, userId, access.ids);
  const all = [...stats.values()].sort((a, b) => a.sort - b.sort);

  const programs: HomeProgram[] = BRANDS.map((brand) => {
    const list = all.filter((c) => c.brand === brand).map((c) => ({ id: c.id, slug: c.slug, title: c.title, done: c.done, total: c.lessons }));
    return { brand, courses: list, done: list.reduce((n, c) => n + c.done, 0), total: list.reduce((n, c) => n + c.total, 0) };
  }).filter((p) => p.courses.length);

  // Continue: the course touched last; with no activity yet, the first course.
  const lastCourse = all.filter((c) => c.last).sort((a, b) => (a.last!.at < b.last!.at ? 1 : -1))[0] ?? all[0];
  const next = lastCourse ? nextLesson(lastCourse) : null;
  const continueLesson: ContinueLesson | null =
    lastCourse && next ? { lessonId: next.id, lessonTitle: next.title, courseTitle: lastCourse.title, brand: lastCourse.brand, started: lastCourse.started } : null;

  // Class assignments stay on the home until the course is started.
  const open: OpenAssignment[] = assignments.flatMap((a) => {
    const c = stats.get(a.courseId);
    if (!c || c.started) return [];
    return [{ id: a.id, courseSlug: c.slug, courseTitle: a.moduleTitle ? `${c.title} · ${a.moduleTitle}` : c.title, note: a.note, dueAt: a.dueAt, lessonId: nextLesson(c)?.id ?? null }];
  });

  const week = Array.from({ length: 7 }, () => false);
  for (const p of recent ?? []) {
    const i = p.last_activity ? weekIndex(p.last_activity) : -1;
    if (i >= 0) week[i] = true;
  }

  const url = typeof setting?.value === "string" && /^(https:\/\/|\/)/.test(setting.value) ? setting.value : null;

  return {
    name: (profile?.display_name ?? "").trim().split(/\s+/)[0] || null,
    level: profile?.evaluation_level ?? profile?.starting_level ?? null,
    evaluationDate: profile?.evaluation_date ?? null,
    streak: game?.current_streak ?? 0,
    weeklyXp: game?.weekly_xp ?? 0,
    week,
    today: todayIndex(),
    programs,
    continueLesson,
    assignments: open,
    civicsUrl: url,
  };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;
