// Copy for the enrollment flow (/inscribirme, the evaluation's program offer, /registro?plan=…).
// Kept apart from dictionaries.ts so the flow can change without touching the big dictionary.
import type { Lang } from "./dictionaries";
import type { ProgramKey } from "@/lib/purchase-programs";

const es = {
  metaTitle: "Inscríbete · CelsU",
  kicker: "Inscripción",
  chooseTitle: "¿En qué programa te quieres inscribir?",
  chooseSub: "Elige tu programa. Antes de pagar puedes hacer una evaluación gratis para saber qué plan te conviene.",
  choose: "Elegir",
  primary: "Empieza con tu evaluación gratis (15 min)",
  primaryNote: "Gratis, sin tarjeta. Al terminar te recomendamos el plan que va con tu nivel.",
  skip: "Prefiero ver los planes directamente",
  other: "Ver otros programas",
  steps: ["Evaluación gratis", "Tu plan recomendado", "Te inscribes"],
  promise: {
    celstv: "Aprende inglés para tu día a día con una serie de TV, a tu ritmo.",
    celsbsns: "En 10 semanas, el inglés de juntas, correos y entrevistas para tu trabajo.",
    celsus: "Llega a tu entrevista de ciudadanía con las preguntas cívicas y el inglés dominados.",
    celsglobal: "En 6 meses, prepara tu carrera en Estados Unidos: inglés de negocios, resume, entrevistas y Visa TN.",
  } satisfies Record<ProgramKey, string>,
  // Evaluation result, program offer
  offerFor: "Para {program}",
  offerWhy: {
    celstv: "Con tu nivel {band}, CelsTV te da inglés real del día a día. Premium suma los e-books y más práctica.",
    celsbsnsReady: "Con tu nivel {band} ya estás listo para el inglés profesional de CelsBSNS.",
    celsbsnsBundle: "CelsBSNS pide nivel B2. Con tu nivel {band}, este paquete te lleva con CelsTV hasta B2 y luego a CelsBSNS.",
    celsus: "Con tu nivel {band}, el Paquete Completo te prepara para la entrevista: cívica, inglés y simulacros.",
    celsglobal: "Con tu nivel {band} arrancas tu ruta de 6 meses hacia tu carrera en Estados Unidos.",
  },
  oneTime: "USD · pago único",
  monthly: "o {count} pagos de {first}",
  seeAllPlans: "Ver todos los planes de {program}",
  // /registro?plan=…
  reserveTitle: "Reserva tu lugar",
  reserveSub: "Los pagos en línea abren pronto. Crea tu cuenta gratis y reservamos tu lugar en:",
  reserveCta: "Reservar mi lugar",
  reservedTitle: "¡Tu lugar está reservado!",
  reservedSub: "Guardamos tu elección: {plan}. Nuestro equipo activará tu acceso y te avisará por correo.",
  reservedCheck: "Revisa tu correo para confirmar tu cuenta.",
  reservedSignedIn: "Ya tienes cuenta. Reserva este plan para tu cuenta y el equipo activará tu acceso.",
  goApp: "Ir a mi cuenta",
};

export type EnrollT = typeof es;

const en: EnrollT = {
  metaTitle: "Enroll · CelsU",
  kicker: "Enrollment",
  chooseTitle: "Which program do you want to join?",
  chooseSub: "Pick your program. Before paying you can take a free assessment to find the plan that fits you.",
  choose: "Choose",
  primary: "Start with your free assessment (15 min)",
  primaryNote: "Free, no card. When you finish we recommend the plan that fits your level.",
  skip: "I'd rather see the plans directly",
  other: "See other programs",
  steps: ["Free assessment", "Your recommended plan", "You enroll"],
  promise: {
    celstv: "Learn everyday English with a TV series, at your own pace.",
    celsbsns: "In 10 weeks, the English of meetings, emails and interviews for your job.",
    celsus: "Walk into your citizenship interview with the civics questions and the English mastered.",
    celsglobal: "In 6 months, build your career in the U.S.: business English, resume, interviews and the TN Visa.",
  },
  offerFor: "For {program}",
  offerWhy: {
    celstv: "At level {band}, CelsTV gives you real everyday English. Premium adds the e-books and more practice.",
    celsbsnsReady: "At level {band} you're ready for CelsBSNS professional English.",
    celsbsnsBundle: "CelsBSNS needs B2. At level {band}, this bundle takes you to B2 with CelsTV, then on to CelsBSNS.",
    celsus: "At level {band}, the Complete Package prepares you for the interview: civics, English and mock interviews.",
    celsglobal: "At level {band} you start your 6-month path to a career in the U.S.",
  },
  oneTime: "USD · one-time payment",
  monthly: "or {count} payments of {first}",
  seeAllPlans: "See all {program} plans",
  reserveTitle: "Reserve your spot",
  reserveSub: "Online payments open soon. Create your free account and we'll reserve your spot in:",
  reserveCta: "Reserve my spot",
  reservedTitle: "Your spot is reserved!",
  reservedSub: "We saved your choice: {plan}. Our team will activate your access and let you know by email.",
  reservedCheck: "Check your email to confirm your account.",
  reservedSignedIn: "You already have an account. Reserve this plan for it and the team will activate your access.",
  goApp: "Go to my account",
};

export const enrollCopy = (lang: Lang): EnrollT => (lang === "en" ? en : es);
