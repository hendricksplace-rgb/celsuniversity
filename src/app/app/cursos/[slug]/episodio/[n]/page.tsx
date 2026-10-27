import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, canSeeTeacherGuides, getViewer } from "@/lib/access";
import { guidePath, moduleGuides } from "@/lib/teacher-guide-server";
import { themeForCourse } from "@/lib/themes";
import { episodePath, loadCoursePage } from "@/lib/course-page";
import { isGuidedCourse } from "@/lib/guided-modules";
import { stepPath } from "@/lib/guided";
import { EpisodeScreen, PartList } from "@/components/course/EpisodeScreen";
import { fill } from "@/components/course/kit";
import { CelsusEpisode, type UsExtra } from "@/components/course/CelsusEpisode";
import { completionPath } from "@/lib/episode-status";
import { loadEpisodeDecks, tracksFromDecks, type RawCard } from "@/lib/celsus-cards";
import { signStorageRefs } from "@/lib/storage";
import { fileHref } from "@/lib/file-href";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Episode, UsRole } from "@/lib/course-page";

const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
/** "Overcome your fears … · Principios de la democracia …" → the topic after the dot. */
const bookTopic = (subtitle: string | null | undefined) => {
  const parts = (subtitle ?? "").split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ").trim() : "";
};
const TRACKS = ["A", "B", "C"] as const;

