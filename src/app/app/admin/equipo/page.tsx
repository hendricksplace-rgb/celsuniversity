import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { setRole } from "./actions";

export const metadata = { title: "Equipo · CelsU" };

const LABEL: Record<string, string> = {
  super_admin: "Super admin",
  administrator: "Administrador",
  director: "Director",
  teacher: "Profesor",
  student: "Estudiante (clase)",
  individual_student: "Estudiante",
};
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

type Props = { searchParams: Promise<{ q?: string }> };

/** The team (staff roles first) and, for a super_admin, a role picker per person. */
export default async function Equipo({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;
  if (!isAdminRole(viewer.role)) notFound();
  const canEdit = viewer.role === "super_admin";
  const search = (q ?? "").trim().slice(0, 80);

  let query = supabase.from("profiles").select("id, email, display_name, role").order("email").limit(100);
  query = search ? query.or(`email.ilike.%${search.replace(/[%,()]/g, "")}%,display_name.ilike.%${search.replace(/[%,()]/g, "")}%`) : query.neq("role", "individual_student");
  const { data: people } = await query;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Equipo y roles</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">
          {canEdit ? "Solo tú, como super admin, puedes cambiar roles." : "Solo un super admin puede cambiar roles."} Sin búsqueda se muestra solo el equipo.
        </p>
      </div>
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por correo o nombre"
          className={`w-full max-w-sm rounded-xl border border-[#E4DEEA] bg-white px-3 py-2.5 text-sm font-semibold ${focus}`}
        />
        <button className={`rounded-xl bg-[#1B1830] px-4 py-2.5 text-sm font-extrabold text-white ${focus}`}>Buscar</button>
      </form>
      <ul className="divide-y divide-[#F1EDF5] rounded-3xl border border-[#EFE6F2] bg-white shadow-sm">
        {(people ?? []).map((p) => (
          <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{p.display_name || p.email}</p>
              <p className="truncate text-sm font-semibold text-[#6B6680]">{p.email}</p>
            </div>
            {canEdit && p.id !== viewer.user.id ? (
              <form action={setRole.bind(null, p.id)} className="flex gap-2">
                <select name="role" defaultValue={p.role} aria-label={`Rol de ${p.email}`} className={`rounded-xl border border-[#E4DEEA] bg-white px-3 py-2 text-sm font-bold ${focus}`}>
                  {Object.entries(LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button className={`rounded-xl bg-[#F5178C] px-3 py-2 text-sm font-extrabold text-white ${focus}`}>Guardar</button>
              </form>
            ) : (
              <span className="rounded-full bg-[#F1EDF5] px-3 py-1 text-xs font-extrabold text-[#4A4766]">{LABEL[p.role] ?? p.role}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
