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

      {!access && <p className="t-card t-card-accent">{t.course.noAccess}</p>}

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
