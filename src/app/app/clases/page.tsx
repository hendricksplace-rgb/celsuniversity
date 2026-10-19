import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { STAFF_ROLES } from "@/lib/access";
import { loadMyClass, loadNoClass } from "@/lib/my-classes";
import { NoClass, WithClass } from "@/components/clases/MisClases";

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.classes.title} · CelsU` };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/**
 * Mis clases. A student in an active class gets the class view; teachers and staff keep the list of the classes
 * they teach (admins see every active class); everyone else gets the "no class yet" view.
 */
export default async function MisClases() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app/clases");
  const loc = { lang, locale: lang === "en" ? "en-US" : "es-MX" } as const;

  // Everything at once: the class view, the teacher check and the "no class" data (cheap, and most students
  // have no class yet), so the page streams in a couple of round trips.
  const noClass = loadNoClass(supabase, user.id);
  noClass.catch(() => {});
  const [{ data: me }, mine, { data: teaching }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    loadMyClass(supabase, user.id),
    supabase.from("class_members").select("class_id").eq("user_id", user.id).eq("member_role", "teacher"),
  ]);
  if (mine) return <WithClass t={t.misClases} u={t.mycourses} data={mine} loc={loc} />;

  const role = me?.role ?? "individual_student";
  const isStaff = (STAFF_ROLES as readonly string[]).includes(role);
  if (!isStaff && !teaching?.length) return <NoClass t={t.misClases} u={t.mycourses} data={await noClass} />;

  return <TeacherClasses t={t.classes} role={role} teaching={(teaching ?? []).map((m) => m.class_id)} supabase={supabase} />;
}

/** Classes the viewer teaches (admins see every active class). */
async function TeacherClasses({
  t: c,
  role,
  teaching,
  supabase,
}: {
  t: Awaited<ReturnType<typeof getDictionary>>["t"]["classes"];
  role: string;
  teaching: string[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const isAdmin = ["super_admin", "director", "administrator"].includes(role);
  let query = supabase.from("classes").select("id, name, class_members(member_role)").eq("status", "active").order("name");
  if (!isAdmin) query = query.in("id", teaching);
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
                <p className="mt-1 text-sm font-semibold text-[#6B6680]">
                  {((n) => (n === 1 ? c.student : fill(c.students, { n })))((cl.class_members ?? []).filter((m) => m.member_role === "student").length)}
                </p>
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
