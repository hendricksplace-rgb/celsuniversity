import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { appPlansHref } from "@/lib/enroll";
import type { ProgramKey } from "@/lib/purchase-programs";
import { listExams } from "@/lib/civics-server";
import { loadCoursePage } from "@/lib/course-page";
import { activeWeekOf, weekPath } from "@/lib/bsns";
import { CitizenshipView, EpisodesView, WeeksView } from "@/components/course/CourseViews";
import { loadGuided } from "@/lib/guided-server";
import { courseCopy } from "@/lib/guided-copy";
import { ROUTE_CARDS } from "@/lib/my-courses";
import { guidedStage } from "@/lib/guided-copy";
import { GuidedCourseView } from "@/components/guided/GuidedCourseView";
import { courseLabel, leaderCard } from "@/lib/leaderboard";
import { LeaderCard } from "@/components/leaderboard/LeaderCard";

type Props = { params: Promise<{ slug: string }> };

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}`);

  const theme = themeForCourse({ slug });
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  if (!page) notFound();
  const access = await canAccessCourse(supabase, viewer, page.course.id);
  // CelsBSNS: the old week-list page is gone; old links and bookmarks land on the student's current week.
  // The week of the latest activity (the next one once it's complete), like Progreso, Inicio and Mis cursos.
  // Without access the week list below shows with the access notice (the week pages send them back here).
  if (theme === "celsbsns" && access)
    redirect(
      weekPath(
        page.course.slug,
        activeWeekOf(
          page.episodes.map((e) => ({
            n: e.n,
            done: e.parts.map((p) => p.done),
            last: e.parts.reduce<string | null>((a, p) => (p.lastActivity && (!a || p.lastActivity > a) ? p.lastActivity : a), null),
          })),
        ),
      ),
    );
  // Guided courses (CelsGLOBAL step template): one page per step and Mi resume. Without access the steps aren't
  // readable (RLS), so the old page with its access notice shows instead.
  const guided = theme === "celsglobal" && access ? await loadGuided(supabase, slug, viewer.user.id) : null;
  if (guided) {
    const [{ data: books }, { data: tools }] = await Promise.all([
      supabase.from("ebooks").select("slug, title").eq("course_id", guided.course.id).eq("status", "published").order("created_at"),
      supabase.rpc("can_use_ai_tools"),
    ]);
    const stage = guidedStage(slug, lang === "en" ? "en" : "es");
    const copy = courseCopy(slug, guided.course.title, guided.course.description);
    return (
      <GuidedCourseView
        slug={guided.course.slug}
        title={guided.course.title}
        stage={stage ? `CELSGLOBAL · ${stage}` : "CELSGLOBAL"}
        copy={{ ...copy, kick: stage ? `${stage} · ${copy.kick}` : copy.kick }}
        steps={guided.steps.map((x) => x.step)}
        done={Object.fromEntries(guided.steps.map((x) => [x.step.step, !!x.completedAt]))}
        resume={guided.resume}
        books={books ?? []}
        tools={!!tools}
        defaultLang={lang === "en" ? "en" : "es"}
        theme={guided.theme}
        stages={Object.fromEntries(ROUTE_CARDS.map((x) => [x, guidedStage(x, lang === "en" ? "en" : "es") ?? ""]))}
      />
    );
  }
  const tool = AI_TOOL_OF_SLUG[slug];
  const card = access ? await leaderCard(supabase, { id: page.course.id, slug: page.course.slug, label: courseLabel(theme, page.course.title) }) : null;
  const notice = (
    <>
      {!access && <AccessNotice userId={viewer.user.id} courseId={page.course.id} slug={page.course.slug} fallback={t.course.noAccess} />}
      {card && <LeaderCard t={t.lb} d={card} />}
      {tool && <AiToolCard href={tool.href} icon={tool.icon} kicker={t.route.aiKicker} title={t.route[tool.title]} text={t.route[tool.text]} />}
    </>
  );

  if (page.layout === "episodes") return <EpisodesView page={page} t={t.course} notice={notice} />;
  if (page.layout === "citizenship") return <CitizenshipView page={page} t={t.course} best={await bestCivicsScore(supabase, viewer)} notice={notice} />;
  return <WeeksView page={page} t={t.course} theme={theme} notice={notice} />;
}

/** Best practice-exam score ("14/20"), from the 20-question exam when there is one. */
async function bestCivicsScore(supabase: Awaited<ReturnType<typeof createClient>>, viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>) {
  const exams = await listExams(supabase, viewer);
  if (!exams.length) return null;
  const { data } = await supabase
    .from("evaluation_attempts")
    .select("score, total")
    .eq("user_id", viewer.user.id)
    .in(
      "evaluation_id",
      exams.map((e) => e.id),
    );
  const rows = data ?? [];
  const pool = rows.some((r) => r.total === 20) ? rows.filter((r) => r.total === 20) : rows;
  const top = pool.sort((a, b) => b.score / (b.total || 1) - a.score / (a.total || 1))[0];
  return top ? `${top.score}/${top.total}` : null;
}

// CelsGLOBAL stages 2 and 3 open their AI tool from the course page.
const AI_TOOL_OF_SLUG: Record<string, { href: string; icon: string; title: "resumeTitle" | "interviewTitle"; text: "resumeText" | "interviewText" }> = {
  "from-cv-to-u-s-resume-a-step-by-step-guide": { href: "/app/herramientas/resume", icon: "/ai/icon-resume-review.svg", title: "resumeTitle", text: "resumeText" },
  "crack-the-u-s-interview-code": { href: "/app/herramientas/entrevista", icon: "/ai/icon-interview-practice.svg", title: "interviewTitle", text: "interviewText" },
};

function AiToolCard({ href, icon, kicker, title, text }: { href: string; icon: string; kicker: string; title: string; text: string }) {
  return (
    <Link href={href} className="kit-focus flex items-center gap-4 rounded-2xl bg-[#14182B] p-4 text-white transition hover:bg-[#1F2540]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" width={52} height={52} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#EBD08C]">{kicker}</span>
        <span className="block font-serif text-lg font-semibold">{title}</span>
        <span className="block text-sm text-white/80">{text}</span>
      </span>
      <span aria-hidden className="text-xl text-[#EBD08C]">
        ›
      </span>
    </Link>
  );
}

const PROGRAM_OF_SLUG: Record<string, ProgramKey> = {
  "celstv-english-for-our-generation": "celstv",
  "english-for-business": "celsbsns",
  "celsus-para-ciudadania": "celsus",
};

/** Why there's no access: ended ("Tu acceso terminó"), paused (unpaid plan) or never bought. Progress stays. */
async function AccessNotice({ userId, courseId, slug, fallback }: { userId: string; courseId: string; slug: string; fallback: string }) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("enrollments")
    .select("status, expires_at, course_id, program:programs(program_courses(course_id))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const mine = (rows ?? []).filter(
    (e) => e.course_id === courseId || (Array.isArray(e.program) ? e.program[0] : e.program)?.program_courses?.some((pc: { course_id: string }) => pc.course_id === courseId),
  );
  // In-app plans: no evaluation, and no checkout while purchases are closed (src/lib/enroll.ts).
  const buy = appPlansHref(PROGRAM_OF_SLUG[slug] ?? "celsglobal");
  const btn = "kit-focus mt-3 inline-flex rounded-full bg-[#1B1830] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#2A2648]";
  if (mine.some((e) => e.status === "paused"))
    return (
      <div className="rounded-2xl bg-white p-5 text-[#1B1830] shadow-[0_0_0_1px_#ECE9F2]">
        <p className="font-bold">Tu acceso está en pausa.</p>
        <p className="mt-1 text-sm text-[#5E5A73]">
          No pudimos cobrar tu pago mensual. Actualiza tu tarjeta con el enlace que te enviamos por correo y tu acceso vuelve en cuanto se complete el pago. Tu avance está
          guardado.
        </p>
      </div>
    );
  if (mine.some((e) => e.status === "active" && e.expires_at && new Date(e.expires_at) < new Date()) || mine.some((e) => e.status === "completed"))
    return (
      <div className="rounded-2xl bg-white p-5 text-[#1B1830] shadow-[0_0_0_1px_#ECE9F2]">
        <p className="font-bold">Tu acceso terminó.</p>
        <p className="mt-1 text-sm text-[#5E5A73]">Tu avance está guardado: renueva y sigue donde te quedaste.</p>
        <Link href={buy} className={btn}>
          Renovar mi acceso →
        </Link>
      </div>
    );
  return (
    <div className="rounded-2xl bg-white p-5 text-[#1B1830] shadow-[0_0_0_1px_#ECE9F2]">
      <p>{fallback}</p>
      <Link href={buy} className={btn}>
        Ver planes →
      </Link>
    </div>
  );
}
