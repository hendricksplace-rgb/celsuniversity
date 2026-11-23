// C-048 teacher view (English only, by request): the class dashboard, the student list and the pieces the
// student page reuses. Data comes from src/lib/class-insights.ts.
import Link from "next/link";
import { ACTIVE_DAYS, ATTENTION_QUIZ_BELOW, INACTIVE_DAYS, REVIEW_BELOW, scoreTone, type ClassFocus, type Status, type StudentInsight } from "@/lib/class-insights";

export const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
export const card = "rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6";

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const ago = (days: number | null) => (days === null ? "Not started" : days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`);

const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  active: { label: "Active", cls: "bg-[#E3F7EC] text-[#0F6B3A]", dot: "bg-[#1FA45B]" },
  slowing: { label: "Slowing down", cls: "bg-[#FFF4D6] text-[#7A5300]", dot: "bg-[#E0A100]" },
  inactive: { label: "Inactive", cls: "bg-[#FFE3F0] text-[#B5007E]", dot: "bg-[#D10F75]" },
  not_started: { label: "Not started", cls: "bg-[#F1EDF5] text-[#4A4766]", dot: "bg-[#9A94AD]" },
};

export function StatusChip({ status, days }: { status: Status; days?: number | null }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${s.cls}`} data-status={status}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
      {(status === "slowing" || status === "inactive") && typeof days === "number" ? ` · ${days} days` : ""}
    </span>
  );
}

const TONE = { good: "bg-[#E3F7EC] text-[#0F6B3A]", ok: "bg-[#FFF4D6] text-[#7A5300]", low: "bg-[#FFE3F0] text-[#B5007E]" } as const;

