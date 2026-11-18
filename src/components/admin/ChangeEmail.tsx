"use client";

// «Cambiar correo» on Admin → Estudiantes → student (C-046): the pencil next to the email opens this dialog.
// Validates here (format, both fields match, not the current one), then changeStudentEmail → admin-change-email.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStudentEmail, type ChangeEmailError } from "@/app/app/admin/estudiantes/email-actions";
import { btn, input, label } from "@/components/builder/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["adminEmail"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: string) => s.trim().toLowerCase();

const ERR: Record<ChangeEmailError | "mismatch", keyof T> = {
  invalid: "errInvalid",
  mismatch: "errMismatch",
  same: "errSame",
  taken: "errTaken",
  staff_account: "errStaff",
  self: "errSelf",
  forbidden: "errForbidden",
  rate: "errRate",
  not_found: "errNotFound",
  generic: "errGeneric",
};

export function ChangeEmailButton({ userId, currentEmail, t }: { userId: string; currentEmail: string; t: T }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [again, setAgain] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const reset = () => {
    setEmail("");
    setAgain("");
    setReason("");
    setNotify(true);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = clean(email);
    const problem: ChangeEmailError | "mismatch" | null = !EMAIL.test(next) ? "invalid" : next !== clean(again) ? "mismatch" : next === clean(currentEmail) ? "same" : null;
    if (problem) return setError(t[ERR[problem]]);
    setError(null);
    start(async () => {
      const r = await changeStudentEmail({ userId, newEmail: next, reason, notify });
      if (!r.ok) return setError(t[ERR[r.error]]);
      const lines = [t.done.replace("{email}", r.email)];
      if (r.invitesExpired) lines.push(t.inviteExpired);
      if (r.stripeFailed) lines.push(t.stripeFailed);
      if (r.mailFailed) lines.push(t.mailFailed);
      setOpen(false);
      reset();
      setToast({ ok: !r.stripeFailed && !r.mailFailed, lines });
      setTimeout(() => setToast(null), r.invitesExpired || r.stripeFailed || r.mailFailed ? 9000 : 4000);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#5E5A73] transition hover:bg-[#F1EDF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6006A]"
        aria-label={t.button}
        title={t.button}
        data-testid="change-email"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span className="hidden sm:inline">{t.button}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-email-title"
          data-testid="change-email-dialog"
          onClick={(e) => e.target === e.currentTarget && !pending && setOpen(false)}
        >
          <form onSubmit={submit} noValidate className="max-h-[92vh] w-full max-w-md space-y-4 overflow-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 id="change-email-title" className="text-xl font-extrabold">
              {t.title}
            </h2>
            <div>
              <p className={label}>{t.current}</p>
              <p className="mt-1 break-all rounded-xl bg-[#F7F5FA] px-3 py-2 text-sm font-bold text-[#1B1830]" data-testid="change-email-current">
                {currentEmail}
              </p>
            </div>
            <div>
              <label htmlFor="ce-new" className={label}>
                {t.newEmail}
              </label>
              <input ref={first} id="ce-new" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 h-12 w-full ${input}`} />
            </div>
            <div>
              <label htmlFor="ce-again" className={label}>
                {t.confirm}
              </label>
              <input id="ce-again" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required value={again} onChange={(e) => setAgain(e.target.value)} className={`mt-1 h-12 w-full ${input}`} />
            </div>
            <div>
              <label htmlFor="ce-reason" className={label}>
                {t.reason}
              </label>
              <input id="ce-reason" type="text" maxLength={200} value={reason} placeholder={t.reasonPlaceholder} onChange={(e) => setReason(e.target.value)} className={`mt-1 h-12 w-full ${input}`} />
            </div>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[#EFE6F2] p-3">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#D6006A]" data-testid="change-email-notify" />
              <span>
                <span className="block text-sm font-extrabold text-[#1B1830]">{t.notify}</span>
                <span className="block text-xs font-semibold text-[#6B6680]">{t.notifyHint}</span>
              </span>
            </label>
            <p className="text-xs font-semibold text-[#6B6680]">{t.note}</p>
            {error && (
              <p role="alert" className="text-sm font-bold text-[#B42318]" data-testid="change-email-error">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${btn.ghost} h-12`}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {t.cancel}
              </button>
              <button type="submit" className={`${btn.primary} h-12`} disabled={pending} data-testid="change-email-save">
                {pending ? t.saving : t.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm space-y-1 rounded-2xl px-4 py-3 text-center font-bold text-white shadow-xl md:bottom-8 ${toast.ok ? "bg-[#1B1830]" : "bg-[#C0262D]"}`}
          data-testid="change-email-toast"
        >
          {toast.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}
    </>
  );
}
