"use client";

// Resume Review (board "App — IA CelsGLOBAL", phones 1–4): submit → 48 h waiting screen → result → optimized
// resume. CelsGLOBAL look: ivory, night, gold and teal, serif titles.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { RESUME_HOLD_HOURS, levelKey, resumeHeader, resumeText, type OptimizedResume, type ResumeReview } from "@/lib/ai-tools";
import { fill } from "@/components/course/kit";
import { HANDOFF_KEY } from "@/lib/guided";

type T = Dictionary["ai"];
const GOLD = "linear-gradient(180deg, #EBD08C 0%, #C7A24E 100%)";
// Students are in Mexico: same dates on the server render and in the browser.
const TZ = "America/Mexico_City";

export function AiHeader({ t, icon, kicker, title, backHref }: { t: T; icon: "resume" | "interview"; kicker?: string; title: string; backHref: string }) {
  return (
    <header className="flex items-center gap-3">
      <Link href={backHref} aria-label="←" className="kit-focus grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-[0_0_0_1px_#E3DDD0]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14182B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/ai/icon-${icon === "resume" ? "resume-review" : "interview-practice"}.svg`} alt="" width={40} height={40} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2E6F86]">{kicker ?? t.kicker}</p>
        <h1 className="font-serif text-[22px] font-semibold leading-tight text-[#14182B]">{title}</h1>
      </div>
    </header>
  );
}

export const aiShell = "-mx-4 -mt-6 min-h-[calc(100dvh-7.5rem)] bg-[#F4F1EA] px-5 pb-10 pt-5 text-[#14182B] sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:rounded-[28px] md:-mt-2";
const card = "rounded-2xl bg-white p-4 shadow-[0_0_0_1px_#E3DDD0]";
const goldBtn = "kit-focus block w-full rounded-xl py-3.5 text-center font-extrabold text-[#14182B] disabled:opacity-50";
const whiteBtn = "kit-focus block w-full rounded-xl bg-white py-3.5 text-center font-extrabold text-[#14182B] shadow-[0_0_0_1px_#E3DDD0]";

function Ring({ value, max, size, children }: { value: number; max: number; size: number; children: React.ReactNode }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7E1D3" strokeWidth={size > 120 ? 12 : 7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#C7A24E"
          strokeWidth={size > 120 ? 12 : 7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value / max))}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

// ---------- 1. Submit ----------

export function ResumeForm({ t, userId, invalid }: { t: T; userId: string; invalid: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Enviar a revisión con IA" from a guided course (Mi resume, step 6): the resume text arrives through
  // sessionStorage (never the URL) and fills the paste box; nothing is sent until the student taps "Enviar".
  useEffect(() => {
    try {
      const handed = sessionStorage.getItem(HANDOFF_KEY);
      if (handed) {
        sessionStorage.removeItem(HANDOFF_KEY);
        setText(handed.slice(0, 30000));
      }
    } catch {
      /* storage blocked */
    }
  }, []);

  const pick = (f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (!/\.(pdf|docx)$/i.test(f.name)) return setError(t.badType);
    if (f.size > 5 * 1024 * 1024) return setError(t.tooBig);
    setFile(f);
  };
  const submit = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      let body: Record<string, string> = { action: "resume_submit" };
      if (text.trim()) body = { ...body, text: text.trim() };
      else if (file) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        const { error: up } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || undefined });
        if (up) throw new Error("upload");
        body = { ...body, file_path: path, file_name: file.name };
      }
      const { data, error: fe } = await supabase.functions.invoke("ai-tools", { body });
      if (fe) {
        const code = (await (fe as { context?: Response }).context?.json?.().catch(() => null))?.error;
        throw new Error(code ?? "failed");
      }
      router.replace(`/app/herramientas/resume?id=${(data as { id: string }).id}`);
      router.refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "no_text" ? t.noText : code === "unsupported" ? t.badType : code === "too_big" ? t.tooBig : t.failed);
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      {invalid && (
        <div className="rounded-2xl border border-[#E9B9A4] bg-[#FFF4EE] p-4" role="alert">
          <p className="font-serif text-lg font-semibold">{t.notResume}</p>
          <p className="mt-1 text-sm text-[#5B6273]">{t.notResumeText}</p>
        </div>
      )}
      <p className="text-sm leading-relaxed text-[#3A4258]">{t.resumeIntro}</p>
      <label className="kit-focus flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#C7A24E] bg-white/60 px-4 py-7 text-center focus-within:outline focus-within:outline-[3px] focus-within:outline-[#F20174]">
        <span className="grid size-12 place-items-center rounded-full bg-[#14182B] text-xl text-white" aria-hidden>
          ↑
        </span>
        <span className="font-bold">{file ? fill(t.chosen, { name: file.name }) : t.upload}</span>
        <span className="text-xs text-[#5B6273]">{t.uploadHint}</span>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="text-center text-xs text-[#5B6273]">{t.orPaste}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.pastePlaceholder}
        aria-label={t.pastePlaceholder}
        rows={5}
        className="kit-focus w-full rounded-2xl border-0 bg-white p-4 text-sm shadow-[0_0_0_1px_#E3DDD0] placeholder:text-[#8A8F9C]"
      />
      <div className={card}>
        <p className="font-bold">{t.howTitle}</p>
        <ol className="mt-2 space-y-1.5 text-sm text-[#3A4258]">
          {[t.how1, t.how2, t.how3].map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F4F1EA] text-[11px] font-extrabold text-[#2E6F86]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      {error && (
        <p className="text-sm font-semibold text-[#A3123F]" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={() => void submit()} disabled={busy || (!file && !text.trim())} className={goldBtn} style={{ background: GOLD }}>
        {busy ? t.sending : t.send}
      </button>
    </div>
  );
}

