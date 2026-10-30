"use client";

// Password reset, step 3 (C-032 design, C-038 rules): exchanges the recovery code from the email (or picks up the
// session /auth/confirm already made), asks for the new password with the live checklist and a confirm field, and
// says why Supabase refused one (weak or leaked, same as before…) instead of failing silently. Saved: toast
// "Contraseña actualizada", still signed in, on to /app (or ?next=, e.g. invitations → Mis cursos).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-next";
import { authError } from "@/lib/auth-errors";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { LoginCopy } from "@/lib/i18n/login-copy";
import { AuthFrame, Field, PasswordGuide, passwordRules } from "@/components/auth/AuthFrame";

export function NewPassword({ c, lang }: { c: LoginCopy; lang: Lang }) {
  const [state, setState] = useState<"checking" | "ready" | "expired" | "done">("checking");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [errs, setErrs] = useState<{ pw?: string | null; again?: string | null }>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [next, setNext] = useState("/app");
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    setNext(safeNextPath(url.searchParams.get("next")));
    const hash = new URLSearchParams(url.hash.slice(1));
    if (url.searchParams.get("error_code") || hash.get("error_code") || url.searchParams.get("error")) return setState("expired");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setState("ready");
    });
    const code = url.searchParams.get("code");
    (async () => {
      if (code) {
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", "/nueva-contrasena");
        return setState(ex ? "expired" : "ready");
      }
      const { data } = await supabase.auth.getSession();
      setState((s) => (s === "checking" ? (data.session ? "ready" : "expired") : s));
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  const shake = () => {
    const el = card.current;
    if (!el) return;
    el.classList.remove("au-shake");
    void el.offsetWidth;
    el.classList.add("au-shake");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const r = passwordRules(pw);
    const bad = { pw: !pw ? c.errors.passwordEmpty : r.length && r.mix ? null : c.errors.passwordRules, again: pw && again !== pw ? c.errors.mismatch : null };
    if (bad.pw || bad.again) {
      setErrs(bad);
      return shake();
    }
    setBusy(true);
    setAlert(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      setAlert(authError(error, lang, "password").text);
      return shake();
    }
    // Invited students (/activar): their invitation link stops working once the password exists.
    await supabase.rpc("mark_invite_activated").then(
      () => undefined,
      () => undefined,
    );
    setState("done");
    setTimeout(() => window.location.assign(next), 1600);
  };

  return (
    <AuthFrame c={c} lang={lang} side="forgot">
      {state === "done" && (
        <div className="au-toast" role="status" data-testid="pw-saved">
          ✓ {c.saved}
        </div>
      )}
      <div className="au-card ev-pg" ref={card}>
        <div className="au-pane" key={state === "expired" ? "x" : "f"}>
          {state === "expired" ? (
            <div className="au-done">
              <div className="au-mail" style={{ background: "linear-gradient(135deg,#FF7AB8,#F20174)" }}>
                <svg viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h2>{c.expiredTitle}</h2>
              <p className="au-lede">{c.expiredLede}</p>
              <Link href="/recuperar" className="ev-btn">
                {c.askAnother}
              </Link>
              <Link href="/entrar" className="au-link au-alt" style={{ textAlign: "center" }}>
                {c.tryCode}
              </Link>
            </div>
          ) : (
            <form onSubmit={save} noValidate>
              <h2>{c.newTitle}</h2>
              <p className="au-lede">{state === "checking" ? c.checking : c.newLede}</p>
              {alert && (
                <div className="au-alert" role="alert">
                  {alert}
                </div>
              )}
              <Field
                id="pw"
                label={c.newPassword}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(v) => (setPw(v), setErrs({}))}
                error={errs.pw}
                c={c}
              />
              <Field
                id="pw2"
                label={c.confirm}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={again}
                onChange={(v) => (setAgain(v), setErrs({}))}
                error={errs.again}
                c={c}
              />
              <PasswordGuide c={c} pw={pw} again={again} />
              <button type="submit" className="ev-btn" disabled={busy || state !== "ready"} data-testid="auth-submit">
                {busy || state === "done" ? <span className="au-sp" aria-label="…" /> : c.newSave}
              </button>
            </form>
          )}
        </div>
      </div>
    </AuthFrame>
  );
}
