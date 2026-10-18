import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CivicsExam } from "@/lib/civics";

// Used by both the server start screen and the client exam screens (no hooks, no "use client").

export type CivicsT = Dictionary["civics"];

export const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export function Rules({ exam, t }: { exam: Pick<CivicsExam, "kind" | "count" | "pass">; t: CivicsT }) {
  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="cx-serif text-base font-semibold text-[var(--cx-navy)]">{t.rules}</p>
        <span className="cx-chip">{fill(t.ruleChip, { count: exam.count, pass: exam.pass })}</span>
      </div>
      {exam.kind === "6520" && <p>{t.rules6520}</p>}
      {exam.kind === "interview" && <p>{t.rulesInterview}</p>}
      <p className="t-muted">{fill(t.rulesExam, { count: exam.count, pass: exam.pass, fail: exam.count - exam.pass + 1 })}</p>
    </div>
  );
}
