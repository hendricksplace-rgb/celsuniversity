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
  const students = (cl.class_members ?? []).filter((m) => m.member_role === "student").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/clases" className={`text-sm font-bold text-[#6B6680] hover:text-[#1B1830] ${focus}`}>
          ‹ {c.back}
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{cl.name}</h1>
        <p className="text-sm font-semibold text-[#6B6680]">{students === 1 ? c.student : fill(c.students, { n: students })}</p>
      </div>

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
