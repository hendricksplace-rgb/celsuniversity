import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { kindOf } from "@/lib/civics";
import { examLessons, listExams, loadCardState } from "@/lib/civics-server";
import { themeForCourse } from "@/lib/themes";
import { fill } from "@/components/civics/shared";

const CHANGING_LINKS = [
  ["https://www.uscis.gov/citizenship/testupdates", "linkTestUpdates"],
  ["https://www.senate.gov", "linkSenate"],
  ["https://www.house.gov", "linkHouse"],
  ["https://www.usa.gov/states-and-territories", "linkStates"],
] as const;

/** Start screen: the three 2025 exams, progress by section, and the questions whose answers change. */
export default async function CivicsStart() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/examen-civico");

  const exams = await listExams(supabase, viewer);
  const course = one(one(exams[0]?.module)?.course);
  const ids = exams.map((e) => e.id);
  const [{ data: rows }, { data: attempts }, cards] = await Promise.all([
    ids.length
      ? supabase.from("evaluation_questions").select("evaluation_id, question_type, data->n, data->section").in("evaluation_id", ids)
      : Promise.resolve({ data: [] as { evaluation_id: string; question_type: string | null; n: unknown; section: unknown }[] }),
    ids.length
      ? supabase
          .from("evaluation_attempts")
          .select("evaluation_id, score, total, passed, created_at")
          .eq("user_id", viewer.user.id)
          .in("evaluation_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { evaluation_id: string; score: number; total: number; passed: boolean; created_at: string }[] }),
    examLessons(supabase).then((lessons) => loadCardState(supabase, viewer.user.id, lessons)),
  ]);

  const known = new Set(cards.known);
  const graded = (rows ?? []).filter((r) => r.question_type !== "check_online");
  // Sections over the full bank: every question number once.
  const bank = new Map<number, string>();
  for (const r of graded) bank.set(Number(r.n), String(r.section ?? ""));
  const sections = new Map<string, { total: number; known: number }>();
  for (const [n, section] of bank) {
    const s = sections.get(section) ?? { total: 0, known: 0 };
    s.total++;
    if (known.has(n)) s.known++;
    sections.set(section, s);
  }
  const lastAttempt = (id: string) => (attempts ?? []).find((a) => a.evaluation_id === id);
  const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

  const bankKnown = [...bank.keys()].filter((n) => known.has(n)).length;
  const readiness = bank.size ? Math.round((bankKnown / bank.size) * 100) : 0;
  const label = (k: string) => (k === "interview" ? "EN" : k === "6520" ? "65/20" : "ES");

  return (
    <div data-theme={course ? themeForCourse(course) : "celsus"} className="t-panel space-y-6">
      <header className="cx-navy -mx-5 -mt-5 flex flex-col gap-6 rounded-t-[calc(var(--t-radius)*1.5)] px-5 py-8 sm:-mx-8 sm:-mt-8 sm:flex-row sm:items-center sm:px-8">
        <div className="flex-1 space-y-2">
          {course && (
            <Link href={`/app/cursos/${course.slug}`} className="text-sm text-white/75 hover:underline">
              ← {course.title}
            </Link>
          )}
          <h1 className="cx-serif text-3xl font-semibold sm:text-4xl">{t.civics.title}</h1>
          <p className="max-w-xl text-white/80">{t.civics.sub}</p>
        </div>
        {exams.length > 0 && (
          <div className="flex items-center gap-4">
            <Ring pct={readiness} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cx-gold)]">{t.civics.readiness}</p>
              <p className="text-sm text-white/80">{fill(t.civics.readinessSub, { known: bankKnown, total: bank.size })}</p>
            </div>
          </div>
        )}
      </header>

      {!exams.length ? (
        <p className="t-card">{t.civics.noExams}</p>
      ) : (
        <>
          <ul className="grid gap-4 lg:grid-cols-3">
            {exams.map((e) => {
              const kind = kindOf(e);
              const qs = graded.filter((r) => r.evaluation_id === e.id);
              const k = qs.filter((r) => known.has(Number(r.n))).length;
              const last = lastAttempt(e.id);
              return (
                <li key={e.id} className="t-card-accent relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-11 min-w-11 place-items-center rounded-full bg-[var(--cx-navy)] px-2 text-sm font-bold text-[var(--cx-gold)]">{label(kind)}</span>
                    <span className="cx-chip">{fill(t.civics.ruleChip, { count: e.exam_question_count, pass: e.pass_count })}</span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="cx-serif text-xl font-semibold text-[var(--cx-navy)]">
                      {kind === "interview" ? t.civics.kindInterview : kind === "6520" ? t.civics.kind6520 : t.civics.kindSpanish}
                    </h2>
                    <p className="t-muted text-sm">
                      {kind === "interview" ? t.civics.kindInterviewSub : kind === "6520" ? t.civics.kind6520Sub : t.civics.kindSpanishSub}
                    </p>
                  </div>
                  <Bar value={k} total={qs.length} label={fill(t.civics.knownCount, { known: k, total: qs.length })} />
                  <p className="t-muted text-xs">
                    {last
                      ? `${t.civics.lastResult}: ${last.score}/${last.total} · ${last.passed ? "✓" : "✗"} · ${fmt.format(new Date(last.created_at))}`
                      : t.civics.noAttempts}
                  </p>
                  <Link href={`/app/examen-civico/${e.id}`} className="t-btn mt-auto rounded-full !py-2.5">
                    {t.civics.blockCta} →
                  </Link>
                </li>
              );
            })}
          </ul>

          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
            <h2 className="cx-serif text-xl font-semibold text-[var(--cx-navy)]">{t.civics.progressTitle}</h2>
            {[...sections].map(([name, s]) => (
              <Bar key={name} value={s.known} total={s.total} label={`${t.civics.sectionNames[name] ?? name} · ${s.known}/${s.total}`} />
            ))}
          </section>

          <section className="cx-navy space-y-3 rounded-2xl p-5 sm:p-6">
            <h2 className="cx-serif text-xl font-semibold">{t.civics.changingTitle}</h2>
            <p className="text-sm text-white/80">{t.civics.changingSub}</p>
            <ul className="flex flex-wrap gap-2">
              {CHANGING_LINKS.map(([href, key]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="cx-chip-gold !px-3.5 !py-1.5 !text-sm">
                    {t.civics[key]} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

/** Readiness: share of the graded bank the student marked "Lo sé". */
function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0" role="img" aria-label={`${pct}%`}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="8" />
      {pct > 0 && (
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="#FFD24D"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 42 42)"
      />
      )}
      <text x="42" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fontFamily="var(--font-serif), Georgia, serif">
        {pct}%
      </text>
    </svg>
  );
}

function Bar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <p className="text-sm">{label}</p>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--t-border)]" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--cx-gold-dark), var(--cx-gold))" }} />
      </div>
    </div>
  );
}
