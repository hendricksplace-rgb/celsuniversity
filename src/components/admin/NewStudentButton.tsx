"use client";

// C-072 «Invitar estudiante nuevo» (Admin → Estudiantes): email + name + courses in one dialog. The student-invite
// function creates the account (no password: they sign in with an email code), grants the courses and sends the
// «Bienvenida general» email. An email that already has an account changes nothing: the dialog links to its page.
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { inviteNewStudent, type NewStudentResult } from "@/app/app/admin/estudiantes/invite-actions";
import { btn, input, label } from "@/components/builder/ui";

export type CourseGroup = { key: string; label: string; courses: { id: string; title: string }[] };

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export function NewStudentButton({ groups }: { groups: CourseGroup[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NewStudentResult | null, FormData>(inviteNewStudent, null);
  const all = groups.flatMap((g) => g.courses.map((c) => c.id));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [access, setAccess] = useState<"open" | "until">("open");
  const [formKey, setFormKey] = useState(0);
  const first = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  // Created: clear the form for the next person (the result stays on screen).
  useEffect(() => {
    if (state?.ok && state.created) {
      setPicked(new Set());
      setAccess("open");
      setFormKey((k) => k + 1);
    }
  }, [state]);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
  const allOn = all.length > 0 && all.every((id) => picked.has(id));

  return (
    <>
      <button type="button" className={btn.primary} onClick={() => setOpen(true)} data-testid="new-student">
        + Invitar estudiante nuevo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-student-title" data-testid="new-student-dialog">
          <div ref={dialog} className="my-4 w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="new-student-title" className="text-xl font-extrabold">
                  Invitar estudiante nuevo
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#5E5A73]">Creamos su cuenta, le damos sus cursos y le llega «Bienvenida general» para entrar con un código.</p>
              </div>
              <button type="button" className={btn.small} onClick={() => setOpen(false)} disabled={pending} aria-label="Cerrar">
                ✕
              </button>
            </div>

            {state && (
              <div
                role={state.ok ? "status" : "alert"}
                data-testid="new-student-result"
                className={`rounded-2xl p-3 text-sm font-bold ${state.ok && state.created ? "bg-[#E3F6E8] text-[#15803D]" : state.ok ? "bg-[#FFF4D6] text-[#7A5A00]" : "bg-[#FDECEA] text-[#B42318]"}`}
              >
                {state.ok && state.created && (
                  <>
                    ✓ Cuenta creada con {state.courses} {state.courses === 1 ? "curso" : "cursos"}. {state.inviteText}{" "}
                    <Link href={`/app/admin/estudiantes/${state.userId}`} className="underline">
                      Ver su página
                    </Link>
                  </>
                )}
                {state.ok && !state.created && (
                  <>
                    Ese correo ya tiene cuenta: no cambiamos nada.{" "}
                    {state.userId && (
                      <Link href={`/app/admin/estudiantes/${state.userId}`} className="underline">
                        Abre su página
                      </Link>
                    )}{" "}
                    para darle acceso o enviarle la invitación.
                  </>
                )}
                {!state.ok && (
                  <>
                    {state.error}{" "}
                    {state.userId && (
                      <Link href={`/app/admin/estudiantes/${state.userId}`} className="underline">
                        Abrir su página
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}

            <form key={formKey} action={action} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="ns-email" className={label}>
                    Correo
                  </label>
                  <input ref={first} id="ns-email" name="email" type="email" required autoComplete="off" className={`w-full ${input}`} placeholder="nombre@correo.com" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ns-name" className={label}>
                    Nombre
                  </label>
                  <input id="ns-name" name="name" required minLength={2} maxLength={80} autoComplete="off" className={`w-full ${input}`} placeholder="Nombre y apellido" />
                </div>
              </div>

              <fieldset className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <legend className={label}>Cursos</legend>
                  <label className="flex items-center gap-2 text-sm font-extrabold text-[#D6006A]">
                    <input type="checkbox" checked={allOn} onChange={(e) => toggle(all, e.target.checked)} data-testid="ns-all" />
                    Todo CelsU
                  </label>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-[#EFE6F2] p-3">
                  {groups.map((g) => {
                    const ids = g.courses.map((c) => c.id);
                    const on = ids.every((id) => picked.has(id));
                    return (
                      <div key={g.key} className="space-y-1">
                        <label className="flex items-center gap-2 text-sm font-extrabold text-[#1B1830]">
                          <input type="checkbox" checked={on} onChange={(e) => toggle(ids, e.target.checked)} />
                          {g.label}
                        </label>
                        {g.courses.length > 1 &&
                          g.courses.map((c) => (
                            <label key={c.id} className="ml-6 flex items-center gap-2 text-sm font-semibold text-[#4A4766]">
                              <input type="checkbox" checked={picked.has(c.id)} onChange={(e) => toggle([c.id], e.target.checked)} />
                              {c.title}
                            </label>
                          ))}
                      </div>
                    );
                  })}
                </div>
                {[...picked].map((id) => (
                  <input key={id} type="hidden" name="course" value={id} />
                ))}
                <p className="text-xs font-semibold text-[#6B6680]">{picked.size ? `${picked.size} ${picked.size === 1 ? "curso elegido" : "cursos elegidos"}` : "Elige al menos uno."}</p>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className={label}>Acceso</legend>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="radio" name="access" value="open" checked={access === "open"} onChange={() => setAccess("open")} />
                  Sin fecha de fin
                </label>
                <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <input type="radio" name="access" value="until" checked={access === "until"} onChange={() => setAccess("until")} />
                  Hasta
                  <input type="date" name="expires_at" min={iso(new Date(Date.now() + 864e5))} disabled={access !== "until"} required={access === "until"} className={input} aria-label="Fecha de fin" />
                </label>
              </fieldset>

              <label className="flex items-start gap-2 text-sm font-semibold">
                <input type="checkbox" name="send" defaultChecked className="mt-0.5" />
                <span>
                  Enviar la invitación ahora <span className="text-[#6B6680]">(«Bienvenida general»: entra con un código a este correo)</span>
                </span>
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" className={btn.ghost} onClick={() => setOpen(false)} disabled={pending}>
                  Cerrar
                </button>
                <button type="submit" className={btn.primary} disabled={pending || !picked.size} data-testid="ns-submit">
                  {pending ? "Creando…" : "Crear e invitar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
