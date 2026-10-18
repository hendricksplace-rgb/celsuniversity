import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";

export const metadata = { title: "Mis clases · CelsU" };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** Classes the viewer teaches (admins see every active class). */
export default async function MisClases() {
  const { t } = await getDictionary();
  const c = t.classes;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;
  const isAdmin = ["super_admin", "director", "administrator"].includes(viewer.role);
  const { data: mine } = await supabase.from("class_members").select("class_id").eq("user_id", viewer.user.id).eq("member_role", "teacher");
  let query = supabase.from("classes").select("id, name, class_members(member_role)").eq("status", "active").order("name");
  if (!isAdmin) query = query.in("id", (mine ?? []).map((m) => m.class_id));
  const { data: classes } = await query;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      {classes?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cl) => (
            <li key={cl.id}>
              <Link
                href={`/app/clases/${cl.id}`}
                className="block rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C] motion-reduce:transition-none"
              >
                <h2 className="text-lg font-extrabold">{cl.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6B6680]">{((n) => (n === 1 ? c.student : fill(c.students, { n })))((cl.class_members ?? []).filter((m) => m.member_role === "student").length)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl border border-[#EFE6F2] bg-white p-6 font-semibold text-[#4A4766]">{c.none}</p>
      )}
    </div>
  );
}
