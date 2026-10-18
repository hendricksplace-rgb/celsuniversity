import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";

export const metadata = { title: "Salud del contenido · CelsU" };
type Props = { searchParams: Promise<{ tipo?: string }> };

const KINDS: Record<string, { label: string; note: string; color: string }> = {
  empty: { label: "Lección vacía", note: "Los estudiantes no la ven.", color: "#A3123F" },
  no_video: { label: "Video faltante", note: "La lección de video no tiene un video que se pueda reproducir.", color: "#A3123F" },
  wistia: { label: "En Wistia", note: "Se reproduce directo desde Wistia; falta moverlo.", color: "#8A6400" },
  no_artwork: { label: "Sin imagen", note: "Episodio de CelsTV sin artwork_url.", color: "#8A6400" },
  quiz_audio: { label: "Quiz sin audio", note: "Preguntas sin question_audio (se leen con la voz del dispositivo).", color: "#2C6BC4" },
  ebook: { label: "E-book sin publicar", note: "Borrador o en revisión.", color: "#2C6BC4" },
};

/** "Salud del contenido": per course, what's empty, missing or still on Wistia. Each row opens its lesson. */
export default async function ContentHealth({ searchParams }: Props) {
  const { tipo } = await searchParams;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;
  if (!isAdminRole(viewer.role) && !viewer.isStaff) notFound();
  const { data } = await supabase.rpc("content_health");
  const all = data ?? [];
  const rows = tipo && KINDS[tipo] ? all.filter((r) => r.kind === tipo) : all;
  const courses = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.course ?? "Sin curso";
    courses.set(key, [...(courses.get(key) ?? []), r]);
  }
  const count = (k: string) => all.filter((r) => r.kind === k).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-extrabold">Salud del contenido</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">Lo que falta o sigue fuera, por curso. Toca una fila para abrir la lección.</p>
      </header>
      <nav className="flex flex-wrap gap-2 text-sm font-bold">
        <Link href="/app/admin/salud" className={`rounded-full px-3.5 py-1.5 ${!tipo ? "bg-[#1B1830] text-white" : "bg-white shadow-sm"}`}>
          Todo · {all.length}
        </Link>
        {Object.entries(KINDS).map(([k, v]) => (
          <Link key={k} href={`/app/admin/salud?tipo=${k}`} className={`rounded-full px-3.5 py-1.5 ${tipo === k ? "bg-[#1B1830] text-white" : "bg-white shadow-sm"}`}>
            {v.label} · {count(k)}
          </Link>
        ))}
      </nav>
      {rows.length === 0 && <p className="rounded-2xl bg-white p-5 shadow-sm">Nada pendiente aquí. 🎉</p>}
      {[...courses].map(([course, list]) => (
        <section key={course} className="overflow-hidden rounded-2xl border border-[#EFE6F2] bg-white shadow-sm">
          <h2 className="border-b border-[#EFE6F2] bg-[#FBFAFD] px-4 py-3 font-extrabold">
            {course} <span className="text-sm font-semibold text-[#6B6680]">· {list.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#6B6680]">
                <tr>
                  <th className="px-4 py-2 font-extrabold">Problema</th>
                  <th className="px-2 py-2 font-extrabold">Módulo</th>
                  <th className="px-2 py-2 font-extrabold">Lección</th>
                  <th className="px-4 py-2 font-extrabold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={`${r.kind}:${r.lesson_id ?? r.title}:${i}`} className="border-t border-[#F3EFF7] hover:bg-[#FBFAFD]">
                    <td className="px-4 py-2">
                      <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold" style={{ color: KINDS[r.kind]?.color, background: `${KINDS[r.kind]?.color}14` }} title={KINDS[r.kind]?.note}>
                        {KINDS[r.kind]?.label ?? r.kind}
                      </span>
                    </td>
                    <td className="px-2 py-2 tabular-nums text-[#6B6680]">{r.module_n ?? "—"}</td>
                    <td className="px-2 py-2">
                      <Link href={r.link} className="font-bold text-[#1B1830] underline-offset-2 hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[#6B6680]">{r.kind === "quiz_audio" ? `${r.detail} sin audio` : r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
