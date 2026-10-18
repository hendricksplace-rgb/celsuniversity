"use client";

// "Dar acceso" and "Quitar acceso" on /app/admin/estudiantes/[id]. The end date follows the program's access
// length until staff edit it.
import { useActionState, useState, useTransition } from "react";
import { grantAccess, revokeAccess, type Result } from "@/app/app/admin/estudiantes/actions";
import { btn, input, label } from "@/components/builder/ui";

type Target = { value: string; label: string; months: number };

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const plusMonths = (day: string, months: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return iso(d);
};

export function GrantForm({ userId, targets }: { userId: string; targets: Target[] }) {
  const today = iso(new Date());
  const [target, setTarget] = useState("");
  const [starts, setStarts] = useState(today);
  const [expires, setExpires] = useState("");
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState<Result | null, FormData>(grantAccess.bind(null, userId), null);
  const months = targets.find((t) => t.value === target)?.months ?? 12;
  const end = edited ? expires : target ? plusMonths(starts, months) : "";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <div className="sm:col-span-3">
        <label htmlFor="grant-target" className={label}>
          Programa o curso
        </label>
        <select id="grant-target" name="target" required value={target} onChange={(e) => setTarget(e.target.value)} className={`mt-1 w-full ${input}`}>
          <option value="">Elige…</option>
          {targets.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} ({t.months} meses)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="grant-start" className={label}>
          Inicio
        </label>
        <input id="grant-start" type="date" name="starts_at" required value={starts} onChange={(e) => setStarts(e.target.value)} className={`mt-1 w-full ${input}`} />
      </div>
      <div>
        <label htmlFor="grant-end" className={label}>
          Fin del acceso
        </label>
        <input
          id="grant-end"
          type="date"
          name="expires_at"
          required
          value={end}
          onChange={(e) => {
            setEdited(true);
            setExpires(e.target.value);
          }}
          className={`mt-1 w-full ${input}`}
        />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={pending || !target} className={btn.primary}>
          {pending ? "Guardando…" : "Dar acceso"}
        </button>
      </div>
      <p role="status" className="text-sm font-bold sm:col-span-3">
        {state?.ok === true && <span className="text-[#15803D]">Listo: ya tiene acceso. Lo verá en Mis cursos.</span>}
        {state?.ok === false && <span className="text-[#B42318]">{state.error}</span>}
      </p>
    </form>
  );
}

export function RevokeButton({ userId, enrollmentId, title }: { userId: string; enrollmentId: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={pending}
        className={btn.danger}
        onClick={() => {
          if (!window.confirm(`¿Quitar el acceso a ${title}? Se cierra hoy; su avance se conserva.`)) return;
          start(async () => {
            const r = await revokeAccess(userId, enrollmentId);
            setError(r.ok ? null : r.error);
          });
        }}
      >
        {pending ? "Quitando…" : "Quitar acceso"}
      </button>
      {error && <span className="text-xs font-bold text-[#B42318]">{error}</span>}
    </div>
  );
}
