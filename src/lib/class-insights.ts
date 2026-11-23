import "server-only";
import type { createClient } from "@/lib/supabase/server";

// C-048 teacher view: what a class teacher sees about their students. Everything is read with the teacher's own
// session, so RLS limits it to the students of classes they teach (private.teaches_user) and admins.
// Lessons counted are the student ones (published, not teacher-only, with content). Scores are quiz lessons
// (lesson_type 'quiz' with a quiz_max_score), shown as a percent.

type Client = Awaited<ReturnType<typeof createClient>>;

/** Activity in the last ACTIVE_DAYS = active; up to INACTIVE_DAYS = slowing down; after that = inactive. */
export const ACTIVE_DAYS = 7;
export const INACTIVE_DAYS = 14;
/** A unit whose class quiz average is under this gets "Review in class". */
export const REVIEW_BELOW = 70;
/** A student whose quiz average is under this needs attention (C-049), like one inactive INACTIVE_DAYS+ days. */
export const ATTENTION_QUIZ_BELOW = 60;
export type Status = "active" | "slowing" | "inactive" | "not_started";
export const scoreTone = (pct: number) => (pct >= 80 ? "good" : pct >= 60 ? "ok" : "low");

type LessonRow = { id: string; title: string; lesson_type: string; sort_order: number; status: string; teacher_only: boolean; has_content: boolean };
type ModuleRow = { id: string; title: string; sort_order: number; status: string; kind: string; lessons: LessonRow[] };
type CourseRow = { id: string; title: string; sort_order: number; modules: ModuleRow[] };
type ProgressRow = { user_id: string; lesson_id: string; status: string; last_activity: string | null; quiz_score: number | null; quiz_max_score: number | null };

export type Unit = { id: string; title: string; n: number; courseId: string; lessons: { id: string; title: string; quiz: boolean }[] };
export type UnitResult = { unit: Unit; done: number; total: number; quiz: number | null; quizAt: string | null; last: string | null };
export type CourseResult = {
  id: string;
  title: string;
  done: number;
  total: number;
  pct: number;
  quiz: number | null;
  quizzes: number;
  at: { unit: string; lesson: string } | null;
  units: UnitResult[];
};
export type StudentInsight = {
  id: string;
  name: string;
  email: string | null;
  status: Status;
  daysAway: number | null;
  last: string | null;
  streak: number;
  xp: number;
  quiz: number | null;
  courses: CourseResult[];
};

/**
 * The one rule for "needs attention" (C-049 director cards and tiles, C-048 teacher dashboard): inactive for
 * INACTIVE_DAYS+ days (or never started), or a quiz average under ATTENTION_QUIZ_BELOW %. Returns the reason.
 */
export function attentionReason(s: Pick<StudentInsight, "status" | "daysAway" | "quiz">): { kind: "inactive" | "not_started" | "quiz"; days?: number; pct?: number } | null {
  if (s.status === "not_started") return { kind: "not_started" };
  if (s.status === "inactive") return { kind: "inactive", days: s.daysAway ?? undefined };
  if (s.quiz !== null && s.quiz < ATTENTION_QUIZ_BELOW) return { kind: "quiz", pct: s.quiz };
  return null;
}

const pctOf = (r: ProgressRow) => (r.quiz_max_score && Number(r.quiz_max_score) > 0 ? (Number(r.quiz_score ?? 0) / Number(r.quiz_max_score)) * 100 : null);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

function statusOf(days: number | null): Status {
  if (days === null) return "not_started";
  if (days < ACTIVE_DAYS) return "active";
  if (days < INACTIVE_DAYS) return "slowing";
  return "inactive";
}

