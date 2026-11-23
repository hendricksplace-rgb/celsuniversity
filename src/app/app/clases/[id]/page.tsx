import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { assignToClass, removeAssignment } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
const field = `w-full rounded-xl border border-[#E4DEEA] bg-white px-3 py-2.5 text-sm font-semibold text-[#1B1830] ${focus}`;
const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

type Client = Awaited<ReturnType<typeof createClient>>;
type RosterCourse = { id: string; title: string; done: number; total: number; at: string | null; quiz: number | null; quizzes: number };
type RosterRow = { id: string; name: string; email: string | null; xp: number; streak: number; last: string | null; behind: boolean; courses: RosterCourse[] };

/** No activity in this many days: the teacher sees "Inactivo" next to the student. */
const BEHIND_DAYS = 14;

/**
 * C-048: the class teacher's roster. RLS returns these students' profiles and progress only to the class's
 * teacher and to staff (private.teaches_user). Lessons counted: what a student does (published, not teacher-only,
 * with content). "Va en": the furthest module (episode/week) the student has touched in that course.
 */
async function classRoster(supabase: Client, studentIds: string[], courseIds: string[]): Promise<RosterRow[]> {
  if (!studentIds.length) return [];
  const [{ data: profiles }, { data: games }, { data: progress }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").in("id", studentIds),
    supabase.from("gamification").select("user_id, total_xp, current_streak, last_activity_date").in("user_id", studentIds),
    supabase.from("progress").select("user_id, lesson_id, status, last_activity, quiz_score, quiz_max_score").in("user_id", studentIds),
    courseIds.length
      ? supabase
          .from("courses")
          .select("id, title, sort_order, modules(id, title, sort_order, status, lessons(id, status, teacher_only, has_content))")
          .in("id", courseIds)
          .order("sort_order")
      : Promise.resolve({ data: [] as never[] }),
  ]);
  // lesson id → its course and module position
  const where = new Map<string, { course: string; sort: number; module: string }>();
  const totals = new Map<string, number>();
  for (const co of courses ?? []) {
    let total = 0;
    for (const m of co.modules ?? []) {
      if (m.status !== "published") continue;
      for (const l of m.lessons ?? []) {
        if (l.status !== "published" || l.teacher_only || !l.has_content) continue;
        total++;
        where.set(l.id, { course: co.id, sort: m.sort_order, module: m.title });
      }
    }
    totals.set(co.id, total);
  }
  const game = new Map((games ?? []).map((g) => [g.user_id, g]));
  return studentIds
    .map((uid) => {
      const p = (profiles ?? []).find((x) => x.id === uid);
      const mine = (progress ?? []).filter((r) => r.user_id === uid && where.has(r.lesson_id));
      const last = mine.reduce<string | null>((a, r) => (r.last_activity && (!a || r.last_activity > a) ? r.last_activity : a), null);
      const g = game.get(uid);
      return {
        id: uid,
        name: p?.display_name || p?.email || "—",
        email: p?.email ?? null,
        xp: g?.total_xp ?? 0,
        streak: g?.current_streak ?? 0,
        last,
        behind: !last || Date.now() - new Date(last).getTime() > BEHIND_DAYS * 86400000,
        courses: (courses ?? []).map((co) => {
          const rows = mine.filter((r) => where.get(r.lesson_id)!.course === co.id);
          // Quiz average (%) over the quizzes this student finished in the course.
          const quizzes = rows.filter((r) => r.status === "completed" && r.quiz_max_score && Number(r.quiz_max_score) > 0);
          const quiz = quizzes.length ? Math.round((quizzes.reduce((a, r) => a + Number(r.quiz_score ?? 0) / Number(r.quiz_max_score), 0) / quizzes.length) * 100) : null;
          const furthest = rows.reduce<{ sort: number; module: string } | null>((a, r) => {
            const w = where.get(r.lesson_id)!;
            return !a || w.sort > a.sort ? w : a;
          }, null);
          return { id: co.id, title: co.title, done: rows.filter((r) => r.status === "completed").length, total: totals.get(co.id) ?? 0, at: furthest?.module ?? null, quiz, quizzes: quizzes.length };
        }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ClassPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const { t } = await getDictionary();
  const c = t.classes;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;

  const { data: cl } = await supabase.from("classes").select("id, name, class_members(user_id, member_role), class_courses(course_id)").eq("id", id).maybeSingle();
  if (!cl) notFound();
  const isAdmin = ["super_admin", "director", "administrator"].includes(viewer.role);
  const canAssign = isAdmin || (cl.class_members ?? []).some((m) => m.user_id === viewer.user.id && m.member_role === "teacher");

  // What can be assigned: the class's courses, or every published course when the class has none yet.
  const classCourseIds = (cl.class_courses ?? []).map((cc) => cc.course_id);
  let coursesQuery = supabase.from("courses").select("id, title, sort_order, modules(id, title, sort_order, status)").eq("status", "published").order("sort_order");
  if (classCourseIds.length) coursesQuery = coursesQuery.in("id", classCourseIds);
  const [{ data: courses }, { data: assignments }] = await Promise.all([
    canAssign ? coursesQuery : Promise.resolve({ data: [] as never[] }),
    supabase.from("class_assignments").select("id, note, due_at, course:courses(title), module:modules(title)").eq("class_id", id).order("created_at", { ascending: false }),
  ]);
  const studentIds = (cl.class_members ?? []).filter((m) => m.member_role === "student").map((m) => m.user_id);
  const students = studentIds.length;
  const roster = canAssign ? await classRoster(supabase, studentIds, classCourseIds) : [];
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/clases" className={`text-sm font-bold text-[#6B6680] hover:text-[#1B1830] ${focus}`}>
          ‹ {c.back}
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{cl.name}</h1>
        <p className="text-sm font-semibold text-[#6B6680]">{students === 1 ? c.student : fill(c.students, { n: students })}</p>
      </div>

      {canAssign && (
        <section className="rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6" data-block="roster">
          <h2 className="text-lg font-extrabold">{c.rosterTitle}</h2>
          <p className="text-sm font-semibold text-[#6B6680]">{c.rosterSub}</p>
          {roster.length ? (
            <ul className="mt-3 divide-y divide-[#F1EDF5]">
              {roster.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-extrabold">
                      {r.name}
                      {r.behind && <span className="ml-2 rounded-full bg-[#FFE3F0] px-2 py-0.5 text-xs font-extrabold text-[#B5007E]">{c.behind}</span>}
                      {r.email && <span className="ml-2 text-xs font-semibold text-[#6B6680]">{r.email}</span>}
                    </p>
                    <p className="text-xs font-bold text-[#6B6680]">
                      {r.last ? fill(c.lastActive, { date: dateOf(r.last) }) : c.neverActive} · {fill(c.xp, { n: r.xp })}
                      {r.streak > 0 && <> · {fill(c.streak, { n: r.streak })}</>}
                    </p>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {r.courses.map((co) => {
                      const pct = co.total ? Math.round((co.done / co.total) * 100) : 0;
                      return (
                        <div key={co.id} className="rounded-2xl bg-[#F7F5FA] px-3 py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-extrabold">{co.title}</span>
                            <span className="text-xs font-extrabold text-[#4A4766]">{pct}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E4DEEA]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={co.title}>
                            <div className="h-full rounded-full bg-[#F5178C]" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[#6B6680]">
                            {fill(c.lessonsDone, { done: co.done, total: co.total })}
                            {co.at && <> · {fill(c.at, { where: co.at })}</>}
                          </p>
                          {co.quiz !== null && (
                            <p className="mt-0.5 text-xs font-extrabold text-[#4A4766]">{fill(c.quizAvg, { pct: co.quiz, n: co.quizzes })}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[#6B6680]">{c.rosterEmpty}</p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold">{c.assignments}</h2>
          {assignments?.length ? (
            <ul className="mt-3 divide-y divide-[#F1EDF5]">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {pick(a.course)?.title}
                      {pick(a.module) && <span className="font-semibold text-[#6B6680]"> · {pick(a.module)!.title}</span>}
                    </p>
                    {a.note && <p className="mt-0.5 text-sm text-[#4A4766]">{a.note}</p>}
                    <p className="mt-0.5 text-xs font-bold text-[#6B6680]">
                      {a.due_at ? fill(c.dueOn, { date: new Date(a.due_at).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) }) : c.noDue}
                    </p>
                  </div>
                  {canAssign && (
                    <form action={removeAssignment.bind(null, id, a.id)}>
                      <button className={`rounded-full px-3 py-1.5 text-xs font-extrabold text-[#D10F75] hover:bg-[#FFE3F0] ${focus}`}>{c.remove}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[#6B6680]">{c.noAssignments}</p>
          )}
        </section>

        {canAssign && (
          <section className="rounded-3xl border-2 border-[#14182B] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-extrabold">{c.assignTitle}</h2>
            {error && <p className="mt-2 rounded-xl bg-[#FFE3F0] px-3 py-2 text-sm font-bold text-[#B5007E]">{c.error}</p>}
            <form action={assignToClass.bind(null, id)} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-extrabold">{c.what}</span>
                <select name="what" required className={`mt-1 ${field}`}>
                  {(courses ?? []).map((co) => (
                    <optgroup key={co.id} label={co.title}>
                      <option value={co.id}>
                        {co.title} · {c.wholeCourse}
                      </option>
                      {(co.modules ?? [])
                        .filter((m) => m.status === "published")
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((m) => (
                          <option key={m.id} value={`${co.id}:${m.id}`}>
                            {m.title}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-extrabold">{c.due}</span>
                <input type="date" name="due" className={`mt-1 ${field}`} />
              </label>
              <label className="block">
                <span className="text-sm font-extrabold">{c.note}</span>
                <textarea name="note" maxLength={280} rows={3} placeholder={c.notePlaceholder} className={`mt-1 ${field}`} />
              </label>
              <button className={`w-full rounded-full bg-[#14182B] px-5 py-3 text-sm font-extrabold text-white ${focus}`}>{c.save}</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
