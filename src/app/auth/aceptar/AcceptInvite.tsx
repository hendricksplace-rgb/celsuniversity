"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

/**
 * The invite link signs the person in: either with tokens in the URL fragment (Supabase's
 * {{ .ConfirmationURL }} redirect) or with ?token_hash=…&type=invite. Then they choose a password.
 */
export function AcceptInvite() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "expired" | "saving">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      if (hash.get("error_code") || query.get("error_code")) return setState("expired");
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const token_hash = query.get("token_hash");
      let ok = false;
      if (access_token && refresh_token) ok = !(await supabase.auth.setSession({ access_token, refresh_token })).error;
      else if (token_hash) ok = !(await supabase.auth.verifyOtp({ token_hash, type: "invite" })).error;
      else ok = !!(await supabase.auth.getUser()).data.user;
      // Don't leave tokens in the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      setState(ok ? "ready" : "expired");
    })();
  }, []);

  if (state === "checking") return <p className="font-bold text-[#4A4766]">Verificando tu invitación…</p>;
  if (state === "expired")
    return (
      <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-extrabold">El enlace ya no funciona</h1>
        <p className="mt-2 text-sm font-semibold text-[#4A4766]">Las invitaciones vencen en 24 horas. Pide a Matt que te envíe una nueva.</p>
      </div>
    );

  return (
    <form
      className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const password = String(form.get("password") ?? "");
        if (password.length < 8) return setError("Usa al menos 8 caracteres.");
        if (password !== String(form.get("confirm") ?? "")) return setError("Las contraseñas no coinciden.");
        setError("");
        setState("saving");
        const { error: e2 } = await createClient().auth.updateUser({ password });
        if (e2) {
          setError("No se pudo guardar. Intenta con otra contraseña.");
          return setState("ready");
        }
        router.replace("/app/admin");
      }}
    >
      <h1 className="text-2xl font-extrabold">Bienvenido al equipo de CelsU</h1>
      <p className="text-sm font-semibold text-[#4A4766]">Crea tu contraseña para entrar.</p>
      <label className="block">
        <span className="text-sm font-extrabold">Contraseña</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={`mt-1 w-full rounded-xl border border-[#E4DEEA] px-3 py-2.5 ${focus}`} />
      </label>
      <label className="block">
        <span className="text-sm font-extrabold">Repite la contraseña</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={`mt-1 w-full rounded-xl border border-[#E4DEEA] px-3 py-2.5 ${focus}`} />
      </label>
      {error && <p className="rounded-xl bg-[#FFE3F0] px-3 py-2 text-sm font-bold text-[#B5007E]">{error}</p>}
      <button disabled={state === "saving"} className={`w-full rounded-full bg-[#D6006A] px-5 py-3 font-extrabold text-white disabled:opacity-60 ${focus}`}>
        {state === "saving" ? "Guardando…" : "Crear contraseña y entrar"}
      </button>
    </form>
  );
}
