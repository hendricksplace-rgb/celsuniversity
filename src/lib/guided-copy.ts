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
};

export function courseCopy(slug: string, title: string, description: string | null): CourseCopy {
  if (COPY[slug]) return COPY[slug];
  const w = title.trim().split(/\s+/);
  return { kick: "CELSGLOBAL", h1a: w.slice(0, -2).join(" "), h1b: w.slice(-2).join(" "), text: description ?? "", result: "" };
}
