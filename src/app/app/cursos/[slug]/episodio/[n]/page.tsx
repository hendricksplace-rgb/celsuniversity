import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { episodePath, loadCoursePage } from "@/lib/course-page";
import { EpisodeScreen, PartList } from "@/components/course/EpisodeScreen";
import { fill } from "@/components/course/kit";
import { CelsusEpisode, type UsExtra } from "@/components/course/CelsusEpisode";
import { signStorageRefs } from "@/lib/storage";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Episode, UsRole } from "@/lib/course-page";

const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * CelsUS extras for the episode screen: the week's topic and printable PDFs (from the "⬇️ Descargar"
 * block of the flashcards lesson), the week's questions (the same English/Spanish decks as the
 * flashcards), the published interactive e-book for the CelsBook part, the quiz size, how far the
 * student is inside the current part, the next episode's topic, and the "Material extra" rows.
 */
async function celsusDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  courseId: string,
  episode: Episode,
  nextEpisode: Episode | null,
  t: Dictionary["us"],
) {
  const cards = episode.parts.find((p) => p.role === "cards");
  const nextCards = nextEpisode?.parts.find((p) => p.role === "cards");
  const quiz = episode.parts.find((p) => p.role === "quiz");
  const current = episode.parts.find((p) => !p.done) ?? null;
  const lessonIds = [cards?.id, nextCards?.id, quiz?.id].filter((x): x is string => !!x);
  const [{ data: blocks }, { data: ebook }, { data: currentBlocks }, { data: currentProgress }] = await Promise.all([
    lessonIds.length
      ? supabase.from("content_blocks").select("lesson_id, block_type, title, body, data").in("lesson_id", lessonIds).eq("teacher_only", false).order("sort_order")
      : Promise.resolve({ data: [] as { lesson_id: string; block_type: string; title: string | null; body: string | null; data: unknown }[] }),
    // RLS: students only see published e-books.
    supabase.from("ebooks").select("slug, est_minutes").eq("slug", `celsus-celsbook-episode-${episode.n}`).maybeSingle(),
    current?.started ? supabase.from("content_blocks").select("id").eq("lesson_id", current.id).eq("teacher_only", false) : Promise.resolve({ data: null }),
    current?.started
      ? supabase.from("progress").select("parts").eq("user_id", viewer.user.id).eq("lesson_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const of = (lessonId: string | undefined) => (blocks ?? []).filter((b) => b.lesson_id === lessonId);
  const topicOf = (lessonId: string | undefined) => {
    const body = of(lessonId).find((b) => b.block_type === "text" && /descargar/i.test(b.title ?? ""))?.body ?? "";
    const topic = body.match(/Semana\s*\d+\s*\/\s*Week\s*\d+\s*[—–-]\s*(.+)/)?.[1]?.trim() ?? "";
    return { body, topic: topic ? sentenceCase(topic) : "" };
  };
  const { body, topic } = topicOf(cards?.id);
  const pdf = (lang: string) => body.match(new RegExp(`${lang}:\\s*(storage://\\S+\\.pdf)`, "i"))?.[1] ?? null;
  const refs = [pdf("English"), pdf("Español")].filter((r): r is string => !!r);
  const signed = refs.length ? await signStorageRefs(supabase, new Set(refs), { courseId, viewer, access: true }) : new Map<string, string>();

  // The week's questions: the English deck's fronts, with the Spanish deck's card at the same position.
  const fronts = (b: { data: unknown } | undefined) => {
    const set = (b?.data as { settings?: unknown } | null)?.settings;
    return Array.isArray(set) ? set.map((c) => (c && typeof c === "object" && typeof (c as { front?: unknown }).front === "string" ? (c as { front: string }).front : "")) : [];
  };
  const decks = of(cards?.id).filter((b) => b.block_type === "flashcard");
  const enDeck = fronts(decks.find((b) => /english|ingl/i.test(b.title ?? "")) ?? decks[0]);
  const esDeck = fronts(decks.find((b) => /español|espanol|spanish/i.test(b.title ?? "")) ?? decks[1]);
  const questions = enDeck.map((en, i) => ({ en, es: esDeck[i] ?? "" })).filter((q) => q.en);
  const quizCount = of(quiz?.id)
    .filter((b) => b.block_type === "quiz")
    .reduce((n, b) => n + (Array.isArray((b.data as { settings?: unknown } | null)?.settings) ? ((b.data as { settings: unknown[] }).settings.length) : 0), 0);

  // How far the student is inside the current part: the lesson's sections (content blocks) marked done.
  const sectionIds = (currentBlocks ?? []).map((b) => b.id);
  const doneIds = Object.keys((currentProgress?.parts as Record<string, unknown> | null) ?? {});
  const sections = current?.started && sectionIds.length ? { done: sectionIds.filter((id) => doneIds.includes(id)).length, total: sectionIds.length } : null;

  const parts = episode.parts.map((p) => (p.role === "book" && ebook ? { ...p, href: `/app/libros/${ebook.slug}` } : p));
  const subs: Partial<Record<UsRole, string>> = {
    ...t.subs,
    book: ebook ? t.subs.bookInteractive : t.subs.book,
    video: topic || t.subs.video,
    quiz: quizCount ? `${t.subs.quiz} · ${fill(t.quizMeta, { n: quizCount })}` : t.subs.quiz,
  };

  const extras: UsExtra[] = [];
  for (const p of episode.extra) {
    if (/^printable/i.test(p.title)) continue; // replaced by the PDFs below
    if (/reading and writing/i.test(p.title)) extras.push({ href: p.href, label: t.readingWriting, tag: t.practice, icon: "writing" });
    else if (/review/i.test(p.title)) extras.push({ href: p.href, label: t.review, tag: t.practice, icon: "review" });
    else if (p.type === "video") extras.push({ href: p.href, label: p.title.replace(/\s*-\s*Subtitulada$/i, ""), tag: t.video, icon: "video" });
    else extras.push({ href: p.href, label: p.title, tag: "", icon: "writing" });
  }
  const en = pdf("English");
  const es = pdf("Español");
  if (en && signed.get(en)) extras.push({ href: signed.get(en)!, label: t.printableEn, tag: t.printPdf, icon: "print-en", external: true });
  if (es && signed.get(es)) extras.push({ href: signed.get(es)!, label: t.printableEs, tag: t.printPdf, icon: "print-es", external: true });

  return {
    topic,
    subs,
    extras,
    questions,
    sections,
    cardCount: enDeck.length,
    bookMinutes: ebook?.est_minutes ?? null,
    nextTopic: topicOf(nextCards?.id).topic,
    episode: { ...episode, parts, next: parts.find((p) => p.id === episode.next?.id) ?? episode.next },
  };
}

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

  if (page.layout === "citizenship") {
    const nextEpisode = page.episodes.find((e) => e.n > episode.n) ?? null;
    const us = await celsusDetails(supabase, viewer, page.course.id, episode, nextEpisode, t.us);
    return (
      <CelsusEpisode
        t={t.us}
        episode={us.episode}
        title={us.topic || fill(t.us.kicker, { n: episode.n })}
        sub={t.us.sub}
        courseHref={courseHref}
        next={nextEpisode ? { n: nextEpisode.n, href: nextEpisode.href, title: us.nextTopic || fill(t.us.kicker, { n: nextEpisode.n }) } : null}
        examHref="/app/examen-civico"
        extras={us.extras}
        subs={us.subs}
        episodes={page.episodes.map((e) => ({ n: e.n, href: e.href, done: e.state === "done" }))}
        episodesDone={page.doneCount}
        episodesTotal={page.episodes.length}
        questions={us.questions.slice(0, 3)}
        questionCount={us.questions.length}
        cardCount={us.cardCount}
        bookMinutes={us.bookMinutes}
        sections={us.sections}
      />
    );
  }

  if (page.layout !== "episodes") {
    const word = theme === "celsbsns" ? t.course.week : t.course.section;
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
      nextEpisode={page.episodes.find((e) => e.n > episode.n) ?? null}
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
