import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { focus, input } from "@/components/builder/ui";
import { BulkInviteButton } from "@/components/admin/InviteButtons";
import { fmtDay, inviteLabel, type InviteRow } from "@/lib/invites";

export const metadata = { title: "Estudiantes · CelsU" };

type Props = { searchParams: Promise<{ q?: string; filtro?: string }> };

/**
 * Students: search by email or name (newest sign-ups first without a search), then "Dar acceso" on their page.
 * "Invitación pendiente" (filtro=pendientes): access, never signed in, never invited (public.admin_invite_pending),
 * with «Enviar invitación a todos los pendientes (N)»; a search narrows both the list and the button.
 */
export default async function Estudiantes({ searchParams }: Props) {
  const { q, filtro } = await searchParams;
  const onlyPending = filtro === "pendientes";
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) notFound();
  const search = (q ?? "").trim().slice(0, 80).replace(/[%,()]/g, "");
  const { data: pendingAll } = await supabase.rpc("admin_invite_pending");
  const needle = search.toLowerCase();
  const pending = (pendingAll ?? []).filter((p) => !needle || p.email?.toLowerCase().includes(needle) || p.display_name?.toLowerCase().includes(needle));
  const pendingIds = new Set(pending.map((p) => p.user_id));

  let query = supabase.from("profiles").select("id, email, display_name, created_at, requested_plan").in("role", ["individual_student", "student"]).order("created_at", { ascending: false }).limit(50);
  if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  if (onlyPending) query = query.in("id", [...pendingIds].slice(0, 50));
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
  const [{ data: invites }, { data: signins }] = ids.length
    ? await Promise.all([
        supabase.from("student_invites").select("user_id, seq, sent_at, status, redeemed_at, activated_at, expires_at").in("user_id", ids).order("sent_at", { ascending: false }),
        supabase.rpc("admin_student_signins", { p_ids: ids }),
      ])
    : [{ data: [] }, { data: [] }];
  const lastInvite = new Map<string, InviteRow>();
  for (const i of invites ?? []) if (!lastInvite.has(i.user_id)) lastInvite.set(i.user_id, i);
  const signedIn = new Map((signins ?? []).map((x) => [x.user_id, x.last_sign_in_at]));
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
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar estudiante
        </label>
        <input id="q" type="search" name="q" defaultValue={search} placeholder="Correo o nombre" className={`w-full max-w-sm ${input}`} />
        {onlyPending && <input type="hidden" name="filtro" value="pendientes" />}
        <button className={`rounded-xl bg-[#1B1830] px-4 py-2 text-sm font-extrabold text-white ${focus}`}>Buscar</button>
      </form>
      <div className="flex flex-wrap items-start gap-3" data-testid="invite-filter">
        <nav aria-label="Filtro" className="flex gap-1 rounded-full border border-[#E3DDEA] bg-white p-1 text-sm font-bold">
          <Link href={`/app/admin/estudiantes${search ? `?q=${encodeURIComponent(search)}` : ""}`} aria-current={onlyPending ? undefined : "page"} className={`rounded-full px-3 py-1.5 ${onlyPending ? "text-[#5E5A73]" : "bg-[#1B1830] text-white"} ${focus}`}>
            Todos
          </Link>
          <Link
            href={`/app/admin/estudiantes?filtro=pendientes${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            aria-current={onlyPending ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 ${onlyPending ? "bg-[#1B1830] text-white" : "text-[#5E5A73]"} ${focus}`}
          >
            Invitación pendiente ({pending.length})
          </Link>
        </nav>
        <BulkInviteButton search={search} people={pending.map((p) => ({ id: p.user_id, label: p.display_name && p.display_name !== p.email ? `${p.display_name} · ${p.email}` : p.email }))} />
      </div>
      <p className="text-xs font-semibold text-[#6B6680]">Pendiente = tiene acceso, nunca ha entrado y no se le ha enviado invitación.</p>
      {!people?.length ? (
        <p className="rounded-3xl border border-dashed border-[#E4DEEA] bg-white p-6 text-center text-sm font-semibold text-[#6B6680]">
          {onlyPending ? "No hay invitaciones pendientes." : search ? `Nadie coincide con “${search}”. Pídele que se registre en /registro con su correo.` : "Todavía no hay estudiantes registrados."}
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
                {(lastInvite.has(p.id) || pendingIds.has(p.id)) && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${inviteLabel(lastInvite.get(p.id)).tone}`} data-testid="invite-status">
                    {lastInvite.has(p.id) ? `${inviteLabel(lastInvite.get(p.id)).text} · ${fmtDay(lastInvite.get(p.id)!.sent_at)}` : "Invitación pendiente"}
                  </span>
                )}
                {!lastInvite.has(p.id) && !pendingIds.has(p.id) && signedIn.has(p.id) && !signedIn.get(p.id) && (
                  <span className="shrink-0 rounded-full bg-[#F4F1F7] px-2.5 py-1 text-xs font-extrabold text-[#5E5A73]">Nunca ha entrado</span>
                )}
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
