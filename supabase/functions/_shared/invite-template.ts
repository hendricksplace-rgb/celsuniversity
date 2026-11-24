// C-071: which invitation email a student gets, and the «Tus cursos» rows of invite-general.
// Pure TypeScript (no Deno or npm imports): the student-invite function uses it, and the app re-exports it
// (src/lib/invite-template.ts) so Admin → Estudiantes shows the same choice the function will make.
//
//   invite-celsglobal  "Cambio de plataforma CelsGLOBAL": only when everything the student has is CelsGLOBAL AND the
//                      account came from the old platform (profiles.legacy_id, or the auth user's `imported` mark
//                      from the 2026-10-20 CelsGLOBAL import, which is how those 19 students are marked).
//   invite-general     "Bienvenida general": everyone else (new people, other programs, several programs).

export type InviteTemplate = "invite-general" | "invite-celsglobal";
export const INVITE_TEMPLATES: InviteTemplate[] = ["invite-general", "invite-celsglobal"];
export const INVITE_TEMPLATE_LABEL: Record<InviteTemplate, string> = {
  "invite-general": "Bienvenida general",
  "invite-celsglobal": "Cambio de plataforma CelsGLOBAL",
};

type Brand = "celstv" | "celsbsns" | "celsus" | "celsglobal";

// Course slug → program. The same map as src/lib/themes.ts (BY_SLUG); keep them in step.
const BRAND_BY_SLUG: Record<string, Brand> = {
  "celstv-english-for-our-generation": "celstv",
  "english-for-business": "celsbsns",
  "celsus-para-ciudadania": "celsus",
  "from-cv-to-u-s-resume-a-step-by-step-guide": "celsglobal",
  "resume-review": "celsglobal",
  "crack-the-u-s-interview-code": "celsglobal",
  "interview-prep": "celsglobal",
  "finanzas-personales-en-estados-unidos": "celsglobal",
  "tu-camino-con-la-visa-tn-empieza-aqui": "celsglobal",
};

// Program enrollments (enrollments.program_id) → the program they stand for. The CelsGLOBAL program also holds
// CelsTV and English for Business, so a program enrollment counts as its program, never as its courses.
const BRAND_BY_PROGRAM: Record<string, Brand> = {
  "international-professional-development": "celsglobal",
};

/** CelsGLOBAL's courses, as pills in the email. */
const GLOBAL_SHORT: Record<string, string> = {
  "from-cv-to-u-s-resume-a-step-by-step-guide": "From CV to U.S. Resume",
  "resume-review": "Resume Review",
  "crack-the-u-s-interview-code": "Crack the U.S. Interview Code",
  "interview-prep": "Interview Prep",
  "finanzas-personales-en-estados-unidos": "Finanzas Personales",
  "tu-camino-con-la-visa-tn-empieza-aqui": "Tu Camino con la Visa TN",
};

export type InviteCourse = { slug: string; title: string };

/**
 * `courses`: course enrollments (by slug); `programs`: program enrollments (by program slug). Active, unexpired
 * ones only (the caller filters).
 */
