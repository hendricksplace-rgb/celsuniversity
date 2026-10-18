import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { PART_KEYS, episodePath, loadCoursePage, type PartKey } from "@/lib/course-page";
import { loadLessonContent } from "@/lib/lesson-content";
import { LessonBlock, directMedia, settingsOf, urlsFor, youtubeEmbed } from "@/components/lesson/LessonBlock";
import { PartShell, Empty, FinishButton } from "@/components/part/PartShell";
import { VideoPart } from "@/components/part/VideoPart";
import { fill } from "@/components/course/kit";
import { CardsPart, type Card } from "@/components/part/CardsPart";
import { QuizPart } from "@/components/part/QuizPart";
import { buildQuiz } from "@/lib/quiz";
import { BookPart } from "@/components/part/BookPart";
import { CelsBookPart, type CelsBook, type BookSection } from "@/components/part/CelsBookPart";

/** CelsCast (block `celscast`, version 1): lines with speaker and per-word start times (`wt`). */
function celscastTrack(data: Record<string, unknown>, sign: (ref: string) => string | null): Track {
  const speakers = (data.speakers ?? {}) as Record<string, string>;
  const lines = (Array.isArray(data.lines) ? data.lines : []) as { speaker?: string; text?: string; start?: number; wt?: number[] }[];
  const cues: Cue[] = lines
    .filter((l) => typeof l.text === "string" && typeof l.start === "number")
    .map((l) => {
      const parts = l.text!.split(/\s+/).filter(Boolean);
      const wt = Array.isArray(l.wt) ? l.wt.filter((x) => typeof x === "number") : [];
      return {
        start: l.start!,
        text: l.text!,
        speaker: l.speaker ? (speakers[l.speaker] ?? l.speaker) : undefined,
        words: wt.length === parts.length ? parts.map((text, i) => ({ start: wt[i], text })) : undefined,
      };
    });
  const chapters = (Array.isArray(data.chapters) ? data.chapters : []) as Chapter[];
  return {
    key: "celscast",
    label: "CelsCast",
    src: typeof data.audio === "string" ? sign(data.audio) : null,
    cues,
    chapters: chapters.filter((c) => typeof c?.start === "number" && typeof c?.title === "string"),
    voice: Object.values(speakers).join(" y "),
  };
}

type Timed = { start?: unknown; text?: unknown };
/** audio_transcripts.words → player lines, each with its own words (by start time). */
function transcriptCues(w: unknown): Cue[] {
  const ok = (x: Timed): x is { start: number; text: string } => typeof x?.start === "number" && typeof x?.text === "string" && !!x.text.trim();
  const data = (w ?? {}) as { segments?: Timed[]; words?: Timed[] };
  const segs = (Array.isArray(data.segments) ? data.segments : []).filter(ok);
  const words = (Array.isArray(data.words) ? data.words : []).filter(ok);
  return segs.map((s, i) => {
    const end = segs[i + 1]?.start ?? Infinity;
    const mine = words.filter((x) => x.start >= s.start && x.start < end).map((x) => ({ start: x.start, text: x.text.trim() }));
    return { start: s.start, text: s.text.trim(), words: mine.length ? mine : undefined };
  });
}

/** Interactive CelsBook (block `celsbook`, version 1) with signed audio. "Episode 6: Let's eat" → kicker + "Let's eat". */
function toCelsBook(data: Record<string, unknown>, episode: { title: string; artwork: string | null }, sign: (ref: string) => string | null, kicker: string): CelsBook {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const audio = (v: unknown) => (typeof v === "string" && v ? sign(v) : null);
  const cover = (data.cover ?? {}) as Record<string, unknown>;
  const sections = (Array.isArray(data.sections) ? (data.sections as Record<string, unknown>[]) : [])
    .filter((sec) => ["words", "verbs", "phrases"].includes(str(sec.key)))
    .map(
      (sec): BookSection => ({
        key: str(sec.key) as BookSection["key"],
        title: str(sec.title),
        titleEs: str(sec.title_es),
        items: (Array.isArray(sec.items) ? (sec.items as Record<string, unknown>[]) : [])
          .filter((it) => str(it.en))
          .map((it) => ({
            en: str(it.en),
            es: str(it.es),
            audio: audio(it.audio),
            exEn: str(it.example_en) || undefined,
            exEs: str(it.example_es) || undefined,
            exAudio: audio(it.example_audio),
            exWt: Array.isArray(it.example_wt) ? (it.example_wt as unknown[]).filter((x): x is number => typeof x === "number") : undefined,
          })),
      }),
    )
    .filter((sec) => sec.items.length);
  return {
    kicker,
    title: str(cover.title_en).replace(/^Episode\s*\d+\s*:\s*/i, "") || episode.title,
    subEn: str(cover.subtitle_en),
    subEs: str(cover.subtitle_es),
    image: episode.artwork,
    sections,
  };
}
import { AudioPart, type Chapter, type Cue, type Track } from "@/components/part/AudioPart";
import { GrammarPart, type GrammarRule } from "@/components/part/GrammarPart";

