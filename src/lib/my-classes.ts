// Data for Mis clases (/app/clases), student side: which view to show (in an active class as a student, or
// not yet), the next live session, the class tasks with their due chips, the class card (teacher, classmates,
// courses) and the coach's latest comments; for students without a class, the "Mientras tanto" tiles.
import type { Client } from "@/lib/supabase/types";
import { accessibleCourses, courseStats, nextLesson, resumeCourse, type CourseStats } from "@/lib/learning";
import { taskTime } from "@/lib/bsns";
import { themeForCourse, type ThemeKey } from "@/lib/themes";

/** profiles has no time zone column yet: every time on the page is shown in Mexico City time. */
export const CLASS_TZ = "America/Mexico_City";

const pick = <T>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const ymd = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: CLASS_TZ });
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);

export const initials = (name: string | null | undefined) => {
  const parts = (name ?? "")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
};
const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || null;

/** The due chip: pink within 3 days (or late), amber further out, mint once the task is done. */
export type Due = { kind: "done" } | { kind: "late"; at: string } | { kind: "today" } | { kind: "on"; at: string } | { kind: "in"; days: number } | { kind: "none" };

export type ClassTask = {
  id: string;
  brand: ThemeKey;
  cover: string | null;
  courseTitle: string;
  /** "Semana 3" for a module task (unit name from the dictionary + number), null for a whole course. */
  unit: number | null;
  title: string;
  note: string | null;
  author: { name: string | null; initials: string } | null;
  due: Due;
  done: boolean;
  href: string;
};
export type Person = { id: string; name: string | null; initials: string };
export type ClassCard = {
  id: string;
  name: string;
  schedule: string | null;
  teacher: Person | null;
  /** Null when the names can't be read (no server-only client): the classmates line is left out. */
  mates: Person[] | null;
  courses: { title: string; brand: ThemeKey }[];
};
export type NextSession = {
  classId: string;
  className: string;
  at: string;
  durationMin: number | null;
  meetingUrl: string | null;
  teacher: string | null;
};
export type Feedback = {
  id: string;
  week: number | null;
  task: string;
  status: "reviewed" | "submitted";
  text: string | null;
  coach: string | null;
  at: string | null;
};

export function dueOf(dueAt: string | null, done: boolean, now = new Date()): Due {
  if (done) return { kind: "done" };
  if (!dueAt) return { kind: "none" };
  const d = dayDiff(ymd(dueAt), ymd(now));
  if (new Date(dueAt) < now) return { kind: "late", at: dueAt };
  if (d <= 0) return { kind: "today" };
  if (d <= 3) return { kind: "on", at: dueAt };
  return { kind: "in", days: d };
}

