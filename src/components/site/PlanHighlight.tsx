"use client";
// /celstv?plan=<code>#planes (the "ver los planes" link of /inscribirme, Matt 2026-10-20 item 3): highlights the
// plan card the person clicked on the home page. The boards are generated markup, so the card is found by its
// plan button (src/lib/enroll.ts planHref) and marked with a data attribute; nothing else on the page changes.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { planCode, planHref } from "@/lib/enroll";

const STYLE = `[data-chosen-plan]{outline:4px solid #FFC531;outline-offset:4px;box-shadow:0 0 0 10px rgba(255,197,49,.18),0 34px 70px -24px rgba(0,0,0,.7)!important}
[data-chosen-plan]::before{content:attr(data-chosen-plan);position:absolute;top:6px;left:12px;z-index:2;padding:2px 9px;border-radius:999px;background:#FFC531;color:#3a2a00;font-size:10px;line-height:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}`;

/** The boards are Spanish-only, so the badge is too. */
export function PlanHighlight({ label = "Elegiste" }: { label?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const code = planCode(new URLSearchParams(window.location.search).get("plan"));
    if (!code) return;
    const button = document.querySelector(`#planes a[href="${planHref(code)}"]`);
    const card = button?.closest("article");
    if (!card) return;
    card.setAttribute("data-chosen-plan", label);
    return () => card.removeAttribute("data-chosen-plan");
  }, [pathname, label]);
  return <style>{STYLE}</style>;
}