// ---------- 2. Waiting ----------

export function ResumeWaiting({ t, review, email, locale }: { t: T; review: ResumeReview; email: string; locale: string }) {
  const unlock = new Date(review.unlock_at).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, unlock - now);
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  const date = new Date(unlock).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: TZ }).replace(/\.$/, "");
  return (
    <div className="mt-6 space-y-5 text-center">
      <div className="mx-auto w-fit">
        <Ring value={left} max={RESUME_HOLD_HOURS * 3600_000} size={170}>
          <span className="block font-serif text-4xl font-semibold" aria-live="polite">
            {h}:{String(m).padStart(2, "0")}
          </span>
          <span className="text-xs text-[#5B6273]">{t.hoursLeft}</span>
        </Ring>
      </div>
      <h2 className="font-serif text-2xl font-semibold">{t.waitingTitle}</h2>
      <p className="text-sm text-[#3A4258]">{fill(t.readyOn, { date, email })}</p>
      <div className={`${card} flex items-center gap-3 text-left`}>
        <span aria-hidden className="text-2xl">
          📄
        </span>
        <span>
          <span className="block font-bold">{review.file_name}</span>
          <span className="text-xs text-[#5B6273]">
            {fill(t.sentOn, { date: new Date(review.created_at).toLocaleString(locale, { weekday: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ }) })}
          </span>
        </span>
      </div>
      <div className={`${card} text-left`}>
        <p className="font-bold">{t.whileTitle}</p>
        <p className="mt-1 text-sm text-[#3A4258]">{t.whileText}</p>
      </div>
      <Link href="/app/herramientas/entrevista" className={whiteBtn}>
        {t.practice}
      </Link>
    </div>
  );
}

// ---------- 3. Result ----------

