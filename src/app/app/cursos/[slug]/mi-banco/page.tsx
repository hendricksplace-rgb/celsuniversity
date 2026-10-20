import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { MiBancoView } from "@/components/guided/MiBancoView";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Mi banco de respuestas · CelsU" };

/** Mi banco de respuestas (celsu-global-interview-brief.md): the Interview course's product, owner only (answer_banks). */
export default async function MiBancoPage({ params }: Props) {
  const { slug } = await params;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/mi-banco`);
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  if (!(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${slug}`);
  const g = await loadGuided(supabase, slug, viewer.user.id);
  if (!g || g.theme !== "interview") notFound();
  return (
    <MiBancoView
      slug={g.course.slug}
      courseTitle={g.course.title}
      steps={g.steps.map((x) => x.step)}
      bank={g.resume}
      progress={g.steps.length ? g.done / g.steps.length : 0}
      name={viewer.displayName ?? ""}
      defaultLang={lang === "en" ? "en" : "es"}
    />
  );
}