/** The student's active classes (as a student), with the live-session fields. */
async function studentClasses(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("class_members")
    .select("class:classes(id, name, status, next_session_at, duration_min, meeting_url, schedule_label, class_courses(course:courses(id, slug, title, sort_order)))")
    .eq("user_id", userId)
    .eq("member_role", "student");
  return (data ?? [])
    .map((m) => pick(m.class))
    .filter((c): c is NonNullable<typeof c> => !!c && c.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function loadMyClass(supabase: Client, userId: string) {
  const classes = await studentClasses(supabase, userId);
  if (!classes.length) return null;
  const classIds = classes.map((c) => c.id);

  const [{ data: rows }, { data: subs }] = await Promise.all([
    supabase
      .from("class_assignments")
      .select("id, class_id, course_id, module_id, note, due_at, created_by, created_at, course:courses(id, slug, title, cover_art_url), module:modules(id, title, sort_order)")
      .in("class_id", classIds),
    supabase
      .from("submissions")
      .select("id, status, coach_feedback, reviewed_by, reviewed_at, submitted_at, updated_at, lesson:lessons(title, module:modules(sort_order))")
      .eq("user_id", userId)
      .in("status", ["reviewed", "submitted"])
      .order("updated_at", { ascending: false })
      .limit(2),
  ]);

  // Names in the class: class_members and profiles RLS only show a student their own row, so the names come from
  // my_class_people() (security definer, scoped to the caller's own classes and reviews).
  // Course progress for the tasks loads alongside the names.
  const statsP = courseStats(supabase, userId, [...new Set((rows ?? []).map((r) => r.course_id))]);
  const { data: people } = await supabase.rpc("my_class_people");
  const members = (people ?? []).filter((m) => m.class_id && (m.member_role === "student" || m.member_role === "teacher")).map((m) => ({ class_id: m.class_id!, user_id: m.user_id, member_role: m.member_role }));
  const profiles = (people ?? []).map((p) => ({ id: p.user_id, display_name: p.display_name }));
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name?.trim() || null]));
  const person = (id: string): Person => ({
    id,
    name: nameOf.get(id) ?? null,
    initials: initials(nameOf.get(id)),
  });

  const teacherOf = new Map<string, Person>();
  const cards: ClassCard[] = classes.map((c) => {
    const ms = (members ?? []).filter((m) => m.class_id === c.id);
    const t = ms.find((m) => m.member_role === "teacher");
    const teacher = t ? person(t.user_id) : null;
    if (teacher) teacherOf.set(c.id, teacher);
    return {
      id: c.id,
      name: c.name,
      schedule: c.schedule_label?.trim() || null,
      teacher,
      mates: ms.filter((m) => m.member_role === "student" && m.user_id !== userId).map((m) => person(m.user_id)),
      courses: (c.class_courses ?? [])
        .map((cc) => pick(cc.course))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((x) => ({
          title: x.title.replace(/^Cels\w+:\s*/, ""),
          brand: brandOf(x.slug),
        })),
    };
  });

  // Next live session: the soonest one still ahead, across the student's classes.
  const now = Date.now();
  const ahead = classes.filter((c) => c.next_session_at && Date.parse(c.next_session_at) > now).sort((a, b) => Date.parse(a.next_session_at!) - Date.parse(b.next_session_at!))[0];
  const next: NextSession | null = ahead
    ? {
        classId: ahead.id,
        className: ahead.schedule_label ? `${ahead.name} · ${ahead.schedule_label}` : ahead.name,
        at: ahead.next_session_at!,
        durationMin: ahead.duration_min,
        meetingUrl: ahead.meeting_url && /^https:\/\//.test(ahead.meeting_url) ? ahead.meeting_url : null,
        teacher: teacherOf.get(ahead.id)?.name ?? null,
      }
    : null;

  // Tasks: completion and the lesson to open come from the student's course progress.
  const stats = await statsP;
  const tasks: ClassTask[] = (rows ?? []).flatMap((r) => {
    const course = pick(r.course);
    if (!course) return [];
    const mod = pick(r.module);
    const st = stats.get(r.course_id);
    const done = mod ? !!st?.modules.find((m) => m.id === mod.id)?.complete : !!st?.completed;
    const author = r.created_by ? person(r.created_by) : (teacherOf.get(r.class_id) ?? null);
    return [
      {
        id: r.id,
        brand: st?.brand ?? brandOf(course.slug),
        cover: course.cover_art_url,
        courseTitle: course.title.replace(/^Cels\w+:\s*/, ""),
        unit: mod && st ? st.modules.findIndex((m) => m.id === mod.id) + 1 || null : null,
        // "Week 3 – Management and Leadership" → "Management and Leadership": the kicker already says SEMANA 3.
        title: mod ? mod.title.replace(/^(Module|Week|Episode|Episodio|Módulo|Semana)\s*\d+\s*[:–—-]\s*/i, "").trim() || mod.title : course.title,
        note: r.note,
        author: author ? { name: firstName(author.name), initials: author.initials } : null,
        due: dueOf(r.due_at, done),
        done,
        href: taskHref(course.slug, st, mod?.id ?? null, done),
      },
    ];
  });
  const dueRank = (t: ClassTask) => (t.done ? 2 : 0);
  const dueAt = (id: string) => (rows ?? []).find((r) => r.id === id)?.due_at ?? null;
  tasks.sort((a, b) => {
    if (dueRank(a) !== dueRank(b)) return dueRank(a) - dueRank(b);
    const da = dueAt(a.id);
    const dbb = dueAt(b.id);
    if (da && dbb) return da < dbb ? -1 : da > dbb ? 1 : 0;
    return da ? -1 : dbb ? 1 : 0;
  });

  const feedback: Feedback[] = (subs ?? []).map((s) => {
    const lesson = pick(s.lesson);
    const mod = pick(lesson?.module);
    return {
      id: s.id,
      week: mod ? (mod.sort_order ?? 0) + 1 : null,
      task: taskTime(lesson?.title ?? "").name,
      status: s.status === "reviewed" ? "reviewed" : "submitted",
      text: s.status === "reviewed" ? s.coach_feedback : null,
      coach: s.reviewed_by ? (nameOf.get(s.reviewed_by) ?? null) : null,
      at: s.reviewed_at ?? s.submitted_at,
    };
  });

  return { next, tasks, classes: cards, feedback };
}

function taskHref(slug: string | null, st: CourseStats | undefined, moduleId: string | null, done: boolean) {
  if (!st) return `/app/cursos/${slug}`;
  const order = moduleId ? st.order.filter((o) => o.moduleId === moduleId) : st.order;
  if (!order.length) return `/app/cursos/${slug}`;
  if (done) return `/app/lecciones/${order[0].id}`;
  const n = moduleId ? (order.find((o) => !o.done) ?? order[0]) : nextLesson(st);
  return n ? `/app/lecciones/${n.id}` : `/app/cursos/${slug}`;
}

const brandOf = (slug: string | null) => themeForCourse({ slug });

/** "Mientras tanto" for students without a class: the Inicio resume rule, their evaluation level. */
export async function loadNoClass(supabase: Client, userId: string) {
  const [access, { data: profile }] = await Promise.all([accessibleCourses(supabase, userId), supabase.from("profiles").select("evaluation_level").eq("id", userId).maybeSingle()]);
  const stats = await courseStats(supabase, userId, access.ids);
  const r = resumeCourse([...stats.values()]);
  const unit = r ? r.course.modules.findIndex((m) => m.id === r.course.order.find((o) => o.id === r.next.id)?.moduleId) + 1 : 0;
  return {
    resume: r
      ? {
          lessonId: r.next.id,
          brand: r.course.brand,
          courseTitle: r.course.title,
          unit: unit || null,
          started: r.course.started,
        }
      : null,
    level: profile?.evaluation_level ?? null,
  };
}

export type MyClassData = NonNullable<Awaited<ReturnType<typeof loadMyClass>>>;
export type NoClassData = Awaited<ReturnType<typeof loadNoClass>>;