export function ResumeResultView({ t, review }: { t: T; review: ResumeReview }) {
  const r = review.result!;
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const recs = r.top_recommendations?.filter(Boolean) ?? [];
  const level = t.levels[levelKey(r.readiness_level) as keyof T["levels"]];
  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center gap-4 rounded-2xl p-4 text-white" style={{ background: "linear-gradient(120deg, #14182B 0%, #22305A 60%, #2E6F86 100%)" }}>
        <Ring value={r.total_score ?? 0} max={30} size={76}>
          <span className="block font-serif text-2xl font-semibold leading-none">{r.total_score}</span>
          <span className="text-[10px] text-white/75">{t.of30}</span>
        </Ring>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#EBD08C]">{level}</p>
          <p className="mt-1 text-sm leading-snug text-white/90">{r.overview}</p>
        </div>
      </div>

      <ul className={`${card} space-y-3`}>
        {(r.categories ?? []).map((c, i) => (
          <li key={c.name}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="kit-focus w-full rounded-lg text-left">
              <span className="flex justify-between text-sm">
                <span>{t.cats[c.name as keyof T["cats"]] ?? c.name}</span>
                <strong>{c.score}/5</strong>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#ECE6DA]">
                <span className="block h-full rounded-full" style={{ width: `${(c.score / 5) * 100}%`, background: c.score >= 4 ? "#C7A24E" : "#2E6F86" }} />
              </span>
            </button>
            {open === i && (
              <div className="mt-2 space-y-1.5 rounded-xl bg-[#F8F5EE] p-3 text-[13px] leading-relaxed text-[#3A4258]">
                <p>
                  <strong className="text-[#2E6F86]">{t.strengths}:</strong> {c.strengths}
                </p>
                <p>
                  <strong className="text-[#9A6B10]">{t.recommendation}:</strong> {c.recommendation}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {recs.length > 0 && (
        <div className={card}>
          <p className="font-bold">{t.firstChange}</p>
          <ol className="mt-2 space-y-2 text-sm text-[#3A4258]">
            {(all ? recs : recs.slice(0, 3)).map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-extrabold text-[#C7A24E]">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {recs.length > 3 && !all && (
            <button type="button" onClick={() => setAll(true)} className="kit-focus mt-2 rounded text-sm font-bold text-[#2E6F86] underline">
              {t.seeAll}
            </button>
          )}
        </div>
      )}
      {(r.red_flags ?? []).filter(Boolean).length > 0 && (
        <div className="rounded-2xl border border-[#E9B9A4] bg-[#FFF8F4] p-4">
          <p className="font-bold text-[#A3123F]">{t.redFlags}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-[#3A4258]">
            {r.red_flags!.filter(Boolean).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      <Link href={`/app/herramientas/resume?id=${review.id}&vista=optimizado`} className={goldBtn} style={{ background: GOLD }}>
        {t.seeOptimized}
      </Link>
    </div>
  );
}

// ---------- 4. Optimized resume ----------

async function downloadDocx(header: { name: string; contact: string }, r: OptimizedResume, fileName: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const h = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        children: [
          ...(header.name ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: header.name.toUpperCase(), bold: true, size: 32 })] })] : []),
          ...(header.contact ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: header.contact, size: 18 })] })] : []),
          h("Professional Summary"),
          new Paragraph(r.summary),
          h("Experience"),
          ...r.experience.flatMap((e) => [
            new Paragraph({ children: [new TextRun({ text: e.title, bold: true }), new TextRun(` · ${e.company} · ${e.dates}`)], spacing: { before: 120 } }),
            ...e.bullets.map((b) => new Paragraph({ text: b, bullet: { level: 0 } })),
          ]),
          h("Education"),
          ...r.education.map((e) => new Paragraph({ children: [new TextRun({ text: e.credential, bold: true }), new TextRun(` · ${e.institution} · ${e.dates}`)] })),
          h("Skills"),
          new Paragraph(r.skills.join(" · ")),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a); // some browsers ignore the name of a detached link
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function OptimizedResumeView({ t, review }: { t: T; review: ResumeReview }) {
  const r = review.result!.optimized_resume!;
  const header = useMemo(() => resumeHeader(review.original_text), [review.original_text]);
  const [copied, setCopied] = useState(false);
  const sec = "mt-4 border-b border-[#D9D2C2] pb-1 font-serif text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2E6F86]";
  const fileName = `${(header.name || "Resume").replace(/\s+/g, "_")}_Resume.docx`;
  return (
    <div className="mt-5 space-y-4">
      <article className="rounded-xl bg-white p-5 font-serif text-[14px] leading-relaxed text-[#14182B] shadow-[0_8px_30px_-18px_rgba(20,24,43,.45)]">
        {header.name && <h2 className="text-center text-xl font-semibold tracking-wide">{header.name.toUpperCase()}</h2>}
        {header.contact && <p className="text-center text-xs text-[#5B6273]">{header.contact}</p>}
        <h3 className={sec}>Professional Summary</h3>
        <p className="mt-2">{r.summary}</p>
        <h3 className={sec}>Experience</h3>
        {r.experience.map((e, i) => (
          <div key={i} className="mt-2">
            <p>
              <strong>{e.title}</strong> · {e.company} · <span className="text-[#5B6273]">{e.dates}</span>
            </p>
            <ul className="list-disc pl-5">
              {e.bullets.map((b, k) => (
                <li key={k}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
        <h3 className={sec}>Education</h3>
        {r.education.map((e, i) => (
          <p key={i} className="mt-2">
            <strong>{e.credential}</strong> · {e.institution} · <span className="text-[#5B6273]">{e.dates}</span>
          </p>
        ))}
        <h3 className={sec}>Skills</h3>
        <p className="mt-2">{r.skills.join(" · ")}</p>
      </article>
      {review.result?.motivational_note && <p className={`${card} text-sm italic text-[#3A4258]`}>💬 «{review.result.motivational_note}»</p>}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(resumeText(header, r)).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className={whiteBtn}
          aria-live="polite"
        >
          {copied ? `✓ ${t.copied}` : t.copy}
        </button>
        <button type="button" onClick={() => void downloadDocx(header, r, fileName)} className={goldBtn} style={{ background: GOLD }}>
          {t.docx}
        </button>
      </div>
      <Link href={`/app/herramientas/resume?id=${review.id}`} className="kit-focus block rounded text-center text-sm font-bold text-[#2E6F86] underline">
        {t.backResult}
      </Link>
    </div>
  );
}

// ---------- History ----------

export function ResumeHistory({ t, reviews, current, locale }: { t: T; reviews: ResumeReview[]; current: string | null; locale: string }) {
  const others = reviews.filter((r) => r.id !== current);
  if (!others.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#5B6273]">{t.history}</h2>
      <ul className="mt-2 space-y-2">
        {others.map((r) => {
          const locked = r.status === "ready" && new Date(r.unlock_at) > new Date();
          return (
            <li key={r.id}>
              <Link href={`/app/herramientas/resume?id=${r.id}`} className={`kit-focus flex items-center justify-between gap-3 ${card} py-3`}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{r.file_name}</span>
                  <span className="text-xs text-[#5B6273]">
                    {new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: TZ })}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-[#2E6F86]">
                  {r.status === "invalid" ? t.statusInvalid : locked ? t.statusLocked : r.result?.total_score != null ? `${r.result.total_score}/30` : t.statusReady}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
