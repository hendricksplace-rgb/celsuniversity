// C-048: one student, as their teacher sees them (English only). Scores per episode / week, where they are, and
// what they need help with. Only the class's teacher and admins (RLS returns the data to nobody else).
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";
import { canSeeClassStudents } from "@/lib/class-access";
import { classInsights, weakest } from "@/lib/class-insights";
import { Bar, Score, StatusChip, ago, card, fmtDate, focus } from "@/components/classes/TeacherView";

type Props = { params: Promise<{ id: string; uid: string }> };

export default async function StudentPage({ params }: Props) {
  const { id, uid } = await params;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;

  const { data: cl } = await supabase.from("classes").select("id, name, organization_id, class_members(user_id, member_role), class_courses(course_id)").eq("id", id).maybeSingle();
  if (!cl) notFound();
  const members = cl.class_members ?? [];
  if (!members.some((m) => m.user_id === uid && m.member_role === "student")) notFound();
  if (!canSeeClassStudents(viewer, cl)) notFound();

  const { students } = await classInsights(supabase, [uid], (cl.class_courses ?? []).map((c) => c.course_id));
  const s = students[0];
  if (!s) notFound();
  const weak = weakest(s);

  return (
    <div className="space-y-6" lang="en">
      <div>
        <Link href={`/app/clases/${id}`} className={`text-sm font-bold text-[#6B6680] hover:text-[#1B1830] ${focus}`}>
          ‹ {cl.name}
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-extrabold sm:text-4xl">
          {s.name} <StatusChip status={s.status} days={s.daysAway} />
        </h1>
        {s.email && <p className="text-sm font-semibold text-[#6B6680]">{s.email}</p>}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-block="student-stats">
        {[
          { n: ago(s.daysAway), l: s.last ? `Last active · ${fmtDate(s.last)}` : "Last active" },
          { n: s.streak > 0 ? `🔥 ${s.streak}` : "0", l: "Day streak" },
          { n: s.quiz === null ? "—" : `${s.quiz}%`, l: "Quiz average" },
          { n: s.xp.toLocaleString("en-US"), l: "XP earned" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-[#EFE6F2] bg-white px-4 py-3 shadow-sm">
            <p className="text-xl font-extrabold">{x.n}</p>
            <p className="text-xs font-bold text-[#6B6680]">{x.l}</p>
          </div>
        ))}
      </section>

      {weak.length > 0 && (
        <section className="rounded-3xl border border-[#FFE7A8] bg-[#FFFBEF] p-5" data-block="needs-help">
          <h2 className="text-base font-extrabold">Needs help with</h2>
          <p className="text-xs font-semibold text-[#6B6680]">Their lowest quiz scores. A good place to start a one-on-one.</p>
          <ul className="mt-2 space-y-1">
            {weak.map((w) => (
              <li key={w.course + w.unit} className="flex flex-wrap items-center gap-2 text-sm font-bold">
                {w.unit} <span className="text-xs font-semibold text-[#6B6680]">· {w.course}</span> <Score pct={w.pct} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.courses.map((c) => {
        const started = c.units.filter((u) => u.done > 0 || u.last);
        return (
          <section key={c.id} className={card} data-block="student-course">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-extrabold">{c.title}</h2>
              <Score pct={c.quiz} label="Quizzes" />
            </div>
            <div className="mt-2">
              <Bar pct={c.pct} label={c.title} />
            </div>
            <p className="mt-1 text-sm font-semibold text-[#4A4766]">
              {c.pct}% complete · {c.done} of {c.total} lessons
              {c.at && (
                <>
                  {" "}
                  · Currently on <b>{c.at.unit}</b> ({c.at.lesson})
                </>
              )}
            </p>
            {started.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-extrabold uppercase tracking-wide text-[#6B6680]">
                      <th className="py-2 pr-3">Unit</th>
                      <th className="py-2 pr-3">Parts done</th>
                      <th className="py-2 pr-3">Quiz</th>
                      <th className="py-2">Last activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EDF5]">
                    {started.map((u) => (
                      <tr key={u.unit.id}>
                        <td className="py-2 pr-3 font-bold">{u.unit.title}</td>
                        <td className="py-2 pr-3 font-semibold">
                          {u.done} / {u.total} {u.done === u.total && "✓"}
                        </td>
                        <td className="py-2 pr-3">
                          <Score pct={u.quiz} />
                        </td>
                        <td className="py-2 text-xs font-semibold text-[#6B6680]">{u.last ? fmtDate(u.last) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-[#6B6680]">Hasn&apos;t started this course yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
