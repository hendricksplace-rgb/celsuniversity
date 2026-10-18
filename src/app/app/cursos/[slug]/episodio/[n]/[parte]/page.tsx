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
import { CardsPart, type Card } from "@/components/part/CardsPart";
import { QuizPart } from "@/components/part/QuizPart";
import { buildQuiz } from "@/lib/quiz";
import type { Block } from "@/components/lesson/LessonBlock";

type RawCard = { front: string; back: string; category?: string; back_audio?: string | null; image?: string | null };
const rawCards = (v: unknown): RawCard[] => (Array.isArray(v) ? (v as RawCard[]).filter((c) => c && typeof c.front === "string" && typeof c.back === "string") : []);
const CATS = new Set(["words", "verbs", "phrases"]);

/** CelsCards from the lesson's flashcard blocks; cards without a category count as words. */
function toCards(blocks: Block[], sign: (ref: string) => string | null): Card[] {
  return blocks
    .filter((b) => b.block_type === "flashcard")
    .flatMap((b) => rawCards(b.data.settings).map((c, i) => ({ c, id: `${b.id}:${i}` })))
    .map(({ c, id }) => ({
      id,
      front: c.front,
      back: c.back,
      cat: (CATS.has(c.category ?? "") ? c.category : "words") as Card["cat"],
      audio: c.back_audio ? sign(c.back_audio) : null,
      image: c.image ? sign(c.image) : null,
    }));
}

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
  } else if (key === "celscards" && blocks.some((b) => b.block_type === "flashcard")) {
    body = <CardsPart cards={toCards(blocks, (r) => content.signed.get(r) ?? null)} />;
  } else if (key === "quiz" && blocks.some((b) => b.block_type === "celstv_quiz")) {
    const quiz = blocks.find((b) => b.block_type === "celstv_quiz")!;
    const cardsPart = episode.parts.find((p) => p.key === "celscards");
    const { data: cardBlocks } = cardsPart
      ? await supabase.from("content_blocks").select("data").eq("lesson_id", cardsPart.id).eq("block_type", "flashcard")
      : { data: [] as { data: unknown }[] };
    const cards = (cardBlocks ?? []).flatMap((b) => rawCards((b.data as Record<string, unknown>)?.settings));
    body = <QuizPart questions={buildQuiz(settingsOf(quiz), cards, (r) => (typeof r === "string" ? (content.signed.get(r) ?? null) : null), part.id)} />;
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
