// C-051 Admin → Clases: every class with its school, schedule (viewer's language), teachers, students and
// status. Filters: organization, status; search by name. super_admin and administrator only.
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { scheduleOf } from "@/lib/i18n/row";
import { input } from "@/components/builder/ui";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6006A]";

export const metadata = { title: "Clases · Admin · CelsU" };

type Props = { searchParams: Promise<{ q?: string; org?: string; estado?: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminClases({ searchParams }: Props) {
  const { q, org, estado } = await searchParams;
  const { t: all, lang } = await getDictionary();
  const t = all.adminClasses;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) notFound();

  const search = (q ?? "").trim().slice(0, 80).replace(/[%,()]/g, "");
  const status = estado === "archived" || estado === "all" ? estado : "active";
  let query = supabase
    .from("classes")
    .select("id, name, status, organization_id, schedule_label, schedule_label_en, organization:organizations(name), class_members(user_id, member_role)")
    .order("name")
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (org === "none") query = query.is("organization_id", null);
  else if (org && UUID.test(org)) query = query.eq("organization_id", org);
  if (search) query = query.ilike("name", `%${search}%`);
  const [{ data: classes }, { data: orgs }] = await Promise.all([query, supabase.from("organizations").select("id, name").order("name")]);

  const teacherIds = [...new Set((classes ?? []).flatMap((c) => (c.class_members ?? []).filter((m) => m.member_role === "teacher").map((m) => m.user_id)))];
  const { data: teachers } = teacherIds.length ? await supabase.from("profiles").select("id, display_name, email").in("id", teacherIds) : { data: [] };
  const nameOf = new Map((teachers ?? []).map((p) => [p.id, p.display_name || p.email || "—"]));
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
          <p className="mt-1 text-sm font-semibold text-[#6B6680]">{t.sub}</p>
        </div>
        <Link href="/app/admin/clases/nueva" className={`rounded-xl bg-[#1B1830] px-4 py-2.5 text-sm font-extrabold text-white ${focus}`}>
          + {t.newClass}
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-xs font-extrabold text-[#4A4766]">
          {t.search}
          <input type="search" name="q" defaultValue={search} className={`w-60 ${input}`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-extrabold text-[#4A4766]">
          {t.filterOrg}
          <select name="org" defaultValue={org ?? ""} className={input}>
            <option value="">{t.allOrgs}</option>
            <option value="none">{t.noOrg}</option>
            {(orgs ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-extrabold text-[#4A4766]">
          {t.filterStatus}
          <select name="estado" defaultValue={status} className={input}>
            <option value="active">{t.active}</option>
            <option value="archived">{t.archived}</option>
            <option value="all">{t.allStatus}</option>
          </select>
        </label>
        <button className={`rounded-xl bg-[#1B1830] px-4 py-2 text-sm font-extrabold text-white ${focus}`}>{t.searchBtn}</button>
      </form>

      {classes?.length ? (
        <div className="overflow-x-auto rounded-3xl border border-[#EFE6F2] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-extrabold uppercase tracking-wide text-[#6B6680]">
                <th scope="col" className="px-4 py-3">{t.colName}</th>
                <th scope="col" className="px-4 py-3">{t.colOrg}</th>
                <th scope="col" className="px-4 py-3">{t.colSchedule}</th>
                <th scope="col" className="px-4 py-3">{t.colTeachers}</th>
                <th scope="col" className="px-4 py-3">{t.colStudents}</th>
                <th scope="col" className="px-4 py-3">{t.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EDF5]">
              {classes.map((c) => {
                const ms = c.class_members ?? [];
                const tNames = ms.filter((m) => m.member_role === "teacher").map((m) => nameOf.get(m.user_id) ?? "—");
                return (
                  <tr key={c.id} data-class={c.id}>
                    <th scope="row" className="px-4 py-3 font-extrabold">
                      <Link href={`/app/admin/clases/${c.id}`} className={`hover:underline ${focus}`}>
                        {c.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3 font-semibold">{one(c.organization)?.name ?? t.noOrg}</td>
                    <td className="px-4 py-3 font-semibold">{scheduleOf(c, lang) ?? <span className="text-[#6B6680]">{t.noSchedule}</span>}</td>
                    <td className="px-4 py-3 font-semibold">{tNames.length ? tNames.join(", ") : <span className="text-[#6B6680]">{t.noTeacher}</span>}</td>
                    <td className="px-4 py-3 font-semibold">{ms.filter((m) => m.member_role === "student").length}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${c.status === "active" ? "bg-[#E3F7EC] text-[#0F6B3A]" : "bg-[#F1EDF5] text-[#4A4766]"}`}>
                        {c.status === "active" ? t.active : t.archived}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-3xl border border-[#EFE6F2] bg-white p-6 font-semibold text-[#4A4766]">{t.empty}</p>
      )}
    </div>
  );
}