/**
 * CelsUS extras for the episode screen: the week's topic (the CelsBook's subtitle, else the "⬇️ Descargar" block
 * of the flashcards lesson) and printable PDFs, the week's questions (the same decks as the Tarjetas), the quiz
 * size, how far the student is inside the current part, the next episode's topic, and the "Material extra" rows.
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
  const current = episode.parts.find((p) => !p.done) ?? null;
  const lessonIds = [cards?.id, nextCards?.id].filter((x): x is string => !!x);
  const slugs = [`celsus-celsbook-episode-${episode.n}`, ...(nextEpisode ? [`celsus-celsbook-episode-${nextEpisode.n}`] : [])];
  const [{ data: blocks }, { data: books }, { data: me }, { data: currentBlocks }, { data: currentProgress }, decks] = await Promise.all([
    lessonIds.length
      ? supabase.from("content_blocks").select("lesson_id, block_type, title, body").in("lesson_id", lessonIds).eq("block_type", "text").eq("teacher_only", false)
      : Promise.resolve({ data: [] as { lesson_id: string; block_type: string; title: string | null; body: string | null }[] }),
    // RLS: students only see published e-books.
    supabase.from("ebooks").select("slug, subtitle, est_minutes, quiz").in("slug", slugs),
    supabase.from("profiles").select("civics_track").eq("id", viewer.user.id).maybeSingle(),
    current?.started && current.role !== "cards"
      ? supabase.from("content_blocks").select("id").eq("lesson_id", current.id).eq("teacher_only", false)
      : Promise.resolve({ data: null }),
    current?.started
      ? supabase.from("progress").select("parts, flashcard_state").eq("user_id", viewer.user.id).eq("lesson_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
    cards ? loadEpisodeDecks(supabase, cards.id) : Promise.resolve({ en: [] as RawCard[], es: [] as RawCard[] }),
  ]);
  const track = TRACKS.find((x) => x === me?.civics_track) ?? null;
  const ebook = books?.find((b) => b.slug === slugs[0]);
  const nextBook = books?.find((b) => b.slug !== slugs[0]);
  const of = (lessonId: string | undefined) => (blocks ?? []).filter((b) => b.lesson_id === lessonId);
  const downloadOf = (lessonId: string | undefined) => {
    const body = of(lessonId).find((b) => /descargar/i.test(b.title ?? ""))?.body ?? "";
    const topic = body.match(/Semana\s*\d+\s*\/\s*Week\s*\d+\s*[—–-]\s*(.+)/)?.[1]?.trim() ?? "";
    return { body, topic: topic ? sentenceCase(topic) : "" };
  };
  const { body } = downloadOf(cards?.id);
  const topic = bookTopic(ebook?.subtitle) || downloadOf(cards?.id).topic;
  const pdf = (lang: string) => body.match(new RegExp(`${lang}:\\s*(storage://\\S+\\.pdf)`, "i"))?.[1] ?? null;
  const refs = [pdf("English"), pdf("Español")].filter((r): r is string => !!r);
  const signed = refs.length ? await signStorageRefs(supabase, new Set(refs), { courseId, viewer, access: true }) : new Map<string, string>();

  // The week's questions: the English deck with the matching Spanish card (the Tarjetas' track A deck).
  const deckByTrack = tracksFromDecks(decks.en, decks.es);
  // The 2025 questions (with their USCIS number) first, then any older cards.
  // Track C: only their starred (65/20) questions.
  const starred = new Set(deckByTrack.C.map((c) => c.key));
  const all = deckByTrack.A.filter((c) => track !== "C" || starred.has(c.key)).map((c) => ({ en: c.q, es: c.es?.q ?? "", no: c.no }));
  const questions = [...all.filter((q) => q.no), ...all.filter((q) => !q.no)];
  const quizCount = Array.isArray(ebook?.quiz) ? ebook.quiz.length : 0;
  const myDeck = track ? deckByTrack[track] : deckByTrack.A;

  // How far the student is inside the current part: cards answered (Tarjetas), else sections (content blocks) done.
  let resumeMeta: { done: number; total: number; text: string } | null = null;
  if (current?.role === "cards" && myDeck.length) {
    const st = ((currentProgress?.flashcard_state ?? {}) as Record<string, Record<string, unknown> | undefined>)[track ?? "A"] ?? {};
    const answered = myDeck.filter((c) => typeof st[c.key] === "boolean").length;
    resumeMeta = { done: answered, total: myDeck.length, text: fill(t.cardsProgress, { n: answered, total: myDeck.length }) };
  } else if (current?.role === "book" && ebook?.est_minutes) {
    resumeMeta = { done: 0, total: 0, text: fill(t.bookMeta, { n: ebook.est_minutes }) };
  } else if (current?.started && currentBlocks?.length) {
    const doneIds = Object.keys((currentProgress?.parts as Record<string, unknown> | null) ?? {});
    const ids = currentBlocks.map((b) => b.id);
    const done = ids.filter((id) => doneIds.includes(id)).length;
    resumeMeta = { done, total: ids.length, text: fill(t.sectionsMeta, { n: done, total: ids.length }) };
  }

  const subs: Partial<Record<UsRole, string>> = {
    ...t.subs,
    book: ebook ? (ebook.est_minutes ? `${t.subs.bookInteractive} · ${fill(t.bookMeta, { n: ebook.est_minutes })}` : t.subs.bookInteractive) : t.subs.book,
    video: topic || t.subs.video,
    cards: fill(t.cardsSub[track ?? "A"], { n: myDeck.length }),
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
  // Signed when tapped (/app/archivo): a URL signed with the page expires after 10 minutes.
  if (en && signed.get(en)) extras.push({ href: fileHref(en), label: t.printableEn, tag: t.printPdf, icon: "print-en", external: true });
  if (es && signed.get(es)) extras.push({ href: fileHref(es), label: t.printableEs, tag: t.printPdf, icon: "print-es", external: true });

  return {
    topic,
    subs,
    extras,
    questions,
    track,
    resumeMeta,
    nextTopic: bookTopic(nextBook?.subtitle) || downloadOf(nextCards?.id).topic,
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
  // Guided courses (CelsGLOBAL step template): an old module link opens that step's page for students.
  if (page && theme === "celsglobal" && (await isGuidedCourse(supabase, page.course.id))) redirect(stepPath(page.course.slug, Number(n) || 1));
  const episode = page?.episodes.find((e) => e.n === Number(n));
  if (!page || !episode) notFound();
  const courseHref = `/app/cursos/${page.course.slug}`;
  // Without access the course page explains why (ended, paused or never bought).
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(courseHref);

  if (page.layout === "citizenship") {
    const nextEpisode = page.episodes.find((e) => e.n > episode.n) ?? null;
    // Teachers and admins: the episode's Teacher's Guide (and, on the last episode, the final evaluation's) on top.
    const evaluation = !nextEpisode ? page.extras.find((x) => x.kind === "evaluation")?.id : undefined;
    const [us, guides] = await Promise.all([
      celsusDetails(supabase, viewer, page.course.id, episode, nextEpisode, t.us),
      canSeeTeacherGuides(viewer.role) ? moduleGuides(supabase, [episode.id, ...(evaluation ? [evaluation] : [])]) : null,
    ]);
    const tarjetas = `${episodePath(page.course.slug, episode.n)}/tarjetas`;
    return (
      <CelsusEpisode
        t={t.us}
        episode={episode}
        title={us.topic || fill(t.us.kicker, { n: episode.n })}
        sub={t.us.sub}
        courseHref={courseHref}
        back={{ t: t.usBack, course: { href: courseHref, name: page.course.title } }}
        next={nextEpisode ? { n: nextEpisode.n, href: nextEpisode.href, title: us.nextTopic || fill(t.us.kicker, { n: nextEpisode.n }) } : null}
        examHref="/app/examen-civico"
        completionHref={completionPath(page.course.slug, episode.n)}
        extras={us.extras}
        subs={us.subs}
        episodes={page.episodes.map((e) => ({ n: e.n, href: e.href, done: e.state === "done" }))}
        questions={us.questions.slice(0, 3)}
        questionCount={us.questions.length}
        questionsHref={tarjetas}
        track={us.track}
        trackHref={`${tarjetas}?examen=1`}
        resumeMeta={us.resumeMeta}
        xp={episode.parts.reduce((s, p) => s + p.xpEarned, 0)}
        teacherGuide={
          guides?.has(episode.id)
            ? {
                t: t.guide,
                href: guidePath(page.course.slug, episode.n),
                evalHref: evaluation && guides.has(evaluation) ? guidePath(page.course.slug, "evaluacion") : null,
              }
            : null
        }
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