/** The class's courses as ordered units (episodes / weeks) with their student lessons. */
async function loadUnits(supabase: Client, courseIds: string[]) {
  if (!courseIds.length) return [] as { id: string; title: string; units: Unit[] }[];
  const { data } = await supabase
    .from("courses")
    .select("id, title, sort_order, modules(id, title, sort_order, status, kind, lessons(id, title, lesson_type, sort_order, status, teacher_only, has_content))")
    .in("id", courseIds)
    .order("sort_order");
  return ((data ?? []) as unknown as CourseRow[]).map((co) => {
    const units = co.modules
      .filter((m) => m.status === "published" && m.kind === "lesson_week")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m, i) => ({
        id: m.id,
        title: m.title,
        n: i + 1,
        courseId: co.id,
        lessons: m.lessons
          .filter((l) => l.status === "published" && !l.teacher_only && l.has_content)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((l) => ({ id: l.id, title: l.title, quiz: l.lesson_type === "quiz" })),
      }))
      .filter((u) => u.lessons.length > 0);
    return { id: co.id, title: co.title, units };
  });
}

function courseResult(course: { id: string; title: string; units: Unit[] }, rows: Map<string, ProgressRow>): CourseResult {
  const units = course.units.map((unit) => {
    const mine = unit.lessons.map((l) => rows.get(l.id)).filter((r): r is ProgressRow => !!r);
    const quizRows = unit.lessons.filter((l) => l.quiz).map((l) => rows.get(l.id)).filter((r): r is ProgressRow => !!r && r.status === "completed" && pctOf(r) !== null);
    const last = mine.reduce<string | null>((a, r) => (r.last_activity && (!a || r.last_activity > a) ? r.last_activity : a), null);
    return {
      unit,
      done: mine.filter((r) => r.status === "completed").length,
      total: unit.lessons.length,
      quiz: avg(quizRows.map((r) => pctOf(r)!)),
      quizAt: quizRows[0]?.last_activity ?? null,
      last,
    };
  });
  // Where they are: the latest lesson they touched (by date), in this course.
  let at: CourseResult["at"] = null;
  let atTime = "";
  for (const u of course.units)
    for (const l of u.lessons) {
      const r = rows.get(l.id);
      if (r?.last_activity && r.last_activity > atTime) {
        atTime = r.last_activity;
        at = { unit: u.title, lesson: l.title };
      }
    }
  const done = units.reduce((a, u) => a + u.done, 0);
  const total = units.reduce((a, u) => a + u.total, 0);
  const quizzes = units.filter((u) => u.quiz !== null);
  return {
    id: course.id,
    title: course.title,
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    quiz: avg(quizzes.map((u) => u.quiz!)),
    quizzes: quizzes.length,
    at,
    units,
  };
}

/** Every student of the class, with status, streak, XP, progress and quiz averages per course. */
export async function classInsights(supabase: Client, studentIds: string[], courseIds: string[]) {
  const courses = await loadUnits(supabase, courseIds);
  if (!studentIds.length) return { courses, students: [] as StudentInsight[] };
  const [{ data: profiles }, { data: games }, { data: progress }, { data: xp }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").in("id", studentIds),
    supabase.from("gamification").select("user_id, total_xp, current_streak").in("user_id", studentIds),
    supabase.from("progress").select("user_id, lesson_id, status, last_activity, quiz_score, quiz_max_score").in("user_id", studentIds),
    // Activity also counts from XP events in the class's courses (C-049 definition of "active").
    courseIds.length
      ? supabase.from("xp_events").select("user_id, created_at").in("user_id", studentIds).in("course_id", courseIds).order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] as { user_id: string; created_at: string }[] }),
  ]);
  const lastXp = new Map<string, string>();
  for (const e of xp ?? []) if (!lastXp.has(e.user_id)) lastXp.set(e.user_id, e.created_at);
  const byUser = new Map<string, Map<string, ProgressRow>>();
  for (const r of (progress ?? []) as ProgressRow[]) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
    byUser.get(r.user_id)!.set(r.lesson_id, r);
  }
  const lessonIds = new Set(courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => l.id))));
  const students = studentIds.map((uid) => {
    const p = (profiles ?? []).find((x) => x.id === uid);
    const g = (games ?? []).find((x) => x.user_id === uid);
    const rows = byUser.get(uid) ?? new Map<string, ProgressRow>();
    const lastLesson = [...rows.values()].filter((r) => lessonIds.has(r.lesson_id)).reduce<string | null>((a, r) => (r.last_activity && (!a || r.last_activity > a) ? r.last_activity : a), null);
    const xpAt = lastXp.get(uid) ?? null;
    const last = xpAt && (!lastLesson || xpAt > lastLesson) ? xpAt : lastLesson;
    const days = daysSince(last);
    const cs = courses.map((c) => courseResult(c, rows));
    const allQuiz = cs.flatMap((c) => c.units.filter((u) => u.quiz !== null).map((u) => u.quiz!));
    return {
      id: uid,
      name: p?.display_name || p?.email || "—",
      email: p?.email ?? null,
      status: statusOf(days),
      daysAway: days,
      last,
      streak: days !== null && days <= 1 ? (g?.current_streak ?? 0) : 0,
      xp: g?.total_xp ?? 0,
      quiz: avg(allQuiz),
      courses: cs,
    } satisfies StudentInsight;
  });
  return { courses, students: students.sort((a, b) => a.name.localeCompare(b.name)) };
}

