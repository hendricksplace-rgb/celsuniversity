"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { InstallLink } from "@/components/install/InstallApp";
import { PROGRAMS, type ProgramKey } from "@/lib/purchase-programs";
import { SITE_URL } from "@/lib/site";

type Status = { state: "pending" | "active" | "failed"; product?: string; program?: string; name?: string | null; email?: string; access?: string; lessonId?: string | null };

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

/**
 * Don't trust the redirect: poll checkout "status" until stripe-webhook has created the enrollment.
 * Guests (account created at payment) get a sign-in link by email; signed-in buyers go to their first lesson.
 */
export function Welcome({ sessionId, signedIn }: { sessionId: string; signedIn: boolean }) {
  const [s, setS] = useState<Status>({ state: "pending" });
  const [slow, setSlow] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    let stop = false;
    let tries = 0;
    const tick = async () => {
      if (stop) return;
      const { data } = await createClient().functions.invoke("checkout", { body: { action: "status", session_id: sessionId } });
      const st = (data ?? { state: "pending" }) as Status;
      if (st.state !== "pending") return setS(st);
      if (++tries > 15) setSlow(true);
      setTimeout(tick, tries < 10 ? 2000 : 5000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [sessionId]);

  if (s.state === "failed") {
    if (typeof window !== "undefined") window.location.replace(`/pago-fallido?producto=${encodeURIComponent(s.product ?? "")}`);
    return null;
  }
  if (s.state === "pending")
    return (
      <div className="py-16 text-center" role="status" aria-live="polite">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#F1EDF5] border-t-[#F5178C] motion-reduce:animate-none" aria-hidden />
        <p className="mt-4 text-lg font-extrabold">Activando tu acceso…</p>
        {slow && (
          <p className="mt-2 text-sm font-semibold text-[#6B6680]">Está tardando más de lo normal. No cierres esta página; si ya pasó un minuto, escríbenos a hola@celstv.com.</p>
        )}
      </div>
    );

  const key = (s.program && s.program in PROGRAMS ? s.program : "celstv") as ProgramKey;
  const meta = PROGRAMS[key];
  const lessonHref = s.lessonId ? `/app/lecciones/${s.lessonId}` : "/app";
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ background: meta.bg, color: "#fff" }}>
        {key === "celsus" && (
          <span className="absolute right-5 top-5 grid h-16 w-16 place-items-center rounded-full border-4 border-[#FFD24D] font-serif text-xs font-bold text-[#FFD24D]" aria-hidden>
            CelsUS
          </span>
        )}
        <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: meta.color }}>
          Pago confirmado
        </p>
        <h1 className={`mt-2 text-3xl font-extrabold leading-tight sm:text-4xl ${key === "celsus" || key === "celsglobal" ? "font-serif" : ""}`}>
          Bienvenida a {meta.title}
          {s.name ? `, ${s.name}` : ""}
        </h1>
        <p className="mt-2 text-sm font-semibold opacity-90">Tu acceso: {s.access}.</p>
        <p className="text-sm font-semibold opacity-90">Te enviamos tu recibo a {s.email}.</p>
      </section>

      <section className="rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Tus primeros pasos</h2>
        <ol className="mt-3 space-y-2.5">
          {meta.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm font-semibold text-[#4A4766]">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: meta.color, color: meta.ink }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex items-center gap-3 rounded-3xl p-4" style={{ background: "linear-gradient(120deg,#FFE3F0,#DDF6FF)" }}>
        <div className="flex-1">
          <b className="block">Lleva CelsU en tu celular</b>
          <span className="text-sm font-semibold text-[#4A4766]">Ábrela con un toque y estudia sin internet.</span>
        </div>
        <InstallLink className={`rounded-full bg-[#1B1830] px-4 py-2.5 text-sm font-extrabold text-white ${focus}`}>Descargar</InstallLink>
      </section>

      {signedIn ? (
        <Link href={lessonHref} className={`block rounded-full px-5 py-4 text-center text-base font-extrabold ${focus}`} style={{ background: meta.color, color: meta.ink }}>
          Empezar mi primera lección →
        </Link>
      ) : linkSent ? (
        <p className="rounded-2xl bg-[#E5F3E2] p-4 text-center text-sm font-bold text-[#2E6B2A]">Listo: revisa {s.email} y toca el enlace para entrar.</p>
      ) : (
        <button
          type="button"
          className={`block w-full rounded-full px-5 py-4 text-base font-extrabold ${focus}`}
          style={{ background: meta.color, color: meta.ink }}
          onClick={async () => {
            if (!s.email) return;
            await createClient().auth.signInWithOtp({
              email: s.email,
              options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(lessonHref)}` },
            });
            setLinkSent(true);
          }}
        >
          Enviarme el enlace para entrar →
        </button>
      )}
    </div>
  );
}
