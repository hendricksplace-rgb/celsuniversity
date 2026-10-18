"use client";

// Exchanges the recovery code from the email (or picks up the PASSWORD_RECOVERY session), asks for
// the new password twice and sends the student to /app. Expired or reused links say so.
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PasswordFields } from "@/components/cuenta/SecurityForm";

type T = Dictionary["cuenta"];

export function NewPassword({ t }: { t: T }) {
  const [state, setState] = useState<"checking" | "ready" | "expired" | "done">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
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

  const save = async (password: string) => {
    setBusy(true);
    const { error: e } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (e) return setError(t.pwError);
    setState("done");
    setTimeout(() => window.location.assign("/app"), 1800);
  };

  return (
    <div className="card mx-auto max-w-sm space-y-5">
      {state === "expired" ? (
        <>
          <h1 className="text-2xl font-bold">{t.expired}</h1>
          <p className="text-sm text-white/70">{t.expiredText}</p>
          <Link href="/recuperar" className="btn-primary block w-full text-center">
            {t.askAnother}
          </Link>
        </>
      ) : state === "done" ? (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-3 font-semibold">
          ✓ {t.newDone}
        </p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">{t.newTitle}</h1>
          {state === "checking" ? (
            <p className="text-sm text-white/70" role="status">
              …
            </p>
          ) : (
            <div className="[&_input]:text-[#1B1830]">
              <PasswordFields t={t} busy={busy} onSubmit={(pw) => void save(pw)} label={t.newSave} />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-300">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
