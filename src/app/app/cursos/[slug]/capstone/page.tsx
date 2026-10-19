import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { currentWeekOf, weekPath } from "@/lib/bsns";
import { capstoneParts, loadSyllabus } from "@/lib/bsns-syllabus";
import { montserrat } from "@/components/course/bsns-fonts";
import { fmtTime } from "@/lib/video-task";
import s from "@/components/course/bsns-week.module.css";

type Props = { params: Promise<{ slug: string }> };
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/**
 * CelsBSNS "Mi Capstone" (celsu-celsbsns-semana-brief.md): one page for all 10 weeks. There is no Capstone document in
 * the database yet, so for now it lists the 10 parts from the syllabus, read-only, with the current part highlighted.
 * The full page (write or upload each part) comes later from Cowork.
 */
export default async function CapstonePage({ params }: Props) {
  const { slug } = await params;
  const { lang, t: all } = await getDictionary();
  const t = all.bsnsWeek;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/capstone`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  if (!page) notFound();
  const current = currentWeekOf(page.episodes.map((e) => ({ n: e.n, done: e.parts.map((p) => p.done) })));
  const parts = capstoneParts(await loadSyllabus(supabase, page), lang);
  const doneWeek = new Set(page.episodes.filter((e) => e.parts.length && e.parts.every((p) => p.done)).map((e) => e.n));

  // Capstone · Part N "Video grabado": the thumbnail and length from video_proofs (the video itself never leaves the
  // student's device). video_task_content.capstone_part says which part each Video Submission feeds.
  const lessonHref = new Map(page.episodes.flatMap((e) => e.parts.map((p) => [p.id, `${weekPath(page.course.slug, e.n)}/tarea/${p.id}`] as const)));
  const videoIds = page.episodes.flatMap((e) => e.parts.filter((p) => p.type === "video_submission").map((p) => p.id));
  const [{ data: proofs }, { data: vcontent }, { data: phrases }] = await Promise.all([
    videoIds.length
      ? supabase.from("video_proofs").select("lesson_id, thumb_path, duration_s, updated_at").eq("user_id", viewer.user.id).in("lesson_id", videoIds)
      : Promise.resolve({ data: [] as { lesson_id: string; thumb_path: string; duration_s: number | null; updated_at: string }[] }),
    videoIds.length ? supabase.from("video_task_content").select("lesson_id, data").in("lesson_id", videoIds) : Promise.resolve({ data: [] as { lesson_id: string; data: unknown }[] }),
    // "Mis frases" (phrase_bank, owner only), oldest first, as in the Writing composer's "★ Mis frases" tab.
    supabase.from("phrase_bank").select("id, text").eq("user_id", viewer.user.id).order("created_at"),
  ]);
  const partOfVideo = new Map((vcontent ?? []).map((r) => [r.lesson_id, Number((r.data as { capstone_part?: number } | null)?.capstone_part) || 1]));
  const signed = await Promise.all(
    (proofs ?? []).map(async (v) => {
      const { data } = await supabase.storage.from("video-proofs").createSignedUrl(v.thumb_path, 3600);
      return [v.lesson_id, data?.signedUrl ?? null] as const;
    }),
  );
  const thumbOf = new Map(signed);
  const videoByPart = new Map<number, { href: string; thumb: string | null; len: string | null; on: string } | { href: string; missing: true }>();
  for (const id of videoIds) {
    const part = partOfVideo.get(id) ?? 1;
    const proof = (proofs ?? []).find((v) => v.lesson_id === id);
    const href = lessonHref.get(id) ?? weekPath(page.course.slug, 1);
    if (proof)
      videoByPart.set(part, {
        href,
        thumb: thumbOf.get(id) ?? null,
        len: proof.duration_s ? fmtTime(proof.duration_s) : null,
        on: new Date(proof.updated_at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", timeZone: "America/Mexico_City" }),
      });
    else if (!videoByPart.has(part)) videoByPart.set(part, { href, missing: true });
  }

  return (
    <div className={`${s.page} ${montserrat.variable}`}>
      <header className={`${s.hero} ${s.capHero}`}>
        <div className={s.wrap}>
          <div className={s.htop}>
            <Link prefetch={false} className={s.back} href={weekPath(page.course.slug, current)}>
              <span>
                <svg viewBox="0 0 24 24" className={s.i} aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </span>
              {fill(t.capBack, { n: current })}
            </Link>
          </div>
          <p className={s.kick} style={{ marginTop: 34 }}>
            {t.capKicker}
          </p>
          <h1>
            {t.capTitle.split(" ").slice(0, -2).join(" ")} <em>{t.capTitle.split(" ").slice(-2).join(" ")}</em>
          </h1>
          <p className={s.obj}>{t.capText}</p>
        </div>
      </header>
      <div className={s.outer}>
        <ol className={s.capList}>
          {parts.map((p) => {
            const now = p.week === current;
            return (
              <li key={p.part} className={`${s.card} ${now ? s.ccur : ""}`} aria-current={now ? "step" : undefined}>
                <div className={s.ct}>
                  <span className={s.ico} aria-hidden="true">
                    <svg viewBox="0 0 24 24" className={s.i}>
                      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
                      <path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 21h8M9 17h6" />
                    </svg>
                  </span>
                  <span className={s.type}>
                    {fill(t.msPart, { n: p.part })} · {fill(t.msWeek, { n: p.week })}
                  </span>
                  {now ? (
                    <span className={`${s.pill} ${s.pNow}`}>{t.msThisWeek}</span>
                  ) : doneWeek.has(p.week) ? (
                    <span className={`${s.pill} ${s.pDone}`}>{t.capWeekDone}</span>
                  ) : null}
                </div>
                <h2>{p.text}</h2>
                {(() => {
                  const v = videoByPart.get(p.part);
                  if (!v) return null;
                  if ("missing" in v)
                    return (
                      <p className={s.capVidNone}>
                        {t.capVideoNone}{" "}
                        <Link prefetch={false} href={v.href}>
                          {t.capVideoGo}
                        </Link>
                      </p>
                    );
                  return (
                    <Link prefetch={false} href={v.href} className={s.capVid}>
                      {v.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL from a private bucket
                        <img src={v.thumb} alt={t.capVideoAlt} width={160} height={90} />
                      ) : (
                        <span className={s.capVidPh} aria-hidden="true" />
                      )}
                      <span>
                        <b>
                          <svg viewBox="0 0 24 24" className={s.i} aria-hidden="true">
                            <path d="M4 7h11v10H4zM15 10l5-3v10l-5-3" />
                          </svg>
                          {t.capVideo}
                        </b>
                        {v.len && <span>{fill(t.capVideoLen, { t: v.len })}</span>}
                        <span>{fill(t.capVideoOn, { d: v.on })}</span>
                      </span>
                    </Link>
                  );
                })()}
              </li>
            );
          })}
        </ol>
        <section className={`${s.card} ${s.capPhr}`} aria-labelledby="cap-phrases">
          <h2 id="cap-phrases">
            <span aria-hidden="true">★</span> {t.capPhrases}
          </h2>
          <p>{phrases?.length ? t.capPhrasesSub : t.capPhrasesNone}</p>
          {!!phrases?.length && (
            <ul>
              {phrases.map((ph) => (
                <li key={ph.id} lang="en">
                  {ph.text}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className={s.capSoon}>{t.capSoon}</p>
      </div>
    </div>
  );
}