// Same list as the exercise renderers (components/lesson/activities/Grammar.tsx).
const GRAMMAR_TYPES = new Set(["drag_drop_single", "choose_text_from_audio", "drag_drop_multiple", "funics", "listen_only", "listening_select_inverted"]);

/** The rule screen: the first exercise's explanation (paragraphs, example list, EN/ES audio), else its description and examples. */
function grammarRule(g: Record<string, unknown>, exercises: Record<string, unknown>[], sign: (ref: string) => string | null): GrammarRule {
  const rule: GrammarRule = { title: String(g.subtitle || g.grammarTopic || g.title || "Grammar"), text: [], examples: [], en: null, es: null };
  for (const ex of exercises) {
    const c = (ex.content ?? {}) as Record<string, unknown>;
    const groups = Array.isArray(c.instructions) ? (c.instructions as unknown[]).flat() : [];
    for (const item of groups as Record<string, unknown>[]) {
      if (item?.type === "paragraph" && typeof item.text === "string" && !/^for example:?$/i.test(item.text.trim())) rule.text.push(item.text);
      if (item?.type === "list" && Array.isArray(item.items)) rule.examples.push(...(item.items as unknown[]).filter((x): x is string => typeof x === "string"));
      if (item?.type === "audios") {
        rule.en ??= typeof item.english === "string" ? sign(item.english) : null;
        rule.es ??= typeof item.spanish === "string" ? sign(item.spanish) : null;
      }
    }
    if (!rule.text.length && typeof c.description === "string") rule.text.push(c.description);
    if (!rule.examples.length && Array.isArray(c.examples)) rule.examples.push(...(c.examples as unknown[]).filter((x): x is string => typeof x === "string"));
    if (rule.text.length) break;
  }
  rule.examples = rule.examples.slice(0, 6);
  return rule;
}
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

type Props = { params: Promise<{ slug: string; n: string; parte: string }>; searchParams: Promise<{ original?: string }> };

