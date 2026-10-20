import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { focus, input } from "@/components/builder/ui";

export const metadata = { title: "Estudiantes · CelsU" };

type Props = { searchParams: Promise<{ q?: string }> };

/** Students: search by email or name (newest sign-ups first without a search), then "Dar acceso" on their page. */
export default async function Estudiantes({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) notFound();
  const search = (q ?? "").trim().slice(0, 80).replace(/[%,()]/g, "");

  let query = supabase.from("profiles").select("id, email, display_name, created_at, requested_plan").in("role", ["individual_student", "student"]).order("created_at", { ascending: false }).limit(50);
  if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  const { data: people } = await query;
  const ids = (people ?? []).map((p) => p.id);
  const now = new Date().toISOString();
  const { data: active } = ids.length
    ? await supabase.from("enrollments").select("user_id").in("user_id", ids).eq("status", "active").or(`expires_at.is.null,expires_at.gt.${now}`)
    : { data: [] };
  // Plans reserved at sign-up while purchases are closed (/registro?plan=…).
  const wanted = [...new Set((people ?? []).map((p) => p.requested_plan).filter((c): c is string => !!c))];
  const { data: plans } = wanted.length ? await supabase.from("products").select("code, name").in("code", wanted) : { data: [] };
  const planName = new Map((plans ?? []).map((x) => [x.code, x.name]));
  const count = new Map<string, number>();
  for (const e of active ?? []) count.set(e.user_id, (count.get(e.user_id) ?? 0) + 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Estudiantes</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">
          Los estudiantes actuales se registran solos con su correo de siempre. Búscalos aquí y dales acceso a su programa.
        </p>
      </div>
      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar estudiante
        </label>
        <input id="q" type="search" name="q" defaultValue={search} placeholder="Correo o nombre" className={`w-full max-w-sm ${input}`} />
        <button className={`rounded-xl bg-[#1B1830] px-4 py-2 text-sm font-extrabold text-white ${focus}`}>Buscar</button>
      </form>
      {!people?.length ? (
        <p className="rounded-3xl border border-dashed border-[#E4DEEA] bg-white p-6 text-center text-sm font-semibold text-[#6B6680]">
          {search ? `Nadie coincide con “${search}”. Pídele que se registre en /registro con su correo.` : "Todavía no hay estudiantes registrados."}
        </p>
      ) : (
        <ul className="divide-y divide-[#F1EDF5] rounded-3xl border border-[#EFE6F2] bg-white shadow-sm">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/app/admin/estudiantes/${p.id}`} className={`flex items-center gap-3 p-4 hover:bg-[#FBFAFD] ${focus}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{p.display_name || p.email}</p>
                  <p className="truncate text-sm font-semibold text-[#6B6680]">{p.email}</p>
                  {p.requested_plan && <p className="truncate text-xs font-extrabold text-[#7A5A00]">Reservó: {planName.get(p.requested_plan) ?? p.requested_plan}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${count.get(p.id) ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#F4F1F7] text-[#5E5A73]"}`}>
                  {count.get(p.id) ? `${count.get(p.id)} con acceso` : "Sin acceso"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
