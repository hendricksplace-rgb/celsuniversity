import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { signStorageRefs } from "@/lib/storage";
import { SimulatorView } from "@/components/guided/SimulatorView";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export const metadata = { title: "Simulacro de entrevista · CelsU" };

/** The mock interview of a guided course (its `simulator` build section). Voice is never stored. */
export default async function SimulacroPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q } = await searchParams;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/simulacro`);
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  if (!(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${slug}`);
  const g = await loadGuided(supabase, slug, viewer.user.id);
  const sec = g?.steps.flatMap((x) => x.step.build.sections).find((x) => x.type === "simulator");
  if (!g || !sec || sec.type !== "simulator") notFound();
  // The recorded questions: short-lived signed URLs from the private course-media bucket.
  const files = sec.questions.flatMap((x) => (x.audio ? [x.audio] : []));
  const base = sec.audio_base ?? "";
  const signed = base && files.length ? await signStorageRefs(supabase, files.map((f) => base + f), { courseId: course.id, viewer, access: true }) : new Map<string, string>();
  const audio = Object.fromEntries(files.flatMap((f) => (signed.get(base + f) ? [[f, signed.get(base + f)!]] : [])));
  return (
    <SimulatorView
      userId={viewer.user.id}
      slug={g.course.slug}
      courseTitle={g.course.title}
      steps={g.steps.map((x) => x.step)}
      bank={g.resume}
      audio={audio}
      initialQ={q ? q.slice(0, 200) : null}
      defaultLang={lang === "en" ? "en" : "es"}
    />
  );
}
