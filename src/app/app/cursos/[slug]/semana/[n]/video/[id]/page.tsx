import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { loadBsnsWeek } from "@/lib/bsns-week";
import { weekPath, weekTitle } from "@/lib/bsns";
import { fileRoute } from "@/components/reader/media";
import { BsnsVideo, type VideoItem, type TaskItem } from "@/components/bsns/BsnsVideo";

type Props = { params: Promise<{ slug: string; n: string; id: string }> };

/** Done for a CelsBSNS task, as on the week page: completed, or its work sent / reviewed / saved as finished. */
const DONE = new Set(["done", "submitted", "reviewed"]);

/** C-029: a CelsBSNS video lesson (celsbsns-video-v3.html), one page for every week's videos. */
export default async function BsnsVideoPage({ params }: Props) {
  const { slug, n, id } = await params;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/semana/${n}/video/${id}`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const week = page?.episodes.find((e) => e.n === Number(n));
  const part = week?.parts.find((p) => p.id === id);
  if (!page || !week || !part) notFound();
  if (part.type !== "video") redirect(part.href);
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(`/app/cursos/${slug}`);

  const videos = week.parts.filter((p) => p.type === "video");
  const [{ data: blocks }, { data: note }, { data: ask }, wk] = await Promise.all([
    supabase
      .from("content_blocks")
      .select("id, lesson_id, data, sort_order")
      .in(
        "lesson_id",
        videos.map((v) => v.id),
      )
      .eq("block_type", "video")
      .order("sort_order"),
    supabase.from("lesson_notes").select("body").eq("user_id", viewer.user.id).eq("lesson_id", id).maybeSingle(),
    supabase.from("video_ready_requests").select("lesson_id").eq("user_id", viewer.user.id).eq("lesson_id", id).maybeSingle(),
    loadBsnsWeek(supabase, { page, week, userId: viewer.user.id, displayName: viewer.displayName, lang }),
  ]);
  const blockOf = new Map<string, { id: string; media: string | null; duration: number | null }>();
  for (const b of blocks ?? []) {
    if (blockOf.has(b.lesson_id)) continue;
    const d = (b.data ?? {}) as { media_url?: unknown; duration?: unknown };
    blockOf.set(b.lesson_id, {
      id: b.id,
      media: typeof d.media_url === "string" && d.media_url.trim() ? d.media_url.trim() : null,
      duration: typeof d.duration === "number" ? d.duration : null,
    });
  }

  const items: VideoItem[] = videos.map((v, i) => ({ id: v.id, href: v.href, n: i + 1, done: v.done, duration: blockOf.get(v.id)?.duration ?? null }));
  const at = videos.findIndex((v) => v.id === id);
  // The tasks in lesson order, with the week page's statuses.
  const acts = new Map(wk.phases.flatMap((ph) => ph.cards).map((a) => [a.id, a]));
  const tasks: TaskItem[] = week.parts
    .filter((p) => p.type !== "video")
    .flatMap((p) => {
      const a = acts.get(p.id);
      return a ? [{ id: a.id, href: a.href, kind: a.kind, name: a.name, time: a.time, status: a.status }] : [];
    });
  const doneCount = items.filter((v) => v.done).length + tasks.filter((x) => DONE.has(x.status)).length;

  // Next: the following video; after the last one, the week's first task (the Reading Assignment).
  const nextVideo = videos[at + 1];
  const firstTask = tasks.find((x) => x.kind === "reading") ?? tasks.find((x) => x.kind !== "syllabus") ?? null;
  const next = nextVideo
    ? { href: nextVideo.href, label: t.bv.videoN.replace("{n}", String(at + 2).padStart(2, "0")), n: at + 2 }
    : firstTask
      ? { href: firstTask.href, label: firstTask.name, n: null }
      : null;
  const prevVideo = videos[at - 1];
  const before = week.parts[week.parts.findIndex((p) => p.id === id) - 1];
  const prev = prevVideo
    ? { href: prevVideo.href, label: t.bv.videoN.replace("{n}", String(at).padStart(2, "0")) }
    : before
      ? { href: before.href, label: tasks.find((x) => x.id === before.id)?.name ?? before.title }
      : { href: weekPath(slug, week.n), label: t.bv.weekPage };
  const block = blockOf.get(id) ?? null;
  const media = block?.media ?? null;

  return (
    <BsnsVideo
      key={id}
      t={t.bv}
      userId={viewer.user.id}
      lessonId={id}
      blockId={block?.id ?? null}
      src={media ? (media.startsWith("storage://") ? fileRoute(media) : media) : null}
      week={week.n}
      topic={weekTitle(week.title)}
      x={at + 1}
      y={videos.length}
      xp={part.xpReward}
      done={part.done}
      track={!part.draft}
      weekDone={{ x: doneCount, y: items.length + tasks.length }}
      videos={items}
      tasks={tasks}
      next={next}
      prev={prev}
      readingHref={firstTask?.href ?? null}
      notes={note?.body ?? ""}
      notify={!!ask}
      courseHref={`/app/cursos/${slug}`}
      weekHref={weekPath(slug, week.n)}
    />
  );
}
