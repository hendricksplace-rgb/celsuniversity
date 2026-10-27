import { getDictionary } from "@/lib/i18n/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { episodePath } from "@/lib/course-page";
import { ROLE_LABEL, episodeStatus } from "@/lib/episode-status";
import { Completion, type CompletionProps } from "@/components/celsbook/Completion";

type Props = { params: Promise<{ slug: string; n: string }> };

const topicOf = (subtitle: string | null | undefined) => {
  const parts = (subtitle ?? "").split(" · ");
  return (parts.length > 1 ? parts.slice(1).join(" · ") : parts[0]).trim();
};

/**
 * CelsUS completion screen. State A: the CelsBook is done but the episode isn't. State B: all 6 parts are done
 * (shown after whichever part was the last one missing; see afterPartFinished).
 */
export default async function EpisodeFinished({ params }: Props) {
  const { slug, n: raw } = await params;
  const n = Number(raw);
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${episodePath(slug, n)}/terminado`);
  const status = await episodeStatus(supabase, viewer.user.id, slug, n, viewer.isStaff);
  if (!status) notFound();
  const { data: course } = await supabase.from("courses").select("id, title").eq("slug", status.courseSlug).maybeSingle();
  if (!course || !(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${status.courseSlug}`);

  const bookSlug = `celsus-celsbook-episode-${n}`;
  const quizPart = status.parts.find((p) => p.role === "quiz");
  const bookPart = status.parts.find((p) => p.role === "book");
  const [{ data: books }, { data: game }, { data: quiz }, { data: catalog }] = await Promise.all([
    supabase.from("ebooks").select("id, slug, subtitle, screens").in("slug", [bookSlug, `celsus-celsbook-episode-${n + 1}`]),
    supabase.from("gamification").select("current_streak, badges").eq("user_id", viewer.user.id).maybeSingle(),
    quizPart
      ? supabase.from("progress").select("quiz_score, quiz_max_score").eq("user_id", viewer.user.id).eq("lesson_id", quizPart.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("badges").select("code, name").eq("active", true),
  ]);
  const book = books?.find((b) => b.slug === bookSlug);
  const nextBook = books?.find((b) => b.slug !== bookSlug);
  const { data: answers } = book
    ? await supabase.from("ebook_answers").select("answers, completed_at").eq("ebook_id", book.id).eq("user_id", viewer.user.id).maybeSingle()
    : { data: null };
  const screens = Array.isArray(book?.screens) ? book.screens.length : 0;
  const seen = (answers?.answers as Record<string, unknown> | null)?._seen;
  const pages = answers?.completed_at ? screens : Array.isArray(seen) ? seen.length : 0;

  // The newest medal earned in the last half hour (private.award_badges writes { at, seen }).
  const earned = Object.entries((game?.badges ?? {}) as Record<string, { at?: string }>)
    .filter(([, v]) => v?.at && Date.now() - new Date(v.at).getTime() < 30 * 60 * 1000)
    .sort((a, b) => (b[1].at ?? "").localeCompare(a[1].at ?? ""))[0];
  const medal = earned ? (catalog?.find((b) => b.code === earned[0])?.name ?? null) : null;

  const first = (viewer.displayName ?? "").trim().split(/\s+/)[0] ?? "";
  const { t, lang } = await getDictionary();
  // The episode topic comes from the Spanish subtitle: English mode leaves it out.
  const topic = (subtitle: string | null | undefined) => (lang === "en" ? "" : topicOf(subtitle));
  const props: CompletionProps = {
    state: status.complete ? "B" : "A",
    userId: viewer.user.id,
    n,
    firstName: first && !first.includes("@") ? first : null,
    topic: topic(book?.subtitle),
    pages: { read: pages || screens, total: screens },
    parts: status.parts.map((p, i) => ({ icon: ROLE_LABEL[p.role].icon, name: t.fin.roles[p.role], done: p.done, now: status.next?.index === i })),
    done: status.done,
    total: status.total,
    bookXp: bookPart?.xpEarned ?? 0,
    episodeXp: status.parts.reduce((s, p) => s + (p.xpEarned ?? 0), 0),
    streak: game?.current_streak ?? 0,
    quiz: quiz?.quiz_max_score ? { right: quiz.quiz_score ?? 0, total: quiz.quiz_max_score } : null,
    medal,
    episodeHref: status.episodeHref,
    next: status.next ? { label: t.fin.rolesLong[status.next.role].replace("{n}", String(n)), href: status.next.href, index: status.next.index + 1 } : null,
    nextEpisode: status.nextEpisode ? { n: status.nextEpisode.n, href: status.nextEpisode.href, topic: topic(nextBook?.subtitle) } : null,
    finalExamHref: status.finalExamHref,
    readAgainHref: `/app/libros/${bookSlug}?p=1`,
    back: { t: t.usBack, course: { href: `/app/cursos/${status.courseSlug}`, name: course.title } },
    t: t.fin,
  };
  return <Completion {...props} />;
}
