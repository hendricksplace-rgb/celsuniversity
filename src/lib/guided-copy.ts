// Course-level words of a guided course page (the hero). The steps themselves come from guided_course_steps;
// a course without an entry here gets a hero built from its own title and description.
import type { CourseCopy } from "@/components/guided/GuidedCourseView";

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
};

export function courseCopy(slug: string, title: string, description: string | null): CourseCopy {
  if (COPY[slug]) return COPY[slug];
  const w = title.trim().split(/\s+/);
  return { kick: "CELSGLOBAL", h1a: w.slice(0, -2).join(" "), h1b: w.slice(-2).join(" "), text: description ?? "", result: "" };
}