export default async function PartPage({ params, searchParams }: Props) {
  const { slug, n, parte } = await params;
  const { original } = await searchParams;
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
  const next = page.episodes.find((e) => e.n > episode.n);
  const finishLabel = fill(t.part.finish, { part: part.name });

  let body: React.ReactNode;
  if (key === "celsvideo") {
    const b = blocks.find((x) => x.block_type === "video" || x.block_type === "embed");
    const raw = b ? (b.block_type === "video" ? (b.data.media_url as string | null) : ((settingsOf(b).src as string | undefined) ?? b.body)) : null;
    body = <VideoPart src={youtubeEmbed(raw ?? null)} file={directMedia(raw ?? null, content.signed)} title={`${part.name} · ${episode.title}`} finishLabel={finishLabel} />;
  } else if (key === "celscards" && blocks.some((b) => b.block_type === "flashcard")) {
    body = <CardsPart cards={toCards(blocks, (r) => content.signed.get(r) ?? null)} />;
  } else if (key === "quiz" && blocks.some(isEpisodeQuiz)) {
    // celstv_quiz, or a plain quiz block carrying the same questions (the episode 8 review).
    const quiz = blocks.find(isEpisodeQuiz)!;
    const cardsPart = episode.parts.find((p) => p.key === "celscards");
    const { data: cardBlocks } = cardsPart
      ? await supabase.from("content_blocks").select("data").eq("lesson_id", cardsPart.id).eq("block_type", "flashcard")
      : { data: [] as { data: unknown }[] };
    const cards = (cardBlocks ?? []).flatMap((b) => rawCards((b.data as Record<string, unknown>)?.settings));
    body = <QuizPart questions={buildQuiz(settingsOf(quiz), cards, (r) => (typeof r === "string" ? (content.signed.get(r) ?? null) : null), part.id)} />;
  } else if (key === "celsbook" && original !== "1" && blocks.some((b) => b.block_type === "celsbook")) {
    const partHref = `${episodePath(page.course.slug, episode.n)}/celsbook`;
    const hasOriginal = blocks.some((b) => b.block_type === "flipbook" && Array.isArray(settingsOf(b).pages));
    body = (
      <CelsBookPart
        book={toCelsBook(blocks.find((b) => b.block_type === "celsbook")!.data, episode, (r) => content.signed.get(r) ?? null, fill(t.part.bookKicker, { n: episode.n }))}
        lessonId={part.id}
        finishLabel={finishLabel}
        originalHref={hasOriginal ? `${partHref}?original=1` : null}
      />
    );
  } else if (key === "celsbook" && blocks.some((b) => b.block_type === "flipbook" && Array.isArray(settingsOf(b).pages))) {
    const book = settingsOf(blocks.find((b) => b.block_type === "flipbook")!);
    const pages = (book.pages as { n?: number; url?: string }[])
      .slice()
      .sort((a, b) => Number(a.n) - Number(b.n))
      .map((pg) => ({ url: pg.url ? (content.signed.get(pg.url) ?? null) : null }));
    const interactive = blocks.some((b) => b.block_type === "celsbook") ? `${episodePath(page.course.slug, episode.n)}/celsbook` : undefined;
    body = (
      <BookPart pages={pages} ratio={Number(book.aspectRatio) > 0 ? Number(book.aspectRatio) : 0.7} lessonId={part.id} finishLabel={finishLabel} interactiveHref={interactive} />
    );
  } else if (key === "celsaudio") {
    const b = blocks.find((x) => x.block_type === "audio");
    const media = typeof b?.data.media_url === "string" ? b.data.media_url : null;
    const list = <T,>(v: unknown, ok: (x: T) => boolean) => (Array.isArray(v) ? (v as T[]).filter(ok) : []);
    // Transcript: the block's own data.transcript, else the one generated for this file (audio_transcripts).
    let cues = list<Cue>(b?.data.transcript, (c) => typeof c?.start === "number" && typeof c?.text === "string");
    if (!cues.length && media?.startsWith("storage://course-media/")) {
      const { data: tr } = await supabase.from("audio_transcripts").select("words").eq("path", media.slice("storage://course-media/".length)).eq("status", "done").maybeSingle();
      cues = transcriptCues(tr?.words);
    }
    const original: Track = {
      key: "original",
      label: t.part.originalAudio,
      src: media ? (content.signed.get(media) ?? null) : null,
      cues,
      chapters: list<Chapter>(b?.data.chapters, (c) => typeof c?.start === "number" && typeof c?.title === "string"),
      voice: null,
    };
    const cast = blocks.find((x) => x.block_type === "celscast");
    const tracks = cast ? [celscastTrack(cast.data, (r) => content.signed.get(r) ?? null), original] : [original];
    body = (
      <AudioPart tracks={tracks} title={episode.title || fill(t.episode.tag, { n: episode.n })} episodeKey={episodePath(page.course.slug, episode.n)} finishLabel={finishLabel} />
    );
  } else if (key === "grammar" && blocks.some((b) => b.block_type === "grammar")) {
    const g = settingsOf(blocks.find((b) => b.block_type === "grammar")!);
    const exercises = (Array.isArray(g.exercises) ? (g.exercises as Record<string, unknown>[]) : []).filter((e) => GRAMMAR_TYPES.has(String(e?.type)));
    body = (
      <GrammarPart
        rule={grammarRule(g, exercises, (r) => content.signed.get(r) ?? null)}
        exercises={exercises}
        urls={urlsFor(g, content.signed)}
        activityT={t.activity}
        seed={part.id}
      />
    );
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
            books={content.books}
            answers={content.answers}
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

function isEpisodeQuiz(b: { block_type: string; data: Record<string, unknown> }) {
  if (b.block_type === "celstv_quiz") return true;
  const qs = (settingsOf(b as Parameters<typeof settingsOf>[0]).questions ?? null) as unknown;
  return b.block_type === "quiz" && Array.isArray(qs) && qs.length > 0;
}
