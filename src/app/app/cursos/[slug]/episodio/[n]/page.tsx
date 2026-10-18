import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { episodePath, loadCoursePage } from "@/lib/course-page";
import { EpisodeScreen, PartList } from "@/components/course/EpisodeScreen";
import { fill } from "@/components/course/kit";

type Props = { params: Promise<{ slug: string; n: string }>; searchParams: Promise<{ hecho?: string }> };

export default async function EpisodePage({ params, searchParams }: Props) {
  const { slug, n } = await params;
  const { hecho } = await searchParams;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${episodePath(slug, Number(n))}`);

  const theme = themeForCourse({ slug });
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const episode = page?.episodes.find((e) => e.n === Number(n));
  if (!page || !episode) notFound();
  const courseHref = `/app/cursos/${page.course.slug}`;
  // Without access the course page explains why (ended, paused or never bought).
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(courseHref);

  if (page.layout !== "episodes") {
    const word = page.layout === "citizenship" ? t.course.episode : theme === "celsbsns" ? t.course.week : t.course.section;
    return <PartList t={t.episode} episode={episode} title={episode.title || `${word} ${episode.n}`} courseHref={courseHref} kicker={`${word} ${episode.n}`} />;
  }

  // Staff only: the Teachersbook stays off the student screens.
  const { data: guide } = viewer.isStaff
    ? await supabase.from("lessons").select("id").eq("module_id", episode.id).eq("teacher_only", true).order("sort_order").limit(1).maybeSingle()
    : { data: null };
  const key = episodePath(page.course.slug, episode.n);

  return (
    <EpisodeScreen
      t={t.episode}
      episode={episode}
      courseHref={courseHref}
      program={`CelsTV · ${t.course.season}`}
      nextEpisode={page.episodes.find((e) => e.n === episode.n + 1) ?? null}
      justDone={hecho ?? null}
      download={{ userId: viewer.user.id, key, pages: [key, ...episode.parts.filter((p) => p.key !== "celsvideo").map((p) => p.href)] }}
      teacherGuide={guide ? `/app/lecciones/${guide.id}` : null}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { n } = await params;
  const { t } = await getDictionary();
  return { title: `${fill(t.episode.tag, { n })} · CelsU` };
}