export type ClassFocus = {
  active: number;
  slowing: number;
  inactive: number;
  notStarted: number;
  /** Students who need attention (attentionReason). */
  attention: number;
  total: number;
  progress: { id: string; title: string; pct: number }[];
  quiz: number | null;
  reachOut: StudentInsight[];
  review: { course: string; unit: string; pct: number; students: number }[];
  mostOn: { course: string; unit: string; students: number }[];
  shining: { student: StudentInsight; why: string }[];
};

/** The class summary and the "What to focus on next" list. */
export function classFocus(courses: { id: string; title: string; units: Unit[] }[], students: StudentInsight[]): ClassFocus {
  const count = (s: Status) => students.filter((x) => x.status === s).length;
  const progress = courses.map((c) => ({
    id: c.id,
    title: c.title,
    pct: avg(students.map((s) => s.courses.find((x) => x.id === c.id)?.pct ?? 0)) ?? 0,
  }));
  const quiz = avg(students.filter((s) => s.quiz !== null).map((s) => s.quiz!));

  // Units the class struggles with: class quiz average under REVIEW_BELOW, with at least 2 students' scores.
  const review = courses
    .flatMap((c) =>
      c.units.map((u) => {
        const scores = students.map((s) => s.courses.find((x) => x.id === c.id)?.units.find((x) => x.unit.id === u.id)?.quiz).filter((x): x is number => typeof x === "number");
        return { course: c.title, unit: u.title, pct: avg(scores) ?? 100, students: scores.length };
      }),
    )
    .filter((x) => x.students >= 2 && x.pct < REVIEW_BELOW)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  // Where most active students are right now, per course (a topic for the next live class).
  const mostOn = courses
    .map((c) => {
      const tally = new Map<string, number>();
      for (const s of students) {
        if (s.status === "inactive" || s.status === "not_started") continue;
        const at = s.courses.find((x) => x.id === c.id)?.at;
        if (at) tally.set(at.unit, (tally.get(at.unit) ?? 0) + 1);
      }
      const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      return top ? { course: c.title, unit: top[0], students: top[1] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const reachOut = students
    .filter((s) => s.status === "slowing" || s.status === "inactive" || s.status === "not_started")
    .sort((a, b) => (b.daysAway ?? 9999) - (a.daysAway ?? 9999));

  const shining = students
    .flatMap((s) => {
      if (s.streak >= 7) return [{ student: s, why: `${s.streak}-day streak` }];
      if (s.quiz !== null && s.quiz >= 90 && s.status === "active") return [{ student: s, why: `${s.quiz}% quiz average` }];
      return [];
    })
    .slice(0, 4);

  return { active: count("active"), slowing: count("slowing"), inactive: count("inactive"), notStarted: count("not_started"), attention: students.filter((s) => attentionReason(s)).length, total: students.length, progress, quiz, reachOut, review, mostOn, shining };
}

/** A student's weakest units (lowest quiz scores under 80 %), for "Needs help with". */
export const weakest = (s: StudentInsight) =>
  s.courses
    .flatMap((c) => c.units.filter((u) => u.quiz !== null && u.quiz < 80).map((u) => ({ course: c.title, unit: u.unit.title, pct: u.quiz! })))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

// ---- C-049: the director's school view -------------------------------------------------------------------

/** A student's overall progress: the average of their course percentages. */
export const studentProgress = (s: StudentInsight) => (s.courses.length ? Math.round(s.courses.reduce((a, c) => a + c.pct, 0) / s.courses.length) : 0);

export type LocationCard = {
  id: string;
  name: string;
  schedule: string | null;
  teacher: string | null;
  students: StudentInsight[];
  focus: ClassFocus;
  progress: number;
  behind: { student: StudentInsight; reason: NonNullable<ReturnType<typeof attentionReason>> }[];
  attentionShare: number;
};

/**
 * Every active class (location) of the director's school, each with the same numbers as its class page, sorted
 * by the share of students who need attention (highest first). Read with the director's session: RLS
 * (private.directs_org / directs_user) returns only their school.
 */
export async function schoolInsights(supabase: Client, orgId: string) {
  const [{ data: org }, { data: classes }] = await Promise.all([
    supabase.from("organizations").select("id, name, logo_url").eq("id", orgId).maybeSingle(),
    supabase
      .from("classes")
      .select("id, name, schedule_label, class_members(user_id, member_role), class_courses(course_id)")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("name"),
  ]);
  const teacherIds = [...new Set((classes ?? []).flatMap((c) => (c.class_members ?? []).filter((m) => m.member_role === "teacher").map((m) => m.user_id)))];
  const { data: teachers } = teacherIds.length ? await supabase.from("profiles").select("id, display_name, email").in("id", teacherIds) : { data: [] };

  const cards: LocationCard[] = await Promise.all(
    (classes ?? []).map(async (c) => {
      const studentIds = (c.class_members ?? []).filter((m) => m.member_role === "student").map((m) => m.user_id);
      const { courses, students } = await classInsights(supabase, studentIds, (c.class_courses ?? []).map((cc) => cc.course_id));
      const t = (c.class_members ?? []).find((m) => m.member_role === "teacher");
      const tp = t ? (teachers ?? []).find((x) => x.id === t.user_id) : null;
      const behind = students
        .map((s) => ({ student: s, reason: attentionReason(s) }))
        .filter((x): x is LocationCard["behind"][number] => !!x.reason)
        .sort((a, b) => (b.student.daysAway ?? 9999) - (a.student.daysAway ?? 9999));
      return {
        id: c.id,
        name: c.name,
        schedule: c.schedule_label,
        teacher: tp ? tp.display_name || tp.email : null,
        students,
        focus: classFocus(courses, students),
        progress: avg(students.map(studentProgress)) ?? 0,
        behind,
        attentionShare: students.length ? behind.length / students.length : 0,
      };
    }),
  );
  cards.sort((a, b) => b.attentionShare - a.attentionShare || a.name.localeCompare(b.name));

  // Company totals: every student once, even if they're in two locations.
  const all = new Map<string, StudentInsight>();
  for (const c of cards) for (const s of c.students) if (!all.has(s.id)) all.set(s.id, s);
  const everyone = [...all.values()];
  const totals = {
    students: everyone.length,
    active: everyone.filter((s) => s.status === "active").length,
    progress: avg(everyone.map(studentProgress)) ?? 0,
    quiz: avg(everyone.filter((s) => s.quiz !== null).map((s) => s.quiz!)),
    attention: everyone.filter((s) => attentionReason(s)).length,
  };
  return { org, cards, totals };
}
