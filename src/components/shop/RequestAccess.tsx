"use client";
// "Solicitar acceso" on /app/planes while purchases are closed (Matt, 2026-10-20 item 2): saves the plan as the
// student's requested plan and confirms in place. Requesting another plan clears the earlier confirmation.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPlanAccess } from "@/lib/actions";

const EVENT = "celsu:plan-requested";

export function RequestAccess({
  plan,
  back,
  color,
  ink,
  t,
}: {
  plan: string;
  back: string;
  color: string;
  ink: string;
  t: { cta: string; done: string; error: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    const other = (e: Event) => (e as CustomEvent<string>).detail !== plan && setStatus("idle");
    window.addEventListener(EVENT, other);
    return () => window.removeEventListener(EVENT, other);
  }, [plan]);

  const submit = () =>
    start(async () => {
      const r = await requestPlanAccess(plan).catch(() => "error" as const);
      if (r === "user") return router.push(`/entrar?next=${encodeURIComponent(back)}`);
      setStatus(r === "ok" ? "ok" : "error");
      if (r === "ok") {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: plan }));
        router.refresh(); // the "Solicitado" badges
      }
    });

  if (status === "ok")
    return (
      <p role="status" data-testid="plan-requested" className="rounded-2xl border-2 border-[#2E8B57] bg-[#E9F6EE] px-4 py-3 text-sm font-extrabold text-[#1B4D31]">
        ✓ {t.done}
      </p>
    );
  return (
    <>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        data-testid="plan-request"
        className="kit-focus flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1830] disabled:opacity-70"
        style={{ background: color, color: ink }}
      >
        {t.cta}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm font-bold text-[#8A0045]">
          {t.error}
        </p>
      )}
    </>
  );
}
