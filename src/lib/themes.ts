// One component set, four brands. The tokens live in globals.css under [data-theme="…"].
export const THEMES = {
  celstv: { label: "CelsTV" }, // playful, colorful (young learners)
  celsbsns: { label: "CelsBSNS" }, // professional navy
  celsus: { label: "CelsUS" }, // formal, low tones (citizenship)
  celsglobal: { label: "CelsGLOBAL" }, // muted, adult professionals
} as const;

export type ThemeKey = keyof typeof THEMES;

// Course slug → theme. Move to a `courses.theme` column once schema changes can be applied again.
const BY_SLUG: Record<string, ThemeKey> = {
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

export function themeForCourse(course: { slug?: string | null; theme?: string | null }): ThemeKey {
  if (course.theme && course.theme in THEMES) return course.theme as ThemeKey;
  return (course.slug && BY_SLUG[course.slug]) || "celstv";
}
