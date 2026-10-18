// UI strings. Spanish is the default; English is the toggle.
// Keep both objects in the same shape: TypeScript enforces it via `Dictionary`.

const es = {
  meta: {
    title: "CelsU — Aprende inglés y prepárate para tu ciudadanía",
    description:
      "Cursos de inglés, preparación cívica y práctica de entrevista en una sola plataforma. De Latin American Media.",
  },
  nav: {
    home: "Inicio",
    courses: "Cursos",
    myLearning: "Mi aprendizaje",
    signIn: "Entrar",
    signUp: "Crear cuenta",
    signOut: "Salir",
    language: "English",
    languageLabel: "Cambiar idioma a inglés",
  },
  home: {
    eyebrow: "Latin American Media presenta",
    headline: "Aprende inglés a tu ritmo, desde cualquier dispositivo",
    sub: "Lecciones cortas, episodios divertidos, preparación para la ciudadanía y evaluaciones con IA. Todo en un solo lugar.",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Ver cursos",
    features: [
      { title: "Episodios tipo TV", body: "Aprende con historias, no con listas de palabras." },
      { title: "Ciudadanía", body: "Las 128 preguntas cívicas y práctica de entrevista, en español e inglés." },
      { title: "Sin conexión", body: "Descarga tus módulos y estudia sin internet durante 7 días." },
    ],
  },
  courses: {
    title: "Cursos",
    sub: "Elige por dónde empezar.",
    empty: "Todavía no hay cursos publicados.",
    modules: "módulos",
  },
  auth: {
    signInTitle: "Entra a tu cuenta",
    signUpTitle: "Crea tu cuenta",
    email: "Correo electrónico",
    password: "Contraseña",
    name: "Nombre",
    submitSignIn: "Entrar",
    submitSignUp: "Crear cuenta",
    google: "Continuar con Google",
    or: "o",
    noAccount: "¿No tienes cuenta?",
    haveAccount: "¿Ya tienes cuenta?",
    checkEmail: "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.",
    errors: {
      invalid: "Correo o contraseña incorrectos.",
      generic: "Algo salió mal. Inténtalo de nuevo.",
      weakPassword: "La contraseña debe tener al menos 8 caracteres.",
    },
  },
  app: {
    welcome: "Hola",
    enrolled: "Tus cursos",
    noEnrollments: "Aún no estás inscrito en ningún curso.",
    browse: "Explorar cursos",
    level: "Nivel",
    xp: "XP",
    streak: "Racha",
    days: "días",
  },
  course: {
    modules: "Módulos",
    lessons: "lecciones",
    noAccess: "Este curso es parte de un programa de pago. Inscríbete para ver las lecciones.",
    teacherOnly: "Solo docentes",
    back: "Mis cursos",
  },
  lesson: {
    prev: "Anterior",
    next: "Siguiente",
    backToCourse: "Volver al curso",
    noAccess: "No tienes acceso a esta lección. Revisa tu inscripción.",
    empty: "Esta lección todavía no tiene contenido.",
    openPdf: "Abrir PDF",
    download: "Descargar",
    ebook: "Libro digital",
    file: "Archivo",
    unavailable: "Este archivo no está disponible.",
    videoSoon: "El video de esta lección estará disponible pronto.",
    audioSoon: "El audio de esta lección estará disponible pronto.",
    activitySoon: "Práctica interactiva: disponible pronto.",
    externalBlocked: "Este contenido externo ya no está disponible.",
    teacherGuide: "Guía docente",
    staffOnly: "Visible solo para docentes",
    linkExpires: "Los enlaces de archivos caducan en 10 minutos. Recarga la página para renovarlos.",
  },
  footer: {
    rights: "Latin American Media. Todos los derechos reservados.",
  },
};

export type Dictionary = typeof es;

const en: Dictionary = {
  meta: {
    title: "CelsU — Learn English and prepare for citizenship",
    description:
      "English courses, civics prep and interview practice on one platform. From Latin American Media.",
  },
  nav: {
    home: "Home",
    courses: "Courses",
    myLearning: "My learning",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    language: "Español",
    languageLabel: "Switch language to Spanish",
  },
  home: {
    eyebrow: "Latin American Media presents",
    headline: "Learn English at your pace, on any device",
    sub: "Short lessons, fun episodes, citizenship prep and AI-graded evaluations. All in one place.",
    ctaPrimary: "Start free",
    ctaSecondary: "See courses",
    features: [
      { title: "TV-style episodes", body: "Learn through stories, not word lists." },
      { title: "Citizenship", body: "All 128 civics questions and interview practice, in Spanish and English." },
      { title: "Offline", body: "Download your modules and study without internet for 7 days." },
    ],
  },
  courses: {
    title: "Courses",
    sub: "Pick where to start.",
    empty: "No courses are published yet.",
    modules: "modules",
  },
  auth: {
    signInTitle: "Sign in to your account",
    signUpTitle: "Create your account",
    email: "Email",
    password: "Password",
    name: "Name",
    submitSignIn: "Sign in",
    submitSignUp: "Create account",
    google: "Continue with Google",
    or: "or",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    checkEmail: "We sent you an email to confirm your account. Check your inbox.",
    errors: {
      invalid: "Wrong email or password.",
      generic: "Something went wrong. Please try again.",
      weakPassword: "Password must be at least 8 characters.",
    },
  },
  app: {
    welcome: "Hi",
    enrolled: "Your courses",
    noEnrollments: "You're not enrolled in any course yet.",
    browse: "Browse courses",
    level: "Level",
    xp: "XP",
    streak: "Streak",
    days: "days",
  },
  course: {
    modules: "Modules",
    lessons: "lessons",
    noAccess: "This course is part of a paid program. Enroll to see the lessons.",
    teacherOnly: "Teachers only",
    back: "My courses",
  },
  lesson: {
    prev: "Previous",
    next: "Next",
    backToCourse: "Back to course",
    noAccess: "You don't have access to this lesson. Check your enrollment.",
    empty: "This lesson has no content yet.",
    openPdf: "Open PDF",
    download: "Download",
    ebook: "E-book",
    file: "File",
    unavailable: "This file isn't available.",
    videoSoon: "This lesson's video will be available soon.",
    audioSoon: "This lesson's audio will be available soon.",
    activitySoon: "Interactive practice: coming soon.",
    externalBlocked: "This external content is no longer available.",
    teacherGuide: "Teacher guide",
    staffOnly: "Visible to teachers only",
    linkExpires: "File links expire after 10 minutes. Reload the page to renew them.",
  },
  footer: {
    rights: "Latin American Media. All rights reserved.",
  },
};

export const dictionaries = { es, en } as const;
export type Lang = keyof typeof dictionaries;
export const DEFAULT_LANG: Lang = "es";
export const LANG_COOKIE = "celsu_lang";

export function isLang(value: unknown): value is Lang {
  return value === "es" || value === "en";
}
