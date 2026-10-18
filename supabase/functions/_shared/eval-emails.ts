// Evaluation emails: results right away, D1/D3/D7 follow-ups (until the student buys) and the
// D30 retake reminder (everyone). The designs are emails/app/eval-*.html; this file only fills
// their variables and hands them to the mailer.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { LEVELS, recommendation, type Band, type Goal } from "./eval-engine.ts";
import { firstName, mxn, sendTemplate, siteUrl } from "./mailer.ts";

export type LeadForEmail = {
  id: string;
  name: string;
  email: string;
  goal: string | null;
  cefr_level: string | null;
  skill_levels: Record<string, string> | null;
  unsubscribe_token: string;
  evaluated_at: string;
};

const LEVEL_NAME: Record<Band, string> = { A1: "Principiante", A2: "Básico", B1: "Intermedio", B2: "Intermedio alto", C1: "Avanzado", C2: "Dominio" };
const LEVEL_TEXT: Record<Band, string> = {
  A1: "Entiendes y usas expresiones básicas del día a día. Tu siguiente meta: presentarte y hablar de tu rutina.",
  A2: "Te comunicas en situaciones sencillas y familiares. Tu siguiente meta: conversar sobre temas conocidos.",
  B1: "Te comunicas en situaciones conocidas y entiendes las ideas principales. Tu siguiente meta: hablar con más fluidez.",
  B2: "Te comunicas con fluidez en la mayoría de contextos. Tu siguiente meta: el inglés de tu trabajo.",
  C1: "Usas el inglés con eficacia en contextos profesionales y sociales. Tu siguiente meta: precisión y matices.",
  C2: "Te expresas con precisión y naturalidad casi nativa. Tu siguiente meta: mantenerlo y llevarlo a tu carrera.",
};
// template variable prefix → engine section
const SKILLS: [string, string][] = [["vocabulario", "V"], ["auditiva", "L"], ["lectura", "R"], ["escritura", "W"], ["oral", "S"]];
const OFFER = {
  celstv: { titulo: "CelsTV", texto: "Inglés real en episodios cortos, con tarjetas, audio y quizzes. Empiezas en el episodio que va con tu nivel.", usd: 99 },
  celsbsns: { titulo: "CelsBSNS", texto: "10 semanas de inglés para tu trabajo: reuniones, correos, entrevistas y presentaciones.", usd: 120 },
  bundle: { titulo: "CelsTV + CelsBSNS", texto: "Empiezas con CelsTV para ganar fluidez y entras a CelsBSNS cuando llegues a B2. $150 · Ahorras $69.", usd: 150 },
};

const band = (l: string | null | undefined): Band => (LEVELS.includes(l as Band) ? (l as Band) : "A1");
const pct = (l: string | undefined) => String(Math.round(((LEVELS.indexOf(band(l)) + 1) / 6) * 100));

/** The A1–C2 row, with the student's level dark (same cells as scale_html() in the design generator). */
export function scaleHtml(level: Band) {
  return LEVELS.map((L) => {
    const on = L === level;
    const bg = on ? "#1B1830" : "#F4F1F7";
    return `<td align="center" width="15%" bgcolor="${bg}" style="padding:6px 0;font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;font-size:12px;font-weight:800;border-radius:8px;background:${bg};color:${on ? "#FFFFFF" : "#8A86A0"};">${L}</td>`;
  }).join(`<td width="2%" style="font-size:0;line-height:0;">&nbsp;</td>`);
}

const rec = (level: Band, goal: string | null) => recommendation(LEVELS.indexOf(level), (goal as Goal) ?? "general");

function landingUrl(name: string, level: Band, goal: string | null) {
  const r = rec(level, goal);
  const q = new URLSearchParams({ name: firstName(name), level, goal: goal ?? "general" });
  return `${siteUrl()}/${r.product === "celstv" ? "celstv" : "celsbsns"}?${q}`;
}

type Who = { email: string; name: string; goal: string | null; level: string | null; skills: Record<string, string> | null; evaluatedAt: string; leadId?: string; userId?: string };

/** Results email, for a lead or a signed-in student (who goes back to the app instead of a sales page). */
export async function sendResults(admin: SupabaseClient, who: Who) {
  const level = band(who.level);
  const offer = OFFER[rec(level, who.goal).product];
  const vars: Record<string, string> = {
    nombre: firstName(who.name),
    nivel: level,
    nivel_nombre: LEVEL_NAME[level],
    nivel_texto: LEVEL_TEXT[level],
    escala_html: scaleHtml(level),
    oferta_titulo: offer.titulo,
    oferta_texto: offer.texto,
    oferta_precio: `$${offer.usd} USD`,
    oferta_mxn: await mxn(offer.usd).then((m) => (m ? `≈ ${m} MXN · se cobra en dólares` : "")),
    boton_url: who.userId ? `${siteUrl()}/app` : landingUrl(who.name, level, who.goal),
  };
  for (const [k, sec] of SKILLS) {
    vars[`${k}_nivel`] = band(who.skills?.[sec]);
    vars[`${k}_pct`] = pct(who.skills?.[sec]);
  }
  return sendTemplate(admin, {
    template: "eval-results",
    to: who.email,
    vars,
    dedupeKey: `eval-results:${who.leadId ?? who.userId}:${who.evaluatedAt}`,
    leadId: who.leadId,
    userId: who.userId,
  });
}

export const FOLLOW_UPS = ["eval-d1", "eval-d3", "eval-d7", "eval-d30"] as const;

/** Follow-up for a stage: 1 = D1, 2 = D3, 3 = D7, 4 = D30 retake reminder. */
export async function sendFollowUp(admin: SupabaseClient, stage: 1 | 2 | 3 | 4, lead: LeadForEmail) {
  const level = band(lead.cefr_level);
  const next = LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)];
  const template = FOLLOW_UPS[stage - 1];
  return sendTemplate(admin, {
    template,
    to: lead.email,
    vars: { nivel: level, siguiente_nivel: next, boton_url: stage === 4 ? `${siteUrl()}/evaluacion` : landingUrl(lead.name, level, lead.goal) },
    dedupeKey: `${template}:${lead.id}:${lead.evaluated_at}`,
    leadId: lead.id,
    unsubscribeToken: lead.unsubscribe_token,
  });
}
