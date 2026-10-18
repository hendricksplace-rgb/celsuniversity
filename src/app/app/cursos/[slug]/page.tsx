import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";

type Props = { params: Promise<{ slug: string }> };

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const [access, { data: modules }] = await Promise.all([
    canAccessCourse(supabase, viewer, course.id),
    supabase
      .from("modules")
      .select("id, title, kind, sort_order, lessons(id, title, lesson_type, teacher_only, status, sort_order)")
      .eq("course_id", course.id)
      .order("sort_order")
      .order("sort_order", { referencedTable: "lessons" }),
  ]);

  return (
    <div data-theme={themeForCourse(course)} className="t-panel space-y-6">
      <header className="space-y-2">
        <Link href="/app" className="t-muted text-sm hover:underline">
          ← {t.course.back}
        </Link>
        <h1 className="t-heading text-3xl">{course.title}</h1>
        {course.description && <p className="t-muted max-w-3xl">{course.description}</p>}
      </header>

      {!access && <AccessNotice userId={viewer.user.id} courseId={course.id} slug={course.slug ?? slug} fallback={t.course.noAccess} />}

      <ol className="grid gap-4 md:grid-cols-2">
        {(modules ?? []).map((m) => {
          const lessons = (m.lessons ?? []).filter((l) => l.status === "published" || viewer.isStaff);
          return (
            <li key={m.id} className="t-card t-card-accent space-y-3">
              <h2 className="t-heading text-lg">{m.title}</h2>
              <p className="t-muted text-xs">
                {lessons.length} {t.course.lessons}
              </p>
              <ul className="space-y-1.5">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    {access ? (
                      <Link href={`/app/lecciones/${l.id}`} className="t-link">
                        {l.title}
                      </Link>
                    ) : (
                      <span className="t-muted">🔒 {l.title}</span>
                    )}
                    {l.teacher_only && <span className="t-badge">{t.course.teacherOnly}</span>}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
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
  const btn = "t-btn mt-3 inline-flex";
  if (mine.some((e) => e.status === "paused"))
    return (
      <div className="t-card t-card-accent">
        <p className="font-bold">Tu acceso está en pausa.</p>
        <p className="t-muted mt-1 text-sm">No pudimos cobrar tu pago mensual. Actualiza tu tarjeta con el enlace que te enviamos por correo y tu acceso vuelve en cuanto se complete el pago. Tu avance está guardado.</p>
      </div>
    );
  if (mine.some((e) => e.status === "active" && e.expires_at && new Date(e.expires_at) < new Date()) || mine.some((e) => e.status === "completed"))
    return (
      <div className="t-card t-card-accent">
        <p className="font-bold">Tu acceso terminó.</p>
        <p className="t-muted mt-1 text-sm">Tu avance está guardado: renueva y sigue donde te quedaste.</p>
        <Link href={buy} className={btn}>
          Renovar mi acceso →
        </Link>
      </div>
    );
  return (
    <div className="t-card t-card-accent">
      <p>{fallback}</p>
      <Link href={buy} className={btn}>
        Ver planes →
      </Link>
    </div>
  );
}