export function Score({ pct, label }: { pct: number | null; label?: string }) {
  if (pct === null) return <span className="text-xs font-bold text-[#9A94AD]">—</span>;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${TONE[scoreTone(pct)]}`}>
      {label ? `${label} ` : ""}
      {pct}%
    </span>
  );
}

export function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#E4DEEA]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-[#F5178C]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Stat({ n, of, label, tone }: { n: string | number; of?: number; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F5FA] px-4 py-3">
      <p className={`text-2xl font-extrabold ${tone ?? ""}`}>
        {n}
        {of !== undefined && <span className="text-sm font-bold text-[#6B6680]"> / {of}</span>}
      </p>
      <p className="text-xs font-bold text-[#6B6680]">{label}</p>
    </div>
  );
}

/** Class summary + "What to focus on next". */
export function ClassDashboard({ f, classId }: { f: ClassFocus; classId: string }) {
  const href = (id: string) => `/app/clases/${classId}/estudiante/${id}`;
  return (
    <section className={card} data-block="class-dashboard">
      <h2 className="text-lg font-extrabold">How your class is doing</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={f.active} of={f.total} label={`Active (last ${ACTIVE_DAYS} days)`} tone="text-[#0F6B3A]" />
        <Stat n={f.attention} of={f.total} label="Need attention" tone={f.attention ? "text-[#B5007E]" : ""} />
        <Stat n={f.quiz === null ? "—" : `${f.quiz}%`} label="Class quiz average" />
        <Stat n={`${f.progress.length ? Math.round(f.progress.reduce((a, p) => a + p.pct, 0) / f.progress.length) : 0}%`} label="Average progress" />
      </div>
      {f.progress.length > 1 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {f.progress.map((p) => (
            <div key={p.id}>
              <div className="flex justify-between text-xs font-extrabold">
                <span className="truncate">{p.title}</span>
                <span>{p.pct}% avg</span>
              </div>
              <div className="mt-1">
                <Bar pct={p.pct} label={p.title} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-6 text-base font-extrabold">What to focus on next</h3>
      <ul className="mt-2 space-y-3">
        {f.reachOut.length > 0 && (
          <li className="rounded-2xl border border-[#FFD0E6] bg-[#FFF7FB] p-3">
            <p className="text-sm font-extrabold">📣 Reach out to</p>
            <p className="text-xs font-semibold text-[#6B6680]">No activity for {ACTIVE_DAYS}+ days. A quick message usually brings them back.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {f.reachOut.map((s) => (
                <li key={s.id}>
                  <Link href={href(s.id)} className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm hover:underline ${focus}`}>
                    {s.name} <StatusChip status={s.status} days={s.daysAway} />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
        {f.review.length > 0 && (
          <li className="rounded-2xl border border-[#FFE7A8] bg-[#FFFBEF] p-3">
            <p className="text-sm font-extrabold">📚 Review in class</p>
            <p className="text-xs font-semibold text-[#6B6680]">The class quiz average is under {REVIEW_BELOW}% here.</p>
            <ul className="mt-2 space-y-1">
              {f.review.map((r) => (
                <li key={r.course + r.unit} className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {r.unit} <span className="text-xs font-semibold text-[#6B6680]">· {r.course} · {r.students} students</span> <Score pct={r.pct} label="avg" />
                </li>
              ))}
            </ul>
          </li>
        )}
        {f.mostOn.length > 0 && (
          <li className="rounded-2xl border border-[#E4DEEA] bg-[#F7F5FA] p-3">
            <p className="text-sm font-extrabold">🎯 Most of the class is on</p>
            <p className="text-xs font-semibold text-[#6B6680]">A good topic for your next live class.</p>
            <ul className="mt-2 space-y-1">
              {f.mostOn.map((m) => (
                <li key={m.course} className="text-sm font-bold">
                  {m.unit} <span className="text-xs font-semibold text-[#6B6680]">· {m.course} · {m.students} active {m.students === 1 ? "student" : "students"}</span>
                </li>
              ))}
            </ul>
          </li>
        )}
        {f.shining.length > 0 && (
          <li className="rounded-2xl border border-[#BFEBD2] bg-[#F3FBF6] p-3">
            <p className="text-sm font-extrabold">🌟 Doing great</p>
            <p className="text-xs font-semibold text-[#6B6680]">Worth a shout-out in class.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {f.shining.map(({ student, why }) => (
                <li key={student.id}>
                  <Link href={href(student.id)} className={`inline-block rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm hover:underline ${focus}`}>
                    {student.name} <span className="text-xs font-semibold text-[#6B6680]">· {why}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
        {!f.reachOut.length && !f.review.length && !f.shining.length && (
          <li className="text-sm font-semibold text-[#6B6680]">Nothing urgent. Your class is on track.</li>
        )}
      </ul>
      <p className="mt-4 text-xs font-semibold text-[#9A94AD]">
        Active: activity in the last {ACTIVE_DAYS} days · Slowing down: {ACTIVE_DAYS}–{INACTIVE_DAYS} days · Inactive: {INACTIVE_DAYS}+ days · Need
        attention: inactive or a quiz average under {ATTENTION_QUIZ_BELOW}%.
      </p>
    </section>
  );
}

/** The student list: tap a student for their page. */
export function Roster({ students, classId }: { students: StudentInsight[]; classId: string }) {
  return (
    <section className={card} data-block="roster">
      <h2 className="text-lg font-extrabold">Your students</h2>
      <p className="text-sm font-semibold text-[#6B6680]">Tap a student to see their scores and progress.</p>
      {students.length ? (
        <ul className="mt-3 divide-y divide-[#F1EDF5]">
          {students.map((s) => (
            <li key={s.id}>
              <Link href={`/app/clases/${classId}/estudiante/${s.id}`} className={`block rounded-2xl px-2 py-3 hover:bg-[#F7F5FA] ${focus}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-extrabold">
                    {s.name} <StatusChip status={s.status} days={s.daysAway} />
                  </p>
                  <p className="flex items-center gap-2 text-xs font-bold text-[#6B6680]">
                    {s.streak > 0 && <span>🔥 {s.streak}-day streak</span>}
                    <span>Last active: {s.last ? fmtDate(s.last) : "—"}</span>
                    <Score pct={s.quiz} label="Quizzes" />
                  </p>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {s.courses.map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between gap-2 text-xs font-extrabold">
                        <span className="truncate">{c.title}</span>
                        <span>{c.pct}%</span>
                      </div>
                      <div className="mt-1">
                        <Bar pct={c.pct} label={`${s.name} · ${c.title}`} />
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#6B6680]">{c.at ? `On: ${c.at.unit}` : "Not started"}</p>
                    </div>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-semibold text-[#6B6680]">No students in this class yet.</p>
      )}
    </section>
  );
}
