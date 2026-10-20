// The CelsGLOBAL route (/app/programas/celsglobal): 5 stages, one course each, in a suggested order.
// Stages are never locked: any can be opened, and several can be in progress at once.
import type { Client } from "@/lib/supabase/types";
import { BSNS_SLUG, bsnsHomeHref } from "@/lib/bsns";
import { accessibleCourses, courseStats, myAssignments, nextLesson, type Assignment, type CourseStats } from "@/lib/learning";

export const ROUTE_PROGRAM = "international-professional-development";

export const STAGES = [
  { slug: "english-for-business", color: "#2E6F86" },
  { slug: "from-cv-to-u-s-resume-a-step-by-step-guide", color: "#7A6DB0" },
  { slug: "crack-the-u-s-interview-code", color: "#8D6A0B" },
  { slug: "finanzas-personales-en-estados-unidos", color: "#3A3F63" },
  { slug: "tu-camino-con-la-visa-tn-empieza-aqui", color: "#C23845" },
] as const;

/** "ETAPA 2" for a route course (its place in STAGES), else null. */
export function stageLabel(slug: string, lang: "es" | "en") {
  const i = STAGES.findIndex((x) => x.slug === slug);
  return i < 0 ? null : `${lang === "en" ? "STAGE" : "ETAPA"} ${i + 1}`;
}

export type StageState = "progress" | "done" | "assigned" | "available" | "preview";

export type Stage = {
  n: number;
  color: string;
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  modules: number;
  /** 1-based module the student is on, and how many are finished. */
  currentModule: number;
  modulesDone: number;
  pct: number;
  state: StageState;
  assignment: Assignment | null;
  /** Where the button goes. */
  href: string;
};

export async function loadRoute(supabase: Client, userId: string) {
  const [{ data: courses }, { data: program }, { data: profile }, access, assignments] = await Promise.all([
    supabase.from("courses").select("id, slug, title, description, cover_art_url, modules(count)").in("slug", STAGES.map((s) => s.slug)),
    supabase.from("programs").select("description").eq("slug", ROUTE_PROGRAM).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    accessibleCourses(supabase, userId),
    myAssignments(supabase, userId),
  ]);
  const ids = (courses ?? []).map((c) => c.id);
  const enrolled = access.programs.has(ROUTE_PROGRAM) || ids.some((id) => access.ids.includes(id));
  const stats = enrolled ? await courseStats(supabase, userId, ids) : new Map<string, CourseStats>();

  const stages: Stage[] = STAGES.flatMap((def, i) => {
    const c = (courses ?? []).find((x) => x.slug === def.slug);
    if (!c) return [];
    const s = stats.get(c.id);
    const assignment = assignments.find((a) => a.courseId === c.id) ?? null;
    const moduleCount = s?.modules.length ?? (c.modules as unknown as { count: number }[])[0]?.count ?? 0;
    let state: StageState = "preview";
    if (enrolled && s) state = s.completed ? "done" : s.started ? "progress" : assignment ? "assigned" : "available";
    const next = s ? nextLesson(s) : null;
    // An assignment on one module opens that module's first lesson.
    const inModule = assignment?.moduleId && s ? s.order.filter((o) => o.moduleId === assignment.moduleId) : [];
    const assignedLesson = inModule.find((o) => !o.done) ?? inModule[0] ?? null;
    // CelsBSNS has no course page: its current week is home.
    const href =
      c.slug === BSNS_SLUG && s
        ? bsnsHomeHref(s)
        : state === "progress" && next
          ? `/app/lecciones/${next.id}`
          : state === "assigned" && (assignedLesson || next)
            ? `/app/lecciones/${(assignedLesson ?? next)!.id}`
            : `/app/cursos/${c.slug}`;
    return [
      {
        n: i + 1,
        color: def.color,
        courseId: c.id,
        slug: c.slug!,
        title: c.title,
        description: c.description,
        cover: c.cover_art_url,
        modules: moduleCount,
        currentModule: s?.currentModule ?? 1,
        modulesDone: s?.modulesDone ?? 0,
        pct: s && s.lessons ? Math.round((s.done / s.lessons) * 100) : 0,
        state,
        assignment: state === "done" ? null : assignment,
        href,
      },
    ];
  });

  const all = [...stats.values()];
  const working = stages.filter((s) => s.state === "progress");
  return {
    enrolled,
    name: (profile?.display_name ?? "").trim().split(/\s+/)[0] || null,
    description: program?.description ?? null,
    stages,
    inProgress: working.length,
    modulesDone: all.reduce((n, c) => n + c.modulesDone, 0),
    modulesTotal: stages.reduce((n, s) => n + s.modules, 0),
    xp: all.reduce((n, c) => n + c.xp, 0),
    /** The stage touched last: "this week" line in the hero. */
    focus: all.filter((c) => c.last).sort((a, b) => (a.last!.at < b.last!.at ? 1 : -1))[0] ?? null,
  };
}

export type RouteData = Awaited<ReturnType<typeof loadRoute>>;
