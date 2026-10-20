// Course-level words of a guided course page (the hero). The steps themselves come from guided_course_steps;
// a course without an entry here gets a hero built from its own title and description.
import type { CourseCopy } from "@/components/guided/GuidedCourseView";
import { ROUTE_CARDS } from "@/lib/my-courses";

/** The guided courses' place in the CelsGLOBAL route as Mis cursos shows it (the month cards): Visa TN is ETAPA 1. */
export function guidedStage(slug: string, lang: "es" | "en") {
  const i = (ROUTE_CARDS as readonly string[]).indexOf(slug);
  return i < 0 ? null : `${lang === "en" ? "STAGE" : "ETAPA"} ${i + 1}`;
}

const COPY: Record<string, CourseCopy> = {
  "from-cv-to-u-s-resume-a-step-by-step-guide": {
    kick: "TU RESUME",
    h1a: "Del CV a un resume que",
    h1b: "abre puertas",
    text: "En 7 pasos conviertes tu CV en un resume al estilo de EE.UU. Cada paso te enseña una parte y la construyes aquí mismo. Al final te llevas tu resume en inglés, listo para enviar.",
    result: "Resultado: tu resume en inglés",
  },
  "crack-the-u-s-interview-code": {
    kick: "TU ENTREVISTA",
    h1a: "Crack",
    h1b: "the United States",
    h1c: "Interview Code",
    text: "No necesitas hablar inglés perfecto. Necesitas comunicar tu valor con claridad y seguridad. En 7 pasos preparas tus historias, tus respuestas y tu presencia, y terminas con un simulacro de entrevista.",
    result: "Resultado: tu banco de respuestas",
    routeH: "7 pasos hacia tu entrevista",
    routeI: "Cada paso suma algo a tu banco de respuestas. Ábrelos en el orden que quieras.",
  },
  "finanzas-personales-en-estados-unidos": {
    kick: "TU DINERO",
    h1a: "Finanzas personales",
    h1b: "en Estados Unidos",
    text: "Aquí no se trata solo de cuánto ganas, sino de cómo lo administras. En 9 pasos armas tu presupuesto real, tu plan de crédito, tu fondo de emergencia y tu plan para los primeros 90 días.",
    result: "Resultado: tu plan financiero",
    routeH: "9 pasos hacia tu plan financiero",
    routeI: "Cada paso agrega una parte a tu plan. Ábrelos en el orden que quieras.",
  },
  "tu-camino-con-la-visa-tn-empieza-aqui": {
    kick: "TU VISA",
    h1a: "Tu camino con la Visa TN:",
    h1b: "Empieza aquí",
    text: "Una guía práctica, paso a paso: desde tu perfil en AllcanzaTN hasta tu entrevista en el consulado. En 8 pasos armas tu plan TN para avanzar con seguridad.",
    result: "Resultado: tu plan TN",
    routeH: "8 pasos hacia tu Visa TN",
    routeI: "Cada paso agrega una parte a tu plan TN. Te recomendamos seguir el orden, pero puedes abrir cualquiera.",
  },
};

export function courseCopy(slug: string, title: string, description: string | null): CourseCopy {
  if (COPY[slug]) return COPY[slug];
  const w = title.trim().split(/\s+/);
  return { kick: "CELSGLOBAL", h1a: w.slice(0, -2).join(" "), h1b: w.slice(-2).join(" "), text: description ?? "", result: "" };
}