export function chooseInviteTemplate(input: { legacy: boolean; courses: { slug: string }[]; programs?: { slug: string }[] }): InviteTemplate {
  const { legacy, courses, programs = [] } = input;
  const allGlobal =
    courses.length + programs.length > 0 &&
    courses.every((c) => BRAND_BY_SLUG[c.slug] === "celsglobal") &&
    programs.every((p) => BRAND_BY_PROGRAM[p.slug] === "celsglobal");
  return legacy && allGlobal ? "invite-celsglobal" : "invite-general";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const IMG = "https://pbpnhsgygwqxnkklhyuz.supabase.co/storage/v1/object/public/email-assets/";
const FONT = "font-family:'Nunito', Arial, Helvetica, sans-serif;";
const ORDER: Brand[] = ["celstv", "celsbsns", "celsus", "celsglobal"];

// The approved mockup (2026-11-24): a white card, 2px tinted border, 8px coloured left edge, the real logo.
const CARD: Record<Brand, { edge: string; border: string }> = {
  celstv: { edge: "#F5178C", border: "#FFD0E6" },
  celsbsns: { edge: "#5B8DEF", border: "#D6E2FB" },
  celsus: { edge: "#35C3F0", border: "#CDEFFB" },
  celsglobal: { edge: "#FFC531", border: "#FFEBB3" },
};
/** Names for "Tienes acceso a …" (programas_resumen). */
const SUMMARY: Record<Brand, string> = {
  celstv: "CelsTV English For Our Generation",
  celsbsns: "CelsBSNS English for Business",
  celsus: "CelsUS Para Ciudadanía",
  celsglobal: "CelsGLOBAL",
};
// CelsGLOBAL's pills rotate through the CelsU tints.
const PILLS = [
  ["#FFF0F7", "#C10E6D"],
  ["#FFF8E1", "#9A6B00"],
  ["#EAF8EA", "#3E8A39"],
  ["#E2F7FF", "#1A86AE"],
  ["#EAF0FD", "#3C67C8"],
];

function card(b: Brand, inner: string) {
  const c = CARD[b];
  return (
    `<tr><td style="padding:0 0 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>` +
    `<td bgcolor="#FFFFFF" style="padding:0;border-radius:20px;border:2px solid ${c.border};background:#FFFFFF;overflow:hidden;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td width="8" bgcolor="${c.edge}" style="width:8px;background:${c.edge};"></td>` +
    `<td style="padding:16px 18px;${FONT}">${inner}</td>` +
    `</tr></table></td></tr></table></td></tr>`
  );
}

const logo = (file: string, alt: string, w: number, extra = "") =>
  `<img src="${IMG}${file}" width="${w}" alt="${alt}" style="display:block;border:0;width:${w}px;height:auto;margin:0 0 8px;${extra}">`;
const tag = (text: string, color: string) => `<span style="font-weight:800;font-size:13px;color:${color};">${text}</span><br>`;
const line = (text: string) => `<span style="font-size:14px;line-height:1.45;color:#4A4766;">${text}</span>`;

function programCard(b: Brand, courses: InviteCourse[]) {
  switch (b) {
    case "celstv":
      return card(
        b,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
          `<td width="74" valign="middle"><img src="${IMG}celstv-e.png" width="58" alt="CelsTV" style="display:block;border:0;width:58px;height:auto;"></td>` +
          `<td valign="middle" style="${FONT}"><strong style="font-weight:900;font-size:17px;color:#1B1830;">CelsTV</strong> <span style="font-weight:700;font-size:13px;color:#F5178C;">English For Our Generation</span><br>` +
          line("Inglés para la vida diaria, episodio por episodio: libros, tarjetas y quizzes.") +
          `</td></tr></table>`,
      );
    case "celsbsns":
      // celsbsns-dark.png: the site logo with its white wordmark recoloured #1B1830 (celsbsns.png is white text, for dark backgrounds).
      return card(b, logo("celsbsns-dark.png", "CelsBSNS", 150) + tag("English for Business", "#5B8DEF") + line("Inglés profesional con lecturas interactivas, speaking con tu voz y tu Capstone."));
    case "celsus":
      return card(b, logo("celsus.jpg", "CelsUS", 150, "border-radius:8px;") + tag("Para Ciudadanía", "#1A9CC7") + line("El examen cívico 2025 y tu entrevista de ciudadanía, paso a paso."));
    case "celsglobal": {
      const n = courses.length;
      const pills = courses
        .map((c, i) => {
          const [bg, fg] = PILLS[i % PILLS.length];
          return `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;border-radius:999px;background:${bg};color:${fg};font-weight:800;font-size:13px;">${esc(GLOBAL_SHORT[c.slug] ?? c.title)}</span>`;
        })
        .join("\n");
      return card(
        b,
        logo("celsglobal.png", "CelsGLOBAL", 170) +
          line(`Para crecer tu carrera en EE.UU. Incluye ${n} ${n === 1 ? "curso" : "cursos"}:`) +
          `<div style="height:10px;line-height:10px;font-size:10px;">&nbsp;</div>` +
          pills,
      );
    }
  }
}

function group(courses: InviteCourse[]) {
  const by = new Map<Brand, InviteCourse[]>();
  const other: InviteCourse[] = [];
  for (const c of courses) {
    const b = BRAND_BY_SLUG[c.slug];
    if (!b) other.push(c);
    else by.set(b, [...(by.get(b) ?? []), c]);
  }
  return { by, other };
}

/** «Todo esto ya es tuyo»: one card per program the student has, CelsTV → CelsBSNS → CelsUS → CelsGLOBAL. */
export function inviteCoursesHtml(courses: InviteCourse[]): string {
  const { by, other } = group(courses);
  const rows = ORDER.filter((b) => by.has(b)).map((b) => programCard(b, by.get(b)!));
  // A course outside the four programs (a new one): its title on a plain card.
  for (const c of other)
    rows.push(
      `<tr><td style="padding:0 0 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td bgcolor="#FFFFFF" style="padding:16px 18px;border-radius:20px;border:2px solid #E6E1F0;background:#FFFFFF;${FONT}"><strong style="font-weight:900;font-size:17px;color:#1B1830;">${esc(c.title)}</strong><br>${line("Ya está en «Mis cursos».")}</td></tr></table></td></tr>`,
    );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("\n")}</table>`;
}

/** "Tienes acceso a …": "todos los programas de CelsU" with all four, else their names ("CelsUS Para Ciudadanía"). */
export function inviteProgramsSummary(courses: InviteCourse[]): string {
  const { by, other } = group(courses);
  const mine = ORDER.filter((b) => by.has(b));
  if (mine.length === ORDER.length) return "todos los programas de CelsU";
  const names = [...mine.map((b) => SUMMARY[b]), ...other.map((c) => c.title)];
  if (!names.length) return "CelsU";
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
