// Enrollment flow (Matt, 2026-10-20, content/fixes/matt-decisions-2026-10-20.md item 1):
// every buy/enroll button → /inscribirme?programa=… → free evaluation (or "ver los planes") → offer.
// Safe on the server and in the browser.
import type { ProgramKey } from "@/lib/purchase-programs";

/**
 * Whether people can pay (Stripe live). Vercel env var PURCHASES_OPEN ("true" opens them); next.config.ts
 * copies it into NEXT_PUBLIC_PURCHASES_OPEN at build time, so flipping it needs a redeploy.
 * Closed: plan buttons go to /registro?plan=<product code> (free account, spot reserved, staff use "Dar acceso");
 * in /app, /app/planes saves the plan as a request ("Solicitar acceso"); the /comprar/* pages redirect to the plans.
 * Open: they go to /comprar/resumen?producto=<code> as before.
 */
export const PURCHASES_OPEN = process.env.NEXT_PUBLIC_PURCHASES_OPEN === "true";

export const ENROLL_PROGRAMS = ["celstv", "celsus", "celsbsns", "celsglobal"] as const satisfies readonly ProgramKey[];
export const isEnrollProgram = (p: unknown): p is ProgramKey => typeof p === "string" && (ENROLL_PROGRAMS as readonly string[]).includes(p);

/** A product code from a URL or form (?plan=…). Shape only: callers check it against active products. */
export const planCode = (v: unknown): string | null => (typeof v === "string" && /^[a-z0-9_]{1,60}$/.test(v) ? v : null);
const withPlan = (plan?: string | null) => (planCode(plan) ? `&plan=${plan}` : "");

/**
 * The entry point of every "Comprar / Inscríbete / Obtener paquete" button outside a #planes section.
 * A plan card passes its product code, which travels through the evaluation to /registro?plan= (Matt, 2026-10-20 item 3).
 */
export const enrollHref = (programa: ProgramKey, plan?: string | null) => `/inscribirme?programa=${programa}${withPlan(plan)}`;

/** The program page's plans section (the "Prefiero ver los planes directamente" link); ?plan= highlights that card. */
export const plansHref = (programa: ProgramKey, plan?: string | null) => `/${programa}${planCode(plan) ? `?plan=${plan}` : ""}#planes`;

/** The bundles each program's plans offer (bundles open with their main program: CelsTV + CelsBSNS → CelsBSNS, CelsUS + CelsTV → CelsUS). */
export const PROGRAM_BUNDLES: Record<ProgramKey, string[]> = {
  celstv: ["bundle_tv_bsns", "bundle_us_tvpremium"],
  celsbsns: ["bundle_tv_bsns"],
  celsus: ["bundle_us_tvpremium"],
  celsglobal: [],
};

/** The program a product belongs to in the enrollment flow (its own program; a bundle opens with its main one). */
export function programOfPlan(p: { code: string; program: string }): ProgramKey {
  if (isEnrollProgram(p.program)) return p.program;
  return p.code === "bundle_us_tvpremium" ? "celsus" : "celsbsns";
}

/**
 * In the student area (/app) every buy button goes straight to the program's plans (Matt, 2026-10-20 item 2):
 * signed-in students skip the evaluation. ?plan= highlights one.
 */
export const appPlansHref = (programa: ProgramKey, plan?: string | null) => `/app/planes?programa=${programa}${withPlan(plan)}`;

/**
 * The program's evaluation. CelsTV, CelsBSNS and CelsGLOBAL use the English evaluation.
 * TODO(celsus-eval): CelsUS gets its own short public evaluation (basic English + ~10 civics questions,
 * score out of 100, reusing the civics bank and ExamRunner from /app/examen-civico). When /evaluacion/celsus
 * ships, return it here for "celsus"; until then CelsUS uses /evaluacion.
 */
export const evalHref = (programa: ProgramKey, plan?: string | null) => `/evaluacion?programa=${programa}${withPlan(plan)}`;

/** A plan button (plan cards inside #planes, and "Empieza hoy" on the evaluation result). */
export function planHref(code: string) {
  if (!PURCHASES_OPEN) return `/registro?plan=${encodeURIComponent(code)}`;
  return checkoutHref(code);
}

/** The checkout for a product (only while PURCHASES_OPEN). */
export function checkoutHref(code: string) {
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
