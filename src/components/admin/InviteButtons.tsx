"use client";

// «Enviar invitación» on Admin → Estudiantes: one student (or "Reenviar"), and everyone pending at once,
// behind a confirmation that shows how many people (and who) will get the email.
import { useState, useTransition } from "react";
import { invitePending, inviteStudent, type InviteResult } from "@/app/app/admin/estudiantes/invite-actions";
import { btn } from "@/components/builder/ui";

const DONE: Record<string, string> = {
  sent: "Invitación enviada.",
  stubbed: "Invitación registrada (modo prueba: el correo no salió).",
  already: "Ya tenía una invitación. Usa «Reenviar».",
  duplicate: "Ya se estaba enviando.",
  failed: "El correo falló. Revisa la dirección e inténtalo de nuevo.",
  not_found: "No encontramos esta cuenta.",
};

export function InviteButton({ userId, sent }: { userId: string; sent: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={sent ? btn.ghost : btn.primary}
        data-testid="invite-one"
        onClick={() => {
          if (sent && !window.confirm("¿Reenviar la invitación? Le llega un correo nuevo; el enlace anterior sigue sirviendo hasta que venza.")) return;
          start(async () => {
            const r = await inviteStudent(userId, sent);
            const status = r.ok ? r.results[0]?.status : null;
            setMsg(r.ok ? { ok: status === "sent" || status === "stubbed", text: DONE[status ?? "failed"] } : { ok: false, text: r.error });
          });
        }}
      >
        {pending ? "Enviando…" : sent ? "Reenviar invitación" : "Enviar invitación"}
      </button>
      {msg && (
        <span role="status" className={`text-xs font-bold ${msg.ok ? "text-[#15803D]" : "text-[#B42318]"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}

export function BulkInviteButton({ people, search }: { people: { id: string; label: string }[]; search: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<InviteResult | null>(null);
  const n = people.length;
  const summary =
    result?.ok === true
      ? (() => {
          const ok = result.results.filter((r) => r.status === "sent" || r.status === "stubbed").length;
          const bad = result.results.length - ok;
          return `Listo: ${ok} enviada${ok === 1 ? "" : "s"}${bad ? `, ${bad} con problema` : ""}.`;
        })()
      : null;

  return (
    <div className="space-y-1">
      <button type="button" disabled={!n || pending} className={btn.primary} onClick={() => setOpen(true)} data-testid="invite-bulk">
        {search ? `Enviar invitación a los pendientes de esta búsqueda (${n})` : `Enviar invitación a todos los pendientes (${n})`}
      </button>
      {summary && (
        <p role="status" className="text-sm font-bold text-[#15803D]">
          {summary}
        </p>
      )}
      {result?.ok === false && (
        <p role="alert" className="text-sm font-bold text-[#B42318]">
          {result.error}
        </p>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-title" data-testid="invite-bulk-dialog">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 id="bulk-title" className="text-xl font-extrabold">
              ¿Enviar la invitación a {n} {n === 1 ? "estudiante" : "estudiantes"}?
            </h2>
            <p className="text-sm font-semibold text-[#5E5A73]">
              Cada uno recibe «Tu nueva plataforma CelsU ya está lista» con un enlace para crear su contraseña (dura 30 días). No se puede deshacer.
            </p>
            <ul className="max-h-48 overflow-auto rounded-xl border border-[#EFE6F2] p-3 text-sm font-semibold text-[#1B1830]">
              {people.map((p) => (
                <li key={p.id} className="truncate">
                  {p.label}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn.ghost} onClick={() => setOpen(false)} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className={btn.primary}
                disabled={pending}
                data-testid="invite-bulk-confirm"
                onClick={() =>
                  start(async () => {
                    setResult(await invitePending(search, n));
                    setOpen(false);
                  })
                }
              >
                {pending ? "Enviando…" : `Sí, enviar a ${n}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
