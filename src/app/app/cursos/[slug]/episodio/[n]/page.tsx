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
 * block of the flashcards lesson), the published interactive e-book for the CelsBook part, and the
 * "Material extra" rows.
 */
async function celsusDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  courseId: string,
  episode: Episode,
  t: Dictionary["us"],
) {
  const cards = episode.parts.find((p) => p.role === "cards");
  const [{ data: dl }, { data: ebook }] = await Promise.all([
    cards
      ? supabase.from("content_blocks").select("body").eq("lesson_id", cards.id).eq("block_type", "text").ilike("title", "%descargar%").limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    // RLS: students only see published e-books.
    supabase.from("ebooks").select("slug").eq("slug", `celsus-celsbook-episode-${episode.n}`).maybeSingle(),
  ]);
  const body = dl?.body ?? "";
  const topic = body.match(/Semana\s*\d+\s*\/\s*Week\s*\d+\s*[—–-]\s*(.+)/)?.[1]?.trim() ?? "";
  const pdf = (lang: string) => body.match(new RegExp(`${lang}:\\s*(storage://\\S+\\.pdf)`, "i"))?.[1] ?? null;
  const refs = [pdf("English"), pdf("Español")].filter((r): r is string => !!r);
  const signed = refs.length ? await signStorageRefs(supabase, new Set(refs), { courseId, viewer, access: true }) : new Map<string, string>();

  const parts = episode.parts.map((p) => (p.role === "book" && ebook ? { ...p, href: `/app/libros/${ebook.slug}` } : p));
  const subs: Partial<Record<UsRole, string>> = { ...t.subs, book: ebook ? t.subs.bookInteractive : t.subs.book, video: topic ? sentenceCase(topic) : t.subs.video };

  const extras: UsExtra[] = [];
  for (const p of episode.extra) {
    if (/^printable/i.test(p.title)) continue; // replaced by the PDFs below
    if (/reading and writing/i.test(p.title)) extras.push({ href: p.href, label: t.readingWriting, tag: t.practice, icon: "✎" });
    else if (/review/i.test(p.title)) extras.push({ href: p.href, label: t.review, tag: t.practice, icon: "↺" });
    else if (p.type === "video") extras.push({ href: p.href, label: p.title.replace(/\s*-\s*Subtitulada$/i, ""), tag: t.video, icon: "▶" });
    else extras.push({ href: p.href, label: p.title, tag: "", icon: "📄" });
  }
  const en = pdf("English");
  const es = pdf("Español");
  if (en && signed.get(en)) extras.push({ href: signed.get(en)!, label: t.printableEn, tag: "PDF", icon: "🖨", external: true });
  if (es && signed.get(es)) extras.push({ href: signed.get(es)!, label: t.printableEs, tag: "PDF", icon: "🖨", external: true });

  return { topic: topic ? sentenceCase(topic) : "", subs, extras, episode: { ...episode, parts, next: parts.find((p) => p.id === episode.next?.id) ?? episode.next } };
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
    const us = await celsusDetails(supabase, viewer, page.course.id, episode, t.us);
    return (
      <CelsusEpisode
        t={t.us}
        episode={us.episode}
        title={us.topic || fill(t.us.kicker, { n: episode.n })}
        sub={t.us.sub}
        courseHref={courseHref}
        nextHref={page.episodes.find((e) => e.n === episode.n + 1)?.href ?? null}
        examHref="/app/examen-civico"
        extras={us.extras}
        subs={us.subs}
        episodesDone={page.doneCount}
        episodesTotal={page.episodes.length}
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
