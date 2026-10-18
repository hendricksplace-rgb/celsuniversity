import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { PART_KEYS, episodePath, loadCoursePage, type PartKey } from "@/lib/course-page";
import { loadLessonContent } from "@/lib/lesson-content";
import { LessonBlock, settingsOf, youtubeEmbed } from "@/components/lesson/LessonBlock";
import { PartShell, Empty, FinishButton } from "@/components/part/PartShell";
import { VideoPart } from "@/components/part/VideoPart";
import { fill } from "@/components/course/kit";

type Props = { params: Promise<{ slug: string; n: string; parte: string }> };

export default async function PartPage({ params }: Props) {
  const { slug, n, parte } = await params;
  if (!PART_KEYS.includes(parte as PartKey)) notFound();
  const key = parte as PartKey;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${episodePath(slug, Number(n))}/${key}`);

  const page = await loadCoursePage(supabase, viewer.user.id, slug, themeForCourse({ slug }), viewer.isStaff);
  const episode = page?.episodes.find((e) => e.n === Number(n));
  const part = episode?.parts.find((p) => p.key === key);
  if (!page || page.layout !== "episodes" || !episode || !part) notFound();
  const courseHref = `/app/cursos/${page.course.slug}`;
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(courseHref);

  const content = await loadLessonContent(supabase, viewer, part.id, page.course.id, true);
  const blocks = content.visible.filter((b) => !b.teacher_only);
  const next = page.episodes.find((e) => e.n === episode.n + 1);
  const finishLabel = fill(t.part.finish, { part: part.name });

  let body: React.ReactNode;
  if (key === "celsvideo") {
    const b = blocks.find((x) => x.block_type === "video" || x.block_type === "embed");
    const raw = b ? (b.block_type === "video" ? (b.data.media_url as string | null) : ((settingsOf(b).src as string | undefined) ?? b.body)) : null;
    body = <VideoPart src={youtubeEmbed(raw ?? null)} title={`${part.name} · ${episode.title}`} finishLabel={finishLabel} />;
  } else if (!blocks.length) {
    body = (
      <>
        <Empty text={t.part.empty} light={key === "celsbook"} />
        <FinishButton label={finishLabel} />
      </>
    );
  } else {
    // Not redesigned yet: the lesson's own blocks, then finish.
    body = (
      <div data-theme="celstv" className="mt-3 space-y-4" style={{ background: "transparent" }}>
        {blocks.map((b) => (
          <LessonBlock
            key={b.id}
            block={b}
            signed={content.signed}
            t={t.lesson}
            activityT={t.activity}
            civicsT={t.civics}
            isStaff={viewer.isStaff}
            readers={content.readers}
            readLabel={t.reader.interactive}
          />
        ))}
        <FinishButton label={finishLabel} />
      </div>
    );
  }

  return (
    <PartShell
      t={t.part}
      partKey={key}
      partName={part.name}
      episodeN={episode.n}
      episodeHref={episodePath(page.course.slug, episode.n)}
      lessonId={part.id}
      userId={viewer.user.id}
      alreadyDone={part.done}
      nextEpisode={next ? { href: next.href, n: next.n } : null}
    >
      {body}
    </PartShell>
  );
}
