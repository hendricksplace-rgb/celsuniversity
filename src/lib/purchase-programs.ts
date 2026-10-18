// How each program presents itself in the purchase flow (shared by server pages and the welcome screen).
export type ProgramKey = "celstv" | "celsbsns" | "celsus" | "celsglobal";

export const PROGRAMS: Record<ProgramKey, { title: string; color: string; ink: string; bg: string; steps: string[] }> = {
  celstv: {
    title: "CelsTV",
    color: "#F5178C",
    ink: "#FFFFFF",
    bg: "linear-gradient(150deg,#2a1240 0%,#1a1030 60%,#12101f 100%)",
    steps: ["Abre tu primer episodio: empiezas en el que va con tu nivel.", "Practica con CelsCards y gana XP cada día.", "Descarga la semana para estudiar sin internet."],
  },
  celsbsns: {
    title: "CelsBSNS",
    color: "#35C3F0",
    ink: "#FFFFFF",
    bg: "linear-gradient(150deg,#13284D 0%,#0c1a33 100%)",
    steps: ["Mira la semana 1: Professional Communication.", "Haz las tareas de lectura, escritura y expresión oral.", "Cierra la semana con el quiz y tu retroalimentación."],
  },
  celsus: {
    title: "CelsUS",
    color: "#FFD24D",
    ink: "#0E2A4F",
    bg: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)",
    steps: ["Empieza con el episodio 1 y sus tarjetas.", "Practica la entrevista con el examen cívico 2025.", "Repasa las preguntas que más te cuestan."],
  },
  celsglobal: {
    title: "CelsGLOBAL",
    color: "#C7A24E",
    ink: "#14182B",
    bg: "linear-gradient(135deg,#14182B 0%,#1E2A48 55%,#2E6F86 100%)",
    steps: ["Abre tu ruta: 5 etapas, en el orden que quieras.", "Empieza por English for Business o por tu resume.", "Prepara tu entrevista y tu visa TN cuando estés listo."],
  },
};
