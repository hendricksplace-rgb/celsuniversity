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
              </li>
            );
          })}
        </ol>
        <p className={s.capSoon}>{t.capSoon}</p>
      </div>
    </div>
  );
}
