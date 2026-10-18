import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CivicsExam } from "@/lib/civics";

// Used by both the server start screen and the client exam screens (no hooks, no "use client").

export type CivicsT = Dictionary["civics"];

export const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export function Rules({ exam, t }: { exam: Pick<CivicsExam, "kind" | "count" | "pass">; t: CivicsT }) {
  return (
    <div className="t-card space-y-1 text-sm">
      <p className="font-semibold">{t.rules}</p>
      {exam.kind === "6520" && <p>{t.rules6520}</p>}
      {exam.kind === "interview" && <p>{t.rulesInterview}</p>}
      <p className="t-muted">{fill(t.rulesExam, { count: exam.count, pass: exam.pass, fail: exam.count - exam.pass + 1 })}</p>
    </div>
  );
}

