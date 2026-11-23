// C-049 "Mi escuela": the director's view of their school (organization). Company tiles, one card per location
// (class) sorted by who needs the most attention, and a comparison table. Read with the director's session:
// RLS (private.directs_org / directs_user) returns only their school. Tapping a card opens that class's page
// (the C-048 student list), which a director may open for any class of their school.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { schoolInsights, type LocationCard } from "@/lib/class-insights";
import { Bar, Score, card, focus } from "@/components/classes/TeacherView";

export const dynamic = "force-dynamic";

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const ACCENTS = ["#E8137B", "#00A9D6", "#7B61FF", "#FFB020", "#1FA45B"];

export default async function SchoolPage() {
  const { t, lang } = await getDictionary();
  const c = t.school;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/escuela");
  if (viewer.role !== "director") notFound();
  if (!viewer.organizationId) return <p className={card}>{c.noSchool}</p>;

  const { org, cards, totals } = await schoolInsights(supabase, viewer.organizationId);
  if (!org) return <p className={card}>{c.noSchool}</p>;
  const locale = lang === "en" ? "en-US" : "es-MX";
  const time = new Date().toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });
  const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

  const tiles = [
    { label: c.active, sub: c.activeSub, value: `${totals.active}`, of: totals.students, color: ACCENTS[4] },
    { label: c.progress, sub: c.progressSub, value: pct(totals.progress), color: ACCENTS[1] },
    { label: c.quiz, sub: c.quizSub, value: pct(totals.quiz), color: ACCENTS[2] },
    { label: c.attention, sub: c.attentionSub, value: `${totals.attention}`, of: totals.students, color: ACCENTS[0] },
  ];

  return (
    <div className="space-y-6" data-page="escuela">
      <header className="flex flex-wrap items-center gap-4">
        {org.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element -- the school's own logo URL
          <img src={org.logo_url} alt="" className="h-14 w-14 rounded-2xl border border-[#EFE6F2] bg-white object-contain p-1" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-widest text-[#E8137B]">{c.crumb}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{org.name}</h1>
          <p className="text-sm font-semibold text-[#6B6680]">
            {cards.length === 1 ? c.location : fill(c.locations, { n: cards.length })} ·{" "}
            {totals.students === 1 ? c.student : fill(c.students, { n: totals.students })} · {fill(c.updated, { time })}
          </p>
        </div>
      </header>

      {cards.length === 0 ? (
        <p className={card}>{c.empty}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-block="school-tiles">
            {tiles.map((x) => (
              <div key={x.label} className="rounded-3xl border border-[#EFE6F2] bg-white p-4 shadow-sm" style={{ borderTop: `4px solid ${x.color}` }}>
                <p className="text-3xl font-extrabold">
                  {x.value}
                  {x.of !== undefined && <span className="text-base font-bold text-[#6B6680]"> / {x.of}</span>}
                </p>
                <p className="mt-1 text-sm font-extrabold">{x.label}</p>
                <p className="text-xs font-semibold text-[#6B6680]">{x.sub}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="text-xl font-extrabold">{c.locationsTitle}</h2>
            <p className="text-sm font-semibold text-[#6B6680]">{c.locationsSub}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((loc, i) => (
                <Location key={loc.id} loc={loc} c={c} color={ACCENTS[i % ACCENTS.length]} />
              ))}
            </div>
          </section>

          <section className={card} data-block="school-compare">
            <h2 className="text-lg font-extrabold">{c.compareTitle}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-[#6B6680]">
                    <th className="py-2 pr-3">{c.colLocation}</th>
                    <th className="py-2 pr-3">{c.colActive}</th>
                    <th className="py-2 pr-3">{c.colProgress}</th>
                    <th className="py-2 pr-3">{c.colQuiz}</th>
                    <th className="py-2">{c.colAttention}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EDF5]">
                  {cards.map((loc) => (
                    <tr key={loc.id}>
                      <td className="py-2 pr-3 font-extrabold">
                        <Link href={`/app/clases/${loc.id}`} className={`hover:underline ${focus}`}>
                          {loc.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 font-semibold">
                        {loc.focus.active} / {loc.focus.total}
                      </td>
                      <td className="py-2 pr-3 font-semibold">{loc.progress}%</td>
                      <td className="py-2 pr-3">
                        <Score pct={loc.focus.quiz} />
                      </td>
                      <td className="py-2 font-semibold">
                        {loc.behind.length} / {loc.focus.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#E4DEEA]">
                    <td className="py-2 pr-3 font-extrabold">{c.total}</td>
                    <td className="py-2 pr-3 font-extrabold">
                      {totals.active} / {totals.students}
                    </td>
                    <td className="py-2 pr-3 font-extrabold">{totals.progress}%</td>
                    <td className="py-2 pr-3">
                      <Score pct={totals.quiz} />
                    </td>
                    <td className="py-2 font-extrabold">
                      {totals.attention} / {totals.students}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Location({ loc, c, color }: { loc: LocationCard; c: Awaited<ReturnType<typeof getDictionary>>["t"]["school"]; color: string }) {
  const href = `/app/clases/${loc.id}`;
  const reason = (r: LocationCard["behind"][number]["reason"]) =>
    r.kind === "inactive" ? fill(c.reasonInactive, { n: r.days ?? 0 }) : r.kind === "quiz" ? fill(c.reasonQuiz, { pct: r.pct ?? 0 }) : c.reasonNotStarted;
  return (
    <article className="flex flex-col rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm" style={{ borderTop: `4px solid ${color}` }} data-block="location-card">
      <Link href={href} className={`group block ${focus}`}>
        <h3 className="text-lg font-extrabold group-hover:underline">{loc.name}</h3>
        <p className="text-xs font-semibold text-[#6B6680]">
          {[loc.schedule, loc.teacher ? fill(c.teacher, { name: loc.teacher }) : c.noTeacher].filter(Boolean).join(" · ")}
        </p>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-extrabold">
        <span>{fill(c.activeOf, { n: loc.focus.active, total: loc.focus.total })}</span>
        <Score pct={loc.focus.quiz} label={c.colQuiz} />
      </div>
      <div className="mt-3 space-y-2">
        {loc.focus.progress.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between gap-2 text-xs font-extrabold">
              <span className="truncate">{p.title}</span>
              <span>{p.pct}%</span>
            </div>
            <div className="mt-1">
              <Bar pct={p.pct} label={`${loc.name} · ${p.title}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-[#F7F5FA] p-3">
        <p className="text-sm font-extrabold">{c.behind}</p>
        {loc.behind.length ? (
          <ul className="mt-1 space-y-1">
            {loc.behind.slice(0, 3).map((b) => (
              <li key={b.student.id} className="flex justify-between gap-2 text-sm">
                <Link href={`${href}/estudiante/${b.student.id}`} className={`truncate font-bold hover:underline ${focus}`}>
                  {b.student.name}
                </Link>
                <span className="shrink-0 text-xs font-extrabold text-[#B5007E]">{reason(b.reason)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm font-semibold text-[#6B6680]">{c.allOnTrack}</p>
        )}
      </div>
      <Link href={href} className={`mt-3 self-start rounded-full bg-[#1B1830] px-4 py-2 text-sm font-extrabold text-white ${focus}`}>
        {c.seeAll} ›
      </Link>
    </article>
  );
}
