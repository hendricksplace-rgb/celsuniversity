import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { kindOf } from "@/lib/civics";
import { examLessons, listExams, loadCardState } from "@/lib/civics-server";
import { themeForCourse } from "@/lib/themes";
import { Rules, fill } from "@/components/civics/shared";

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

  return (
    <div data-theme={course ? themeForCourse(course) : "celsus"} className="t-panel space-y-6">
      <header className="space-y-2">
        {course && (
          <Link href={`/app/cursos/${course.slug}`} className="t-muted text-sm hover:underline">
            ← {course.title}
          </Link>
        )}
        <h1 className="t-heading text-3xl">{t.civics.title}</h1>
        <p className="t-muted">{t.civics.sub}</p>
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
                <li key={e.id} className="t-card t-card-accent flex flex-col gap-3">
                  <span className="text-3xl" aria-hidden>
                    {kind === "interview" ? "🎙️" : kind === "6520" ? "🔎" : "📝"}
                  </span>
                  <div className="space-y-1">
                    <h2 className="t-heading text-xl">
                      {kind === "interview" ? t.civics.kindInterview : kind === "6520" ? t.civics.kind6520 : t.civics.kindSpanish}
                    </h2>
                    <p className="t-muted text-sm">
                      {kind === "interview" ? t.civics.kindInterviewSub : kind === "6520" ? t.civics.kind6520Sub : t.civics.kindSpanishSub}
                    </p>
                  </div>
                  <Rules exam={{ kind, count: e.exam_question_count, pass: e.pass_count }} t={t.civics} />
                  <Bar value={k} total={qs.length} label={fill(t.civics.knownCount, { known: k, total: qs.length })} />
                  <p className="t-muted text-xs">
                    {last
                      ? `${t.civics.lastResult}: ${last.score}/${last.total} · ${last.passed ? "✓" : "✗"} · ${fmt.format(new Date(last.created_at))}`
                      : t.civics.noAttempts}
                  </p>
                  <Link href={`/app/examen-civico/${e.id}`} className="t-btn mt-auto">
                    {t.civics.blockCta} →
                  </Link>
                </li>
              );
            })}
          </ul>

          <section className="t-card space-y-3">
            <h2 className="t-heading text-lg">{t.civics.progressTitle}</h2>
            {[...sections].map(([name, s]) => (
              <Bar key={name} value={s.known} total={s.total} label={`${t.civics.sectionNames[name] ?? name} · ${s.known}/${s.total}`} />
            ))}
          </section>

          <section className="t-card t-card-accent space-y-3">
            <h2 className="t-heading text-lg">🔎 {t.civics.changingTitle}</h2>
            <p className="t-muted text-sm">{t.civics.changingSub}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {CHANGING_LINKS.map(([href, key]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="t-btn-ghost w-full justify-between">
                    {t.civics[key]} <span aria-hidden>↗</span>
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

function Bar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <p className="text-sm">{label}</p>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--t-border)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--t-accent)" }} />
      </div>
    </div>
  );
}
