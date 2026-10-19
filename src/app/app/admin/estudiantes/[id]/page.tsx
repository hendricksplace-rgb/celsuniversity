import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole, one } from "@/lib/access";
import { accessTargets } from "@/lib/grants";
import { GrantForm, RevokeButton } from "@/components/admin/AccessForms";

export const metadata = { title: "Estudiante · CelsU" };

const SOURCE: Record<string, string> = { manual: "Dado por el equipo", stripe: "Compra", migration: "Migración", "admin-setup": "Equipo", "smoke-test": "Prueba" };
const STATUS: Record<string, string> = { active: "Activo", cancelled: "Quitado", refunded: "Reembolsado", paused: "En pausa", completed: "Terminado" };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric" }) : "sin fin");

type Props = { params: Promise<{ id: string }> };

/** One student: their accesses, "Dar acceso" and "Quitar acceso". */
export default async function Estudiante({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) notFound();
  const { data: p } = await supabase.from("profiles").select("id, email, display_name, created_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: enr }, targets, { data: pledges }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, source, starts_at, expires_at, course:courses(title), program:programs(title)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    accessTargets(supabase),
    // CelsBSNS "Mi compromiso" (the syllabus): staff and admins can read every signature.
    supabase.from("course_commitments").select("id, signed_name, signed_at, course:courses(title)").eq("user_id", id).order("signed_at"),
  ]);
  const now = Date.now();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/admin/estudiantes" className="text-sm font-bold text-[#5E5A73] hover:underline">
        ← Estudiantes
      </Link>
      <div>
        <h1 className="text-3xl font-extrabold">{p.display_name || p.email}</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">
          {p.email} · se registró el {fmt(p.created_at)}
        </p>
        {(pledges ?? []).map((c) => (
          <p key={c.id} className="mt-2 inline-flex rounded-full bg-[#E3F6E8] px-3 py-1 text-xs font-extrabold text-[#15803D]">
            ✓ Compromiso firmado · {fmt(c.signed_at)} · {one(c.course as { title: string } | { title: string }[] | null)?.title ?? ""} · “{c.signed_name}”
          </p>
        ))}
      </div>

      <section className="space-y-3 rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Dar acceso</h2>
        <GrantForm userId={p.id} targets={targets.map((t) => ({ value: `${t.kind}:${t.id}`, label: `${t.kind === "program" ? "Programa" : "Curso"} · ${t.title}`, months: t.months }))} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Accesos</h2>
        {!enr?.length ? (
          <p className="rounded-3xl border border-dashed border-[#E4DEEA] bg-white p-5 text-center text-sm font-semibold text-[#6B6680]">Todavía no tiene ningún acceso.</p>
        ) : (
          <ul className="divide-y divide-[#F1EDF5] rounded-3xl border border-[#EFE6F2] bg-white shadow-sm">
            {enr.map((e) => {
              const title = one(e.course as { title: string } | { title: string }[] | null)?.title ?? one(e.program as { title: string } | { title: string }[] | null)?.title ?? "—";
              const live = e.status === "active" && (!e.expires_at || new Date(e.expires_at).getTime() > now);
              return (
                <li key={e.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{title}</p>
                    <p className="text-sm font-semibold text-[#6B6680]">
                      {fmt(e.starts_at)} → {fmt(e.expires_at)} · {SOURCE[e.source ?? ""] ?? e.source ?? "—"}
                    </p>
                  </div>
                  <span className={`self-start rounded-full px-2.5 py-1 text-xs font-extrabold sm:self-center ${live ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#F4F1F7] text-[#5E5A73]"}`}>
                    {live ? "Activo" : e.status === "active" ? "Vencido" : (STATUS[e.status] ?? e.status)}
                  </span>
                  {live && <RevokeButton userId={p.id} enrollmentId={e.id} title={title} />}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs font-semibold text-[#6B6680]">Quitar un acceso lo cierra hoy. El avance del estudiante se conserva por si vuelve.</p>
      </section>
    </div>
  );
}
