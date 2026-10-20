import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { resumePath } from "@/lib/guided";
import { MiResumeView } from "@/components/guided/MiResumeView";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; version?: string }> };

export const metadata = { title: "Mi resume · CelsU" };

/** Mi resume (celsu-global-cv-resume-brief.md §3): the student's resume, owner only (RLS on resumes). */
export default async function MiResumePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${resumePath(slug)}`);
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  if (!(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${slug}`);
  const g = await loadGuided(supabase, slug, viewer.user.id);
  if (!g) notFound();
  return (
    <MiResumeView
      slug={g.course.slug}
      courseTitle={g.course.title}
      steps={g.steps.map((x) => x.step)}
      resume={g.resume}
      progress={g.steps.length ? g.done / g.steps.length : 0}
      initialLang={sp.lang === "en" ? "en" : "es"}
      initialVersion={sp.version ?? null}
      defaultLang={lang === "en" ? "en" : "es"}
    />
  );
}
