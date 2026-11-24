import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole, one } from "@/lib/access";
import { accessTargets } from "@/lib/grants";
import { GrantForm, RevokeButton } from "@/components/admin/AccessForms";
import { InviteButton } from "@/components/admin/InviteButtons";
import { ChangeEmailButton } from "@/components/admin/ChangeEmail";
import { getDictionary } from "@/lib/i18n/server";
import { fmtDay, inviteLabel, previewInviteTemplates } from "@/lib/invites";
import { INVITE_TEMPLATE_LABEL } from "@/lib/invite-template";

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
  const { data: p } = await supabase.from("profiles").select("id, email, role, display_name, created_at, requested_plan, requested_plan_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: enr }, targets, { data: pledges }, { data: invites }, { data: signin }, { data: emailChange }, { t }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, source, starts_at, expires_at, course:courses(title), program:programs(title)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    accessTargets(supabase),
    // CelsBSNS "Mi compromiso" (the syllabus): staff and admins can read every signature.
    supabase.from("course_commitments").select("id, signed_name, signed_at, course:courses(title)").eq("user_id", id).order("signed_at"),
    // «Enviar invitación»: every invitation sent (newest first) and the last sign-in (auth, through an admin RPC).
    supabase.from("student_invites").select("id, seq, sent_at, status, redeemed_at, activated_at, expires_at").eq("user_id", id).order("sent_at", { ascending: false }),
    supabase.rpc("admin_student_signins", { p_ids: [id] }),
    // «Cambiar correo» (C-046): the latest change, for "Correo cambiado {fecha}".
    supabase.from("admin_audit_log").select("at").eq("action", "change_email").eq("row_id", id).order("id", { ascending: false }).limit(1).maybeSingle(),
    getDictionary(),
  ]);
  // Administrators change student emails; only a super_admin changes a staff account's. Never your own (use your profile).
  const canChangeEmail = viewer.user.id !== p.id && (viewer.role === "super_admin" || p.role === "student" || p.role === "individual_student");
  // C-071: which invitation would go out (the student-invite function decides; null if it couldn't say).
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const inviteTemplate = token ? ((await previewInviteTemplates([id], token)).get(id) ?? null) : null;
  const lastInvite = invites?.[0] ?? null;
  const lastSignIn = signin?.[0]?.last_sign_in_at ?? null;
  const invite = inviteLabel(lastInvite);
  const now = Date.now();
  // The plan they reserved at sign-up while purchases are closed (/registro?plan=…).
  const { data: wanted } = p.requested_plan ? await supabase.from("products").select("name").eq("code", p.requested_plan).maybeSingle() : { data: null };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/admin/estudiantes" className="text-sm font-bold text-[#5E5A73] hover:underline">
        ← Estudiantes
      </Link>
      <div>
        <h1 className="text-3xl font-extrabold">{p.display_name || p.email}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-1 text-sm font-semibold text-[#6B6680]">
          <span className="break-all" data-testid="student-email">
            {p.email}
          </span>
          {canChangeEmail && <ChangeEmailButton userId={p.id} currentEmail={p.email ?? ""} t={t.adminEmail} />}
          <span>· se registró el {fmt(p.created_at)}</span>
        </div>
        {emailChange && (
          <p className="mt-1 text-xs font-semibold text-[#8A86A0]" data-testid="email-changed-note">
            {t.adminEmail.changedOn.replace("{date}", fmtDay(emailChange.at))}
          </p>
        )}
        {p.requested_plan && (
          <p className="mt-2 inline-flex rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-extrabold text-[#7A5A00]" data-testid="requested-plan">
            Reservó: {wanted?.name ?? p.requested_plan}
            {p.requested_plan_at ? ` · ${fmt(p.requested_plan_at)}` : ""}
          </p>
        )}
        {(pledges ?? []).map((c) => (
          <p key={c.id} className="mt-2 inline-flex rounded-full bg-[#E3F6E8] px-3 py-1 text-xs font-extrabold text-[#15803D]">
            ✓ Compromiso firmado · {fmt(c.signed_at)} · {one(c.course as { title: string } | { title: string }[] | null)?.title ?? ""} · “{c.signed_name}”
          </p>
        ))}
      </div>

      <section className="space-y-3 rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm" data-testid="invite-section">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold">Invitación</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${invite.tone}`} data-testid="invite-status">
            {invite.text}
          </span>
        </div>
        <p className="text-sm font-semibold text-[#6B6680]">
          {lastInvite
            ? `Última enviada el ${fmtDay(lastInvite.sent_at)}${invites && invites.length > 1 ? ` (${invites.length} en total)` : ""} · el enlace vence el ${fmtDay(lastInvite.expires_at)}.`
            : `Le llega ${inviteTemplate ? `«${INVITE_TEMPLATE_LABEL[inviteTemplate]}»` : "su invitación"} con un enlace para crear su contraseña (dura 30 días).`}{" "}
          {lastSignIn ? `Entró por última vez el ${fmtDay(lastSignIn)}.` : "Nunca ha entrado."}
        </p>
        <InviteButton userId={p.id} sent={!!lastInvite} template={inviteTemplate} />
      </section>

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
