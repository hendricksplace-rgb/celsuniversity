// C-051 Admin → Clases: create (/app/admin/clases/nueva) or edit one class. The form saves the class fields
// and its courses; below it, teachers and students are added by search and removed with a confirm step.
// super_admin and administrator only (RLS checks every write again).
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { btn, input, label as labelCls } from "@/components/builder/ui";
import { ConfirmRemove } from "@/components/admin/ConfirmRemove";
import { addMember, removeMember, saveClass } from "../actions";

export const metadata = { title: "Clase · Admin · CelsU" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; qt?: string; qs?: string }> };
type T = Awaited<ReturnType<typeof getDictionary>>["t"]["adminClasses"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const clean = (q: string | undefined) => (q ?? "").trim().slice(0, 80).replace(/[%,()]/g, "");

/** An ISO time as the value of a datetime-local input in Mexico City time (UTC-6). */
function mexicoLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) - 6 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="text-xs font-semibold text-[#6B6680]">{hint}</span>}
    </label>
  );
}

export default async function AdminClase({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { t: all } = await getDictionary();
  const t = all.adminClasses;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) notFound();

  const isNew = id === "nueva";
  if (!isNew && !UUID.test(id)) notFound();
  const [{ data: cl }, { data: orgs }, { data: courses }] = await Promise.all([
    isNew
      ? Promise.resolve({ data: null })
      : supabase
          .from("classes")
          .select("id, name, organization_id, schedule_label, schedule_label_en, next_session_at, duration_min, meeting_url, status, class_courses(course_id), class_members(user_id, member_role)")
          .eq("id", id)
          .maybeSingle(),
    supabase.from("organizations").select("id, name").order("name"),
    supabase.from("courses").select("id, title, status, sort_order").order("sort_order"),
  ]);
  if (!isNew && !cl) notFound();
  const chosen = new Set((cl?.class_courses ?? []).map((c) => c.course_id));
  const members = cl?.class_members ?? [];

  const errors: Record<string, string> = { name: t.errName, schedule: t.errSchedule, duration: t.errDuration, meeting: t.errMeeting, date: t.errDate, save: t.errSave, member: t.errMember };
  const ok = sp.ok === "created" ? t.created : sp.ok === "saved" ? t.saved : null;
  const error = sp.error ? (errors[sp.error] ?? t.errSave) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/admin/clases" className="text-sm font-bold text-[#6B6680] hover:text-[#1B1830]">
          ‹ {t.back}
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{isNew ? t.newTitle : cl!.name}</h1>
      </div>
      {ok && (
        <p role="status" className="rounded-2xl bg-[#E3F7EC] px-4 py-3 text-sm font-bold text-[#0F6B3A]">
          {ok}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-[#FFE3F0] px-4 py-3 text-sm font-bold text-[#B5007E]">
          {error}
        </p>
      )}

      <form action={saveClass.bind(null, isNew ? null : id)} className="space-y-5 rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6" data-form="class">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.name}>
            <input name="name" required maxLength={120} defaultValue={cl?.name ?? ""} placeholder={t.namePh} className={input} />
          </Field>
          <Field label={t.org}>
            <select name="organization_id" defaultValue={cl?.organization_id ?? ""} className={input}>
              <option value="">{t.noOrg}</option>
              {(orgs ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.scheduleEs}>
            <input name="schedule_label" lang="es" required={isNew} maxLength={120} defaultValue={cl?.schedule_label ?? ""} placeholder={t.scheduleEsPh} className={input} />
          </Field>
          <Field label={t.scheduleEn}>
            <input name="schedule_label_en" lang="en" required={isNew} maxLength={120} defaultValue={cl?.schedule_label_en ?? ""} placeholder={t.scheduleEnPh} className={input} />
          </Field>
          <Field label={t.next}>
            <input type="datetime-local" name="next_session_at" defaultValue={mexicoLocal(cl?.next_session_at ?? null)} className={input} />
          </Field>
          <Field label={t.duration}>
            <input type="number" name="duration_min" min={5} max={600} step={5} defaultValue={cl?.duration_min ?? 60} className={input} />
          </Field>
          <Field label={t.meeting} hint={t.meetingHint}>
            <input type="url" name="meeting_url" pattern="https://.*" defaultValue={cl?.meeting_url ?? ""} placeholder="https://" className={input} />
          </Field>
          <Field label={t.status} hint={t.archiveHint}>
            <select name="status" defaultValue={cl?.status ?? "active"} className={input}>
              <option value="active">{t.active}</option>
              <option value="archived">{t.archived}</option>
            </select>
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className={labelCls}>{t.courses}</legend>
          <p className="text-xs font-semibold text-[#6B6680]">{t.coursesHint}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(courses ?? []).map((c) => (
              <label key={c.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#EFE6F2] px-3 py-2 text-sm font-semibold">
                <input type="checkbox" name="course" value={c.id} defaultChecked={chosen.has(c.id)} className="h-4 w-4 accent-[#D6006A]" />
                {c.title}
                {c.status !== "published" && <span className="text-xs text-[#6B6680]">({c.status})</span>}
              </label>
            ))}
          </div>
        </fieldset>
        <button className={btn.primary}>{isNew ? t.create : t.save}</button>
      </form>

      {isNew ? (
        <p className="rounded-3xl border border-[#EFE6F2] bg-white p-5 text-sm font-semibold text-[#4A4766]">{t.saveFirst}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <People t={t} classId={id} role="teacher" title={t.teachers} hint={t.teachersHint} members={members} q={clean(sp.qt)} param="qt" other={clean(sp.qs)} />
          <People t={t} classId={id} role="student" title={t.students} hint={t.studentsHint} members={members} q={clean(sp.qs)} param="qs" other={clean(sp.qt)} />
        </div>
      )}
    </div>
  );
}

async function People({
  t,
  classId,
  role,
  title,
  hint,
  members,
  q,
  param,
  other,
}: {
  t: T;
  classId: string;
  role: "teacher" | "student";
  title: string;
  hint: string;
  members: { user_id: string; member_role: string }[];
  q: string;
  param: "qt" | "qs";
  other: string;
}) {
  const supabase = await createClient();
  const ids = members.filter((m) => m.member_role === role).map((m) => m.user_id);
  const inClass = new Set(members.map((m) => m.user_id));
  // Teachers: accounts with the teacher or an admin role. Students: student accounts.
  const roles = role === "teacher" ? (["teacher", "administrator", "super_admin"] as const) : (["individual_student", "student"] as const);
  const [{ data: current }, { data: found }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, display_name, email").in("id", ids).order("display_name") : Promise.resolve({ data: [] }),
    q ? supabase.from("profiles").select("id, display_name, email").in("role", roles).or(`email.ilike.%${q}%,display_name.ilike.%${q}%`).order("email").limit(8) : Promise.resolve({ data: [] }),
  ]);
  const otherParam = param === "qt" ? "qs" : "qt";
  return (
    <section className="space-y-4 rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6" data-people={role}>
      <div>
        <h2 className="text-lg font-extrabold">
          {title} <span className="text-sm font-bold text-[#6B6680]">({ids.length})</span>
        </h2>
        <p className="text-xs font-semibold text-[#6B6680]">{hint}</p>
      </div>
      {current?.length ? (
        <ul className="divide-y divide-[#F1EDF5]">
          {current.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <b className="block truncate text-sm">{p.display_name || p.email}</b>
                <span className="block truncate text-xs font-semibold text-[#6B6680]">{p.email}</span>
              </span>
              <ConfirmRemove
                action={removeMember.bind(null, classId, p.id)}
                label={t.remove}
                question={fill(t.confirmRemove, { name: p.display_name || p.email || "" })}
                yes={t.yesRemove}
                cancel={t.cancel}
                className={btn.small}
                dangerClassName={btn.danger}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-semibold text-[#6B6680]">{t.nobody}</p>
      )}
      <form className="flex flex-wrap gap-2" role="search" action={`/app/admin/clases/${classId}`}>
        <label className="sr-only" htmlFor={`q-${role}`}>
          {t.searchPeople}
        </label>
        <input id={`q-${role}`} type="search" name={param} defaultValue={q} placeholder={t.searchPeople} className={`min-w-[12rem] flex-1 ${input}`} />
        {other && <input type="hidden" name={otherParam} value={other} />}
        <button className={btn.ghost}>{t.find}</button>
      </form>
      {q &&
        (found?.length ? (
          <ul className="divide-y divide-[#F1EDF5] rounded-2xl bg-[#F7F5FA] px-3">
            {found.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <b className="block truncate text-sm">{p.display_name || p.email}</b>
                  <span className="block truncate text-xs font-semibold text-[#6B6680]">{p.email}</span>
                </span>
                {inClass.has(p.id) ? (
                  <span className="text-xs font-bold text-[#6B6680]">{t.inClass}</span>
                ) : (
                  <form action={addMember.bind(null, classId, role, p.id)}>
                    <button className={btn.ghost}>{t.add}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-[#6B6680]">{fill(t.noResults, { q })}</p>
        ))}
    </section>
  );
}
