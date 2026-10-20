// Enrollment flow (Matt, 2026-10-20, content/fixes/matt-decisions-2026-10-20.md item 1):
// every buy/enroll button → /inscribirme?programa=… → free evaluation (or "ver los planes") → offer.
// Safe on the server and in the browser.
import type { ProgramKey } from "@/lib/purchase-programs";

/**
 * Whether people can pay (Stripe live). Vercel env var PURCHASES_OPEN ("true" opens them); next.config.ts
 * copies it into NEXT_PUBLIC_PURCHASES_OPEN at build time, so flipping it needs a redeploy.
 * Closed: plan buttons go to /registro?plan=<product code> (free account, spot reserved, staff use "Dar acceso").
 * Open: they go to /comprar/resumen?producto=<code> as before.
 */
export const PURCHASES_OPEN = process.env.NEXT_PUBLIC_PURCHASES_OPEN === "true";

export const ENROLL_PROGRAMS = ["celstv", "celsus", "celsbsns", "celsglobal"] as const satisfies readonly ProgramKey[];
export const isEnrollProgram = (p: unknown): p is ProgramKey => typeof p === "string" && (ENROLL_PROGRAMS as readonly string[]).includes(p);

/** The entry point of every "Comprar / Inscríbete / Obtener paquete" button outside a #planes section. */
export const enrollHref = (programa: ProgramKey) => `/inscribirme?programa=${programa}`;

/** The program page's plans section (the "Prefiero ver los planes directamente" link). */
export const plansHref = (programa: ProgramKey) => `/${programa}#planes`;

/**
 * The program's evaluation. CelsTV, CelsBSNS and CelsGLOBAL use the English evaluation.
 * TODO(celsus-eval): CelsUS gets its own short public evaluation (basic English + ~10 civics questions,
 * score out of 100, reusing the civics bank and ExamRunner from /app/examen-civico). When /evaluacion/celsus
 * ships, return it here for "celsus"; until then CelsUS uses /evaluacion.
 */
export const evalHref = (programa: ProgramKey) => `/evaluacion?programa=${programa}`;

/** A plan button (plan cards inside #planes, and "Empieza hoy" on the evaluation result). */
export function planHref(code: string) {
  if (!PURCHASES_OPEN) return `/registro?plan=${encodeURIComponent(code)}`;
  // CelsGLOBAL opens its "one payment or 5" choice, as before.
  return code === "celsglobal" ? "/comprar/celsglobal" : `/comprar/resumen?producto=${encodeURIComponent(code)}`;
}

/**
 * The plan the evaluation result offers for a program. The boards mark Premium / Paquete Completo as
 * "Recomendado"; CelsBSNS needs B2, so below B2 the CelsTV + CelsBSNS bundle is offered instead.
 * g: 0..5 = A1..C2.
 */
export function recommendedPlan(programa: ProgramKey, g: number): string {
  switch (programa) {
    case "celstv":
      return "celstv_premium";
    case "celsbsns":
      return g >= 3 ? "celsbsns_premium" : "bundle_tv_bsns";
    case "celsus":
      return "celsus_completo";
    case "celsglobal":
      return "celsglobal";
  }
}
