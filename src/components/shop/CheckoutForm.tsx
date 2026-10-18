"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
const field = `mt-1 w-full rounded-xl border border-[#E4DEEA] bg-white px-3 py-2.5 text-base font-semibold ${focus}`;

const ERRORS: Record<string, string> = {
  email: "Revisa tu correo.",
  name: "Escribe tu nombre.",
  product: "Ese plan ya no está disponible.",
  payments_off: "Los pagos aún no están activos. Escríbenos a hola@celstv.com.",
};

/** "Tu cuenta" + the pay button: creates the Stripe Checkout session and goes there. */
export function CheckoutForm({ product, signedInEmail, payLabel, color, ink }: { product: string; signedInEmail: string | null; payLabel: string; color: string; ink: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(e.currentTarget);
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const { data, error: fnError } = await supabase.functions.invoke("checkout", {
          body: { action: "start", product, name: form.get("name"), email: form.get("email") },
          headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : undefined,
        });
        const url = (data as { url?: string } | null)?.url;
        if (url) return void (window.location.href = url);
        let code = "";
        try {
          code = ((await (fnError as { context?: Response })?.context?.json()) as { error?: string })?.error ?? "";
        } catch {
          /* no body */
        }
        setError(ERRORS[code] ?? "No pudimos abrir el pago. Intenta de nuevo.");
        setBusy(false);
      }}
    >
      <fieldset className="rounded-2xl border border-[#EFE6F2] bg-[#FBFAFD] p-4">
        <legend className="px-1 text-sm font-extrabold">Tu cuenta</legend>
        {signedInEmail ? (
          <p className="text-sm font-semibold text-[#4A4766]">
            Compras con <b className="text-[#1B1830]">{signedInEmail}</b>.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#4A4766]">Creamos tu cuenta al pagar. Te enviaremos un enlace para entrar.</p>
            <label className="block">
              <span className="text-sm font-extrabold">Tu nombre</span>
              <input name="name" required maxLength={80} autoComplete="name" className={field} />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold">Tu correo</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" className={field} />
            </label>
          </div>
        )}
      </fieldset>
      {error && <p className="rounded-xl bg-[#FFE3F0] px-3 py-2 text-sm font-bold text-[#B5007E]">{error}</p>}
      <button disabled={busy} className={`w-full rounded-full px-5 py-4 text-base font-extrabold disabled:opacity-60 ${focus}`} style={{ background: color, color: ink }}>
        {busy ? "Abriendo el pago…" : payLabel}
      </button>
    </form>
  );
}
