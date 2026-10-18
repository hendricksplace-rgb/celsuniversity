import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { taskStatus, taskTime, videoTitle, weekTitle, type TaskStatus } from "@/lib/bsns";
import { fill, pad } from "@/components/course/kit";

type Props = { params: Promise<{ slug: string; n: string }> };

const CHIP: Record<TaskStatus, { bg: string; fg: string }> = {
  pending: { bg: "#EEF1F6", fg: "#5B6B86" },
  progress: { bg: "#E2ECFB", fg: "#2560B0" },
  submitted: { bg: "#E3F1E6", fg: "#1E7A3A" },
  done: { bg: "#E3F1E6", fg: "#1E7A3A" },
  reviewed: { bg: "#FFF4D6", fg: "#8A6400" },
  coach: { bg: "#FFF4D6", fg: "#8A6400" },
};

/** CelsBSNS week (celsu-celsbook-us-bsns-spec.md §3, phone 3): the week's videos in a row, then the tasks. */
export default async function BsnsWeekPage({ params }: Props) {
  const { slug, n } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/semana/${n}`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const week = page?.episodes.find((e) => e.n === Number(n));
  if (!page || !week) notFound();

  const { data: subs } = week.parts.length
    ? await supabase.from("submissions").select("lesson_id, status").eq("user_id", viewer.user.id).in("lesson_id", week.parts.map((p) => p.id))
    : { data: [] };
  const subOf = new Map((subs ?? []).map((s) => [s.lesson_id, s]));
  const videos = week.parts.filter((p) => p.type === "video");
  const tasks = week.parts.filter((p) => p.type !== "video").map((p) => ({ p, time: taskTime(p.title), status: taskStatus(p, subOf.get(p.id)) }));
  const done = week.parts.filter((p) => p.done || ["submitted", "reviewed"].includes(subOf.get(p.id)?.status ?? "")).length;
  const hours = Math.round(tasks.reduce((s, x) => s + x.time.hours, 0));
  const tb = t.bsns;

  return (
    <div className="-mx-4 -mt-6 min-h-[calc(100dvh-7.5rem)] bg-[#F4F7FB] pb-6 sm:mx-auto sm:mt-0 sm:max-w-[720px] sm:overflow-hidden sm:rounded-xl md:-mt-2">
      <header className="flex flex-col gap-2.5 px-5 pb-5 pt-4 text-white" style={{ background: "linear-gradient(135deg, #13284D, #2C6BC4)" }}>
        <div className="flex items-center justify-between">
          <Link href={`/app/cursos/${slug}`} aria-label={t.course.back} className="kit-focus-light grid size-9 place-items-center rounded-lg bg-white/15 text-lg">
            ‹
          </Link>
          <Image src="/brand/celsbsns.png" alt="CelsBSNS" width={86} height={24} className="h-6 w-auto" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C9D6EE]">{fill(tb.weekOf, { n: week.n, total: page.episodes.length })}</p>
        <h1 className="text-[22px] font-extrabold leading-tight">{weekTitle(week.title)}</h1>
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <span className="block h-full bg-white" style={{ width: `${week.parts.length ? (done / week.parts.length) * 100 : 0}%` }} />
          </span>
          <span className="text-xs font-bold">{fill(tb.progress, { n: done, total: week.parts.length })}</span>
        </div>
      </header>

      <div className="space-y-3 px-4 pt-4">
        {videos.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-extrabold text-[#13284D]">{tb.videos}</h2>
              <span className="text-xs text-[#5B6B86]">{fill(tb.videosDone, { n: videos.filter((v) => v.done).length, total: videos.length })}</span>
            </div>
            <ol className="-mx-4 mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1">
              {videos.map((v, i) => (
                <li key={v.id} className="w-[120px] shrink-0">
                  <Link href={v.href} className="kit-focus block rounded-md">
                    <span
                      className="relative grid h-[68px] place-items-center rounded-md font-extrabold text-white"
                      style={{ background: v.done ? "linear-gradient(135deg,#13284D,#2C6BC4)" : "linear-gradient(135deg,#C9D6EE,#A9BDE0)" }}
                    >
                      {v.done ? "✓" : "▶"}
                      <span className="absolute left-1.5 top-1 text-[10px] font-extrabold text-white/85">{pad(i + 1)}</span>
                    </span>
                    <span className="mt-1.5 block text-[11.5px] font-bold leading-tight text-[#13284D]">{videoTitle(v.title)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold text-[#13284D]">{tb.tasks}</h2>
            {hours > 0 && <span className="text-xs text-[#5B6B86]">{fill(tb.hours, { n: hours })}</span>}
          </div>
          <ul className="mt-2 space-y-[7px]">
            {tasks.map(({ p, time, status }) => {
              const ticked = status === "submitted" || status === "done" || status === "reviewed";
              return (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className="kit-focus flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5"
                    style={{ boxShadow: status === "progress" ? "inset 0 0 0 2px #2C6BC4" : "0 0 0 1px #DCE3F0" }}
                  >
                    <span
                      aria-hidden
                      className="grid size-5 shrink-0 place-items-center rounded-[5px] text-xs font-extrabold text-white"
                      style={ticked ? { background: "#1E7A3A" } : { boxShadow: "inset 0 0 0 2px #B9C6DD" }}
                    >
                      {ticked ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[13.5px] text-[#13284D]">{time.name}</strong>
                      {time.label && <span className="text-[11.5px] text-[#5B6B86]">{time.label}</span>}
                    </span>
                    <span className="shrink-0 rounded-md px-2 py-1 text-[11px] font-extrabold" style={{ background: CHIP[status].bg, color: CHIP[status].fg }}>
                      {tb.status[status]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
