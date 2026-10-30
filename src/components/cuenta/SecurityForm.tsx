"use client";

// Seguridad (spec §4): change (or, for Google accounts, create) the password; sign out everywhere.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary, Lang } from "@/lib/i18n/dictionaries";
import { authError } from "@/lib/auth-errors";
import { card, input, primary } from "./ui";

type T = Dictionary["cuenta"];

/** 0 weak · 1 ok · 2 strong: length plus a mix of letters, numbers and symbols. */
export function strength(pw: string) {
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 12 && kinds >= 3) return 2;
  if (pw.length >= 8 && kinds >= 2) return 1;
  return 0;
}

export function PasswordFields({ t, onSubmit, label, busy }: { t: T; onSubmit: (pw: string) => void; label: string; busy: boolean }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const s = strength(pw);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError(t.pwShort);
    if (pw !== again) return setError(t.pwMismatch);
    setError(null);
    onSubmit(pw);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="pw" className="mb-1 block text-sm font-extrabold">
          {t.newPassword}
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className={input}
          aria-describedby="pw-hint"
        />
        <div id="pw-hint" className="mt-1.5 flex items-center gap-2 text-xs text-[#6B6680]">
          <span className="flex h-1.5 w-24 gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex-1 rounded-full" style={{ background: pw && i <= s ? ["#C0262D", "#D9A100", "#1E7A3A"][s] : "#E3DDEA" }} />
            ))}
          </span>
          {pw ? [t.pwStrength.weak, t.pwStrength.ok, t.pwStrength.strong][s] : t.pwMin}
        </div>
      </div>
      <div>
        <label htmlFor="pw2" className="mb-1 block text-sm font-extrabold">
          {t.confirmPassword}
        </label>
        <input id="pw2" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={input} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-[#C0262D]">
          {error}
        </p>
      )}
      <button className={primary} disabled={busy}>
        {busy ? t.saving : label}
      </button>
    </form>
  );
}

export function SecurityForm({ t, lang, google, hasPassword, byCode }: { t: T; lang: Lang; google: boolean; hasPassword: boolean; byCode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState(0);

  const save = async (password: string) => {
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    // C-038: the real reason (weak or leaked, same as before…), never a generic error.
    setMsg({ ok: !error, text: error ? authError(error, lang, "password").text : t.pwSaved });
    if (!error) setForm((n) => n + 1);
  };
  const everywhere = async () => {
    await createClient().auth.signOut({ scope: "global" });
    router.push("/entrar");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-extrabold">{byCode ? t.passwordOptional : google && !hasPassword ? t.createPassword : t.changePassword}</h2>
        {byCode && <p className="text-sm text-[#6B6680]">{t.passwordOptionalHint}</p>}
        {google && (
          <p className="rounded-xl bg-[#F7F5FA] px-3 py-2 text-sm">
            <strong>{t.google}.</strong> {!hasPassword && t.googleHint}
          </p>
        )}
        <PasswordFields key={form} t={t} busy={busy} onSubmit={(pw) => void save(pw)} label={google && !hasPassword ? t.createPassword : t.savePassword} />
        {msg && (
          <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-[#1E7A3A]" : "text-[#C0262D]"}`}>
            {msg.text}
          </p>
        )}
      </section>
      <section className={`${card} space-y-2`}>
        <button type="button" onClick={() => void everywhere()} className="font-extrabold text-[#D10F75] hover:underline">
          {t.signOutAll}
        </button>
        <p className="text-sm text-[#6B6680]">{t.signOutAllHint}</p>
      </section>
    </div>
  );
}
