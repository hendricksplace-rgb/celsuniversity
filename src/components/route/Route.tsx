// CelsGLOBAL route page: hero, the 5 stages on a timeline (never locked), and the bottom row.
// Its own look: ivory background, night blue, gold and teal, Source Serif 4 titles.
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { RouteData, Stage } from "@/lib/route";

type T = Dictionary["route"];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

const K = { ivory: "#F4F1EA", night: "#14182B", muted: "#3A4258", gold: "#C7A24E", goldLight: "#EBD08C", teal: "#2E6F86" };
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6F86]";

function Hero({ t, data }: { t: T; data: RouteData }) {
  const pct = data.modulesTotal ? Math.round((data.modulesDone / data.modulesTotal) * 100) : 0;
  return (
    <section
      className="relative overflow-hidden rounded-[24px] p-6 text-white sm:p-8"
      style={{ background: `linear-gradient(135deg, ${K.night} 0%, #1E2A48 55%, ${K.teal} 100%)` }}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(235,208,140,.35)" }} />
      <p className="relative text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: K.goldLight }}>
        {t.kicker}
      </p>
      {data.enrolled ? (
        <div className="relative">
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{data.name ? fill(t.hello, { name: data.name }) : t.helloAnon}</h1>
          <p className="mt-2 text-sm font-semibold text-white/80 sm:text-base">
            {data.focus ? fill(t.week, { course: data.focus.title, module: data.focus.currentModule }) : t.weekNone}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              [data.inProgress, t.statStages],
              [data.modulesDone, t.statModules],
              [data.xp, t.statXp],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-2xl bg-white/10 p-3 sm:p-4">
                <dt className="sr-only">{l}</dt>
                <dd>
                  <b className="block font-serif text-2xl sm:text-3xl" style={{ color: K.goldLight }}>
                    {v}
                  </b>
                  <span className="text-[11px] font-bold leading-tight text-white/75 sm:text-xs">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${K.gold}, ${K.goldLight})` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-white/80">{fill(t.overall, { done: data.modulesDone, total: data.modulesTotal, pct })}</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{t.pitchTitle}</h1>
          {data.description && <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/80 sm:text-base">{data.description}</p>}
          <Link href="/comprar/celsglobal" className={`mt-5 inline-flex rounded-full px-6 py-3.5 text-base font-extrabold ${focus}`} style={{ background: K.goldLight, color: K.night }}>
            {t.start} →
          </Link>
          <p className="mt-3 text-xs font-bold text-white/75">{t.pitchNote}</p>
        </div>
      )}
    </section>
  );
}

const CHIP: Record<Stage["state"], { bg: string; fg: string } | null> = {
  progress: { bg: "#FBF3DD", fg: "#7A5A0E" },
  done: { bg: "#E3F0F3", fg: "#1F5566" },
  assigned: { bg: K.night, fg: "#FFFFFF" },
  available: { bg: "#E5F3E2", fg: "#2E6B2A" },
  preview: null,
};

function StageCard({ t, s, last }: { t: T; s: Stage; last: boolean }) {
  const node =
    s.state === "progress"
      ? { background: K.gold, color: K.night, border: `2px solid ${K.gold}` }
      : s.state === "done"
        ? { background: K.teal, color: "#fff", border: `2px solid ${K.teal}` }
        : s.state === "assigned"
          ? { background: K.night, color: "#fff", border: `2px solid ${K.night}` }
          : { background: K.ivory, color: K.muted, border: `2px solid #B9B3A4` };
  const border = s.state === "progress" ? `2px solid ${K.gold}` : s.state === "assigned" ? `2px solid ${K.night}` : "2px solid transparent";
  const chip = CHIP[s.state];
  const extra = t.extraTags[s.n - 1];
  const button =
    s.state === "progress"
      ? { background: `linear-gradient(90deg, ${K.gold}, ${K.goldLight})`, color: K.night }
      : s.state === "assigned"
        ? { background: K.night, color: "#fff" }
        : { background: "#EFEBE1", color: K.night };
  return (
    <li className="relative flex gap-3 sm:gap-5">
      {/* timeline */}
      <div className="flex flex-col items-center">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={node} aria-hidden>
          {s.state === "done" ? "✓" : s.n}
        </span>
        {!last && <span className="mt-1 w-0 flex-1 border-l-2 border-dashed" style={{ borderColor: "#C9C2B1" }} />}
      </div>
      <article className="mb-5 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-sm md:flex-row md:gap-5 md:p-4" style={{ border }}>
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-[#E9E4D8] md:w-[280px] md:rounded-[14px]">
          {s.cover && <Image src={s.cover} alt="" fill sizes="(min-width: 768px) 280px, 100vw" className="object-cover" />}
          {s.assignment && (
            <span className="absolute bottom-2.5 left-2.5 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ background: K.night }}>
              {t.assignedBadge}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: s.color }}>
            {fill(t.stage, { n: s.n })} · {t.kickers[s.n - 1]}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-snug sm:text-2xl" style={{ color: K.night }}>
            {s.title}
          </h3>
          {s.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed" style={{ color: K.muted }}>
              {s.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-[#F4F1EA] px-2.5 py-1" style={{ color: K.muted }}>
              {fill(t.modules, { n: s.modules })}
            </span>
            {extra && (
              <span className="rounded-full bg-[#F4F1EA] px-2.5 py-1" style={{ color: K.muted }}>
                {extra}
              </span>
            )}
            {chip && s.state !== "preview" && (
              <span className="rounded-full px-2.5 py-1 font-extrabold" style={{ background: chip.bg, color: chip.fg }}>
                {t.chip[s.state as keyof T["chip"]]}
              </span>
            )}
          </div>
          {s.assignment && (
            <p className="mt-3 rounded-xl border px-3 py-2 text-sm font-semibold" style={{ background: "#FBF3DD", borderColor: K.goldLight, color: "#5C4A12" }}>
              {s.assignment.note ? fill(t.assignedNote, { note: s.assignment.note }) : t.assignedNoNote}
              {s.assignment.dueAt && (
                <span className="mt-0.5 block text-xs font-bold opacity-80">
                  {fill(t.due, { date: new Date(s.assignment.dueAt).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) })}
                </span>
              )}
            </p>
          )}
          {s.state !== "preview" && s.modules > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-bold" style={{ color: K.muted }}>
                <span>{fill(t.moduleOf, { x: Math.min(s.currentModule, s.modules), y: s.modules })}</span>
                <span>{s.pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EFEBE1]">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${K.gold}, ${K.goldLight})` }} />
              </div>
            </div>
          )}
          <div className="mt-4 md:mt-auto md:pt-4">
            <Link href={s.href} className={`inline-flex w-full justify-center rounded-full px-5 py-3 text-sm font-extrabold sm:w-auto ${focus}`} style={button}>
              {t.button[s.state]} →
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

export function RoutePage({ t, data }: { t: T; data: RouteData }) {
  const resume = data.stages.find((s) => s.n === 2);
  const interview = data.stages.find((s) => s.n === 3);
  return (
    <div className="relative z-[1] font-[family-name:var(--font-jakarta)]" style={{ color: K.night }}>
      {/* CelsGLOBAL paints its own ivory page under the shell's bars */}
      <div className="fixed inset-0 -z-[1]" style={{ background: K.ivory }} aria-hidden />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/app" aria-label={t.back} className={`grid h-10 w-10 place-items-center rounded-full bg-white text-xl font-bold shadow-sm ${focus}`}>
          ‹
        </Link>
        <Image src="/brand/celsglobal.png" alt="CelsGLOBAL" width={170} height={38} />
      </div>

      <Hero t={t} data={data} />

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-semibold">{t.stagesTitle}</h2>
          <p className="text-sm font-bold" style={{ color: K.muted }}>
            {t.stagesHint}
          </p>
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-extrabold" style={{ background: "#E3F0F3", color: K.teal }} aria-hidden>
            ⇄
          </span>
          <p className="text-sm leading-relaxed" style={{ color: K.muted }}>
            <b style={{ color: K.night }}>{t.freeTitle}</b> {t.freeText}
          </p>
        </div>
        <ol className="mt-5">
          {data.stages.map((s, i) => (
            <StageCard key={s.courseId} t={t} s={s} last={i === data.stages.length - 1} />
          ))}
        </ol>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { title: t.resumeTitle, text: t.resumeText, stage: resume, href: "/app/herramientas/resume", icon: "/ai/icon-resume-review.svg" },
          { title: t.interviewTitle, text: t.interviewText, stage: interview, href: "/app/herramientas/entrevista", icon: "/ai/icon-interview-practice.svg" },
        ].map((c) => (
          <Link key={c.title} href={c.href} className={`group overflow-hidden rounded-[20px] bg-white shadow-sm ${focus}`}>
            <div className="relative aspect-video bg-[#E9E4D8]">
              {c.stage?.cover && <Image src={c.stage.cover} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none" />}
              <Image src={c.icon} alt="" width={52} height={52} className="absolute bottom-3 left-3 drop-shadow-md" />
            </div>
            <div className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: K.teal }}>
                {t.aiKicker}
              </p>
              <h3 className="mt-0.5 font-serif text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm" style={{ color: K.muted }}>
                {c.text}
              </p>
            </div>
          </Link>
        ))}
        <div className="flex flex-col justify-end rounded-[20px] p-5 text-white" style={{ background: K.night }}>
          <span className="font-serif text-4xl" style={{ color: K.goldLight }} aria-hidden>
            6
          </span>
          <h3 className="mt-2 font-serif text-lg font-semibold">{t.paceTitle}</h3>
          <p className="mt-1 text-sm text-white/80">{t.paceText}</p>
        </div>
      </section>
    </div>
  );
}
