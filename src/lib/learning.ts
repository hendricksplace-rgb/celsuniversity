// What a student can study and how far they got: the courses they can open (direct enrollment,
// a program, or a class), per-course module and lesson progress, and their class assignments.
// Shared by the home, the CelsGLOBAL route and Mis cursos.
import type { Client } from "@/lib/supabase/types";
import { themeForCourse, type ThemeKey } from "@/lib/themes";
import { studentLessons } from "@/lib/course-page";
import { guidedModules } from "@/lib/guided-modules";
import { HIDDEN_FROM_STUDENTS } from "@/lib/glossary";

const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export type ModuleStats = {
  id: string;
  title: string;
  lessons: number;
  done: number;
  complete: boolean;
  /** Lessons opened but not finished (progress.status in_progress). */
  started: number;
  /** The latest progress.last_activity among the module's lessons. */
  lastActivity: string | null;
};
export type CourseStats = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  sort: number;
  brand: ThemeKey;
  modules: ModuleStats[];
  lessons: number;
  done: number;
  modulesDone: number;
  /** 1-based: the first module not finished yet (the last one when everything is done). */
  currentModule: number;
  /** The course's units for "Semana x de y" / "Módulo x de y": its lesson_week modules with something in them
   *  (not "Material extra", "Recursos adicionales" or the evaluation module). */
  units: number;
  started: boolean;
  completed: boolean;
  xp: number;
  last: { at: string; lessonId: string; lessonTitle: string } | null;
  /** Lessons in order, with completion: for "continue" links. */
  order: { id: string; title: string; done: boolean; moduleId: string }[];
  downloaded: boolean;
};

export type Assignment = { id: string; courseId: string; moduleId: string | null; moduleTitle: string | null; note: string | null; dueAt: string | null; className: string };

/** Courses the student can open, keyed by id. `programs` holds the slugs of the programs they're enrolled in. */
export async function accessibleCourses(supabase: Client, userId: string) {
  const [{ data: enrollments }, { data: classes }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("expires_at, course:courses(id, status), program:programs(slug, program_courses(course:courses(id, status)))")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase.from("class_members").select("class:classes(status, class_courses(course:courses(id, status)))").eq("user_id", userId),
  ]);
  const ids = new Set<string>();
  const programs = new Set<string>();
  for (const e of enrollments ?? []) {
    if (e.expires_at && new Date(e.expires_at) < new Date()) continue;
    const c = pick(e.course);
    if (c && c.status === "published") ids.add(c.id);
    const p = pick(e.program);
    if (p) {
      if (p.slug) programs.add(p.slug);
      for (const pc of p.program_courses ?? []) {
        const pcc = pick(pc.course);
        if (pcc && pcc.status === "published") ids.add(pcc.id);
      }
    }
  }
  for (const m of classes ?? []) {
    const cl = pick(m.class);
    if (!cl || cl.status !== "active") continue;
    for (const cc of cl.class_courses ?? []) {
      const c = pick(cc.course);
      if (c && c.status === "published") ids.add(c.id);
    }
  }
  return { ids: [...ids], programs };
}

