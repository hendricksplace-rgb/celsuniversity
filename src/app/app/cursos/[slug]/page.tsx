import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { listExams } from "@/lib/civics-server";
import { loadCoursePage } from "@/lib/course-page";
import { CitizenshipView, EpisodesView, WeeksView } from "@/components/course/CourseViews";

type Props = { params: Promise<{ slug: string }> };

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}`);

  const theme = themeForCourse({ slug });
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  if (!page) notFound();
  const access = await canAccessCourse(supabase, viewer, page.course.id);
  const notice = access ? null : <AccessNotice userId={viewer.user.id} courseId={page.course.id} slug={page.course.slug} fallback={t.course.noAccess} />;

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

const PROGRAM_OF_SLUG: Record<string, string> = {
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
  const buy = `/comprar/${PROGRAM_OF_SLUG[slug] ?? "celsglobal"}`;
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
