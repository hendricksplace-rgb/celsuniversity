import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";

export const metadata = { title: "Errores · CelsU" };

const DAYS = 7;
const when = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" });

type Group = { message: string; count: number; last: string; where: Map<string, number>; users: Set<string>; example: { stack: string | null; agent: string | null; kind: string | null } };

/** Rows with the same message become one line: how often, when last, where, and one example. */
function group<T extends { message: string; at: string }>(rows: T[], where: (r: T) => string, user: (r: T) => string | null, example: (r: T) => Group["example"]) {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.message.trim();
    let g = map.get(key);
    if (!g) {
      // Rows come newest first: the first one is the latest and the example.
      g = { message: key, count: 0, last: r.at, where: new Map(), users: new Set(), example: example(r) };
      map.set(key, g);
    }
    g.count++;
    const w = where(r);
    g.where.set(w, (g.where.get(w) ?? 0) + 1);
    const u = user(r);
    if (u) g.users.add(u);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}

function Groups({ groups, whereLabel, empty }: { groups: Group[]; whereLabel: string; empty: string }) {
  if (!groups.length) return <p className="rounded-2xl bg-[#F3FBF5] px-4 py-3 text-sm font-bold text-[#15803D]">{empty}</p>;
  return (
    <ul className="space-y-3">
      {groups.map((g) => (
        <li key={g.message} className="rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <span className="shrink-0 rounded-full bg-[#FFE3F0] px-2.5 py-1 text-sm font-extrabold text-[#A3123F]" title="Veces en 7 días">
              ×{g.count}
            </span>
            <p className="min-w-0 flex-1 font-mono text-sm font-semibold [overflow-wrap:anywhere]">{g.message}</p>
          </div>
          <p className="mt-2 text-xs font-semibold text-[#6B6680]">
            Última vez: {when(g.last)}
            {g.users.size > 0 && ` · ${g.users.size} ${g.users.size === 1 ? "usuario" : "usuarios"}`}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B6680] [overflow-wrap:anywhere]">
            {whereLabel}:{" "}
            {[...g.where.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([w, n]) => `${w} (${n})`)
              .join(", ")}
          </p>
          {(g.example.stack || g.example.agent) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-bold text-[#2560B0]">Ver ejemplo</summary>
              {g.example.kind && <p className="mt-2 text-xs font-bold text-[#6B6680]">Tipo: {g.example.kind}</p>}
              {g.example.stack && <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#1B1830] p-3 text-[11px] leading-relaxed text-white">{g.example.stack}</pre>}
              {g.example.agent && <p className="mt-2 text-[11px] font-semibold text-[#6B6680] [overflow-wrap:anywhere]">{g.example.agent}</p>}
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Errores: what broke in the last 7 days, in students' browsers and in the Edge Functions. */
export default async function Errors() {
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;
  if (!isAdminRole(viewer.role) && !viewer.isStaff) notFound();
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const [{ data: client }, { data: server }] = await Promise.all([
    supabase.from("client_errors").select("at, user_id, route, message, stack, user_agent, kind").gte("at", since).order("at", { ascending: false }).limit(2000),
    supabase.from("function_errors").select("at, function, status, message").gte("at", since).order("at", { ascending: false }).limit(2000),
  ]);
  const app = group(
    client ?? [],
    (r) => r.route ?? "?",
    (r) => r.user_id,
    (r) => ({ stack: r.stack, agent: r.user_agent, kind: r.kind }),
  );
  const fns = group(
    server ?? [],
    (r) => (r.status ? `${r.function} · ${r.status}` : r.function),
    () => null,
    () => ({ stack: null, agent: null, kind: null }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Errores</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">Últimos {DAYS} días, agrupados por mensaje. Los estudiantes ven «Algo salió mal» y un botón para volver a intentar.</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">
          En la app <span className="text-base font-bold text-[#6B6680]">({(client ?? []).length})</span>
        </h2>
        <Groups groups={app} whereLabel="Páginas" empty="Sin errores en la app esta semana." />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">
          En el servidor <span className="text-base font-bold text-[#6B6680]">({(server ?? []).length})</span>
        </h2>
        <Groups groups={fns} whereLabel="Funciones" empty="Sin errores en las Edge Functions esta semana." />
      </section>
    </div>
  );
}