export async function courseStats(supabase: Client, userId: string, courseIds: string[]): Promise<Map<string, CourseStats>> {
  const out = new Map<string, CourseStats>();
  if (!courseIds.length) return out;
  const [{ data: courses }, { data: modules }, { data: progress }, { data: downloads }] = await Promise.all([
    supabase.from("courses").select("id, slug, title, description, cover_art_url, sort_order").in("id", courseIds),
    supabase
      .from("modules")
      .select("id, course_id, title, kind, sort_order, lessons(id, title, sort_order, status, teacher_only, has_content)")
      .in("course_id", courseIds)
      .eq("status", "published")
      .order("sort_order"),
    supabase.from("progress").select("lesson_id, status, last_activity, xp_earned").eq("user_id", userId),
    supabase.from("offline_downloads").select("module_id, expires_at").eq("user_id", userId).is("removed_at", null),
  ]);
  const prog = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  // Guided courses (CelsGLOBAL step template): each module is one step, done when its 3 questions are answered
  // (guided_step_progress.completed_at); its old lessons only carry the XP and the "last activity".
  const modIds = (modules ?? []).map((m) => m.id);
  const [guided, { data: gp }] = await Promise.all([
    guidedModules(supabase, modIds),
    modIds.length ? supabase.from("guided_step_progress").select("module_id, completed_at, updated_at").eq("user_id", userId).in("module_id", modIds) : Promise.resolve({ data: [] }),
  ]);
  const stepDone = new Map((gp ?? []).map((g) => [g.module_id, g]));
  const saved = new Set((downloads ?? []).filter((d) => !d.expires_at || new Date(d.expires_at) > new Date()).map((d) => d.module_id));

  for (const c of courses ?? []) {
    if (!c.slug) continue;
    const mods = (modules ?? []).filter((m) => m.course_id === c.id);
    const order: CourseStats["order"] = [];
    const ms: ModuleStats[] = [];
    let xp = 0;
    let last: CourseStats["last"] = null;
    const weekIds = new Set<string>();
    for (const m of mods) {
      const g = guided.get(m.id);
      if (g) {
        const own = (m.lessons ?? []).filter((l) => l.status === "published" && !l.teacher_only).sort((a, b) => a.sort_order - b.sort_order);
        const rep = own[0];
        if (!rep) continue;
        const row = stepDone.get(m.id);
        const isDone = !!row?.completed_at;
        const title = `Paso ${g.step}: ${g.title}`;
        for (const l of own) {
          const p = prog.get(l.id);
          xp += p?.xp_earned ?? 0;
          if (p?.last_activity && (!last || p.last_activity > last.at)) last = { at: p.last_activity, lessonId: rep.id, lessonTitle: title };
        }
        if (row?.updated_at && (!last || row.updated_at > last.at)) last = { at: row.updated_at, lessonId: rep.id, lessonTitle: title };
        // The step's first lesson stands for the step: /app/lecciones/<id> opens the step page.
        order.push({ id: rep.id, title, done: isDone, moduleId: m.id });
        const stepLast = [row?.updated_at ?? null, ...own.map((l) => prog.get(l.id)?.last_activity ?? null)].filter((x): x is string => !!x).sort().pop() ?? null;
        ms.push({ id: m.id, title: m.title, lessons: 1, done: isDone ? 1 : 0, complete: isDone, started: !isDone && stepLast ? 1 : 0, lastActivity: stepLast });
        weekIds.add(m.id);
        continue;
      }
      // studentLessons keeps an empty CelsVideo for the episode path; it can't be finished, so it doesn't count here.
      const ls = studentLessons((m.lessons ?? []).filter((l) => l.status === "published" && !l.teacher_only && !HIDDEN_FROM_STUDENTS.has(l.id)).sort((a, b) => a.sort_order - b.sort_order)).filter(
        (l) => l.has_content,
      );
      if (!ls.length) continue;
      let done = 0;
      let started = 0;
      let modLast: string | null = null;
      for (const l of ls) {
        const p = prog.get(l.id);
        const isDone = p?.status === "completed";
        if (isDone) done++;
        else if (p) started++;
        if (p?.last_activity && (!modLast || p.last_activity > modLast)) modLast = p.last_activity;
        if (p) {
          xp += p.xp_earned ?? 0;
          if (p.last_activity && (!last || p.last_activity > last.at)) last = { at: p.last_activity, lessonId: l.id, lessonTitle: l.title };
        }
        order.push({ id: l.id, title: l.title, done: isDone, moduleId: m.id });
      }
      ms.push({ id: m.id, title: m.title, lessons: ls.length, done, complete: ls.length > 0 && done === ls.length, started, lastActivity: modLast });
      if (m.kind === "lesson_week") weekIds.add(m.id);
    }
    const lessons = order.length;
    const done = order.filter((o) => o.done).length;
    const modulesDone = ms.filter((m) => m.complete).length;
    const firstOpen = ms.findIndex((m) => !m.complete);
    out.set(c.id, {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover: c.cover_art_url,
      sort: c.sort_order,
      brand: themeForCourse({ slug: c.slug }),
      modules: ms,
      lessons,
      done,
      modulesDone,
      currentModule: firstOpen === -1 ? Math.max(ms.length, 1) : firstOpen + 1,
      units: weekIds.size || ms.length,
      started: !!last,
      completed: lessons > 0 && done === lessons,
      xp,
      last,
      order,
      downloaded: mods.some((m) => saved.has(m.id)),
    });
  }
  return out;
}

/** The lesson to open next in a course: the last one touched if unfinished, else the next unfinished one. */
export function nextLesson(c: CourseStats) {
  if (c.last && !c.order.find((o) => o.id === c.last!.lessonId)?.done) return { id: c.last.lessonId, title: c.last.lessonTitle };
  const from = c.last ? c.order.findIndex((o) => o.id === c.last!.lessonId) + 1 : 0;
  const n = c.order.slice(from).find((o) => !o.done) ?? c.order.find((o) => !o.done) ?? c.order[0];
  return n ? { id: n.id, title: n.title } : null;
}

/**
 * "Continue where you left off" (the Inicio rule): the course touched last, else the first by sort order,
 * with its next lesson. Shared by the home and Mis cursos.
 */
export function resumeCourse(courses: CourseStats[]) {
  const sorted = [...courses].sort((a, b) => a.sort - b.sort);
  const course = sorted.filter((c) => c.last).sort((a, b) => (a.last!.at < b.last!.at ? 1 : -1))[0] ?? sorted[0];
  const next = course ? nextLesson(course) : null;
  return course && next ? { course, next } : null;
}

/** Assignments for the classes the student belongs to (as a student). */
export async function myAssignments(supabase: Client, userId: string): Promise<Assignment[]> {
  const { data: memberships } = await supabase.from("class_members").select("class_id").eq("user_id", userId).eq("member_role", "student");
  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (!classIds.length) return [];
  const { data } = await supabase
    .from("class_assignments")
    .select("id, course_id, module_id, note, due_at, class:classes(name, status), module:modules(title)")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .filter((a) => pick(a.class)?.status === "active")
    .map((a) => ({ id: a.id, courseId: a.course_id, moduleId: a.module_id, moduleTitle: pick(a.module)?.title ?? null, note: a.note, dueAt: a.due_at, className: pick(a.class)?.name ?? "" }));
}

const local = (d: Date | string) => new Date(new Date(d).toLocaleString("en-US", { timeZone: "America/Mexico_City" }));

/** Monday 00:00 of the current week, in Mexico City time. */
export function weekStart() {
  const now = local(new Date());
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  now.setHours(0, 0, 0, 0);
  return now;
}

/** 0 = Monday … 6 = Sunday for a date in the current week, else -1. */
export function weekIndex(d: string | Date) {
  const i = Math.floor((local(d).getTime() - weekStart().getTime()) / 864e5);
  return i >= 0 && i < 7 ? i : -1;
}

export const todayIndex = () => (local(new Date()).getDay() + 6) % 7;
