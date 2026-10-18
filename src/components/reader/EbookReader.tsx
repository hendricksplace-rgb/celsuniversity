"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Answers, Ebook } from "@/lib/ebook-format";
import { answerKey, quizKey } from "@/lib/ebook-format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ReaderBlock } from "./ReaderBlocks";
import { SignedUrls, useMediaSrc } from "./media";
import {
  clearLocal,
  downloadBook,
  keepLocal,
  offlineSupported,
  readLocal,
  readManifest,
  removeBook,
} from "@/lib/offline";

type Props = {
  ebook: Ebook;
  userId: string;
  initial: { answers: Answers; last_screen: string | null; completed_at: string | null; updated_at?: string } | null;
  /** Module whose offline_downloads row tracks this book's download (null: download not offered) */
  moduleId: string | null;
  /** storage:// ref → short-lived signed URL (narration audio, original PDF) */
  signed: Record<string, string>;
  resourceTitles: Record<string, string>;
  t: Dictionary["reader"];
};

type SaveState = "idle" | "saving" | "saved" | "error" | "queued";

// Steps: one per screen, then the quiz (if any), then the finish page.
export function EbookReader({ ebook, userId, initial, moduleId, signed, resourceTitles, t }: Props) {
  const screens = ebook.screens;
  const hasQuiz = ebook.quiz.length > 0;
  const quizStep = screens.length;
  const doneStep = screens.length + (hasQuiz ? 1 : 0);

  const startIndex = Math.max(0, screens.findIndex((s) => s.id === initial?.last_screen));
  const [step, setStep] = useState(initial?.completed_at ? 0 : startIndex);
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [completedAt, setCompletedAt] = useState<string | null>(initial?.completed_at ?? null);
  const [save, setSave] = useState<SaveState>("idle");
  const [showScript, setShowScript] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useRef(createClient());
  const top = useRef<HTMLDivElement>(null);

  const persist = useCallback(
    async (row: { answers: Answers; last_screen: string | null; completed_at: string | null }) => {
      setSave("saving");
      const full = { user_id: userId, ebook_id: ebook.id, ...row };
      // A local copy first: if we're offline it is sent by OfflineSync when the connection returns.
      keepLocal({ ...full, savedAt: new Date().toISOString() });
      const { error } = await supabase.current.from("ebook_answers").upsert(full, { onConflict: "user_id,ebook_id" });
      if (!error) clearLocal(ebook.id);
      setSave(error ? (navigator.onLine ? "error" : "queued") : "saved");
    },
    [ebook.id, userId],
  );

  // A copy written offline (and not yet sent) is newer than what the server or a downloaded page holds.
  useEffect(() => {
    const local = readLocal(ebook.id);
    if (!local || local.user_id !== userId) return;
    if (initial?.updated_at && new Date(local.savedAt) <= new Date(initial.updated_at)) return clearLocal(ebook.id);
    setAnswers((local.answers as Answers) ?? {});
    setCompletedAt(local.completed_at);
    const i = screens.findIndex((s) => s.id === local.last_screen);
    if (i >= 0) setStep(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Offline state and this book's download.
  const [online, setOnline] = useState(true);
  const [offline, setOffline] = useState<{ state: "none" | "busy" | "ready" | "error"; until?: string }>({ state: "none" });
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (offlineSupported())
      readManifest().then((m) => {
        const b = m.books[ebook.slug];
        if (b) setOffline({ state: "ready", until: b.expiresAt });
      });
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [ebook.slug]);

  // Text and audio only: the original PDF is left out on purpose.
  const audioUrls = Object.entries(signed)
    .filter(([ref]) => /\.(m4a|mp4|mp3|aac|ogg|wav)$/i.test(ref))
    .map(([, url]) => url);

  const download = async () => {
    if (!moduleId) return;
    setOffline({ state: "busy" });
    try {
      const b = await downloadBook(supabase.current, { slug: ebook.slug, ebookId: ebook.id, moduleId, userId, audio: audioUrls });
      setOffline({ state: "ready", until: b.expiresAt });
    } catch {
      setOffline({ state: "error" });
    }
  };
  const remove = async () => {
    await removeBook(supabase.current, ebook.slug);
    setOffline({ state: "none" });
  };

  const screenIdAt = (n: number) => screens[Math.min(n, screens.length - 1)]?.id ?? null;
  // Save shortly after the student stops typing or moves on. Values are passed in, never read from a stale render.
  const schedule = (row: { answers: Answers; last_screen: string | null; completed_at: string | null }) => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => persist(row), 800);
  };

  useEffect(() => () => void (pending.current && clearTimeout(pending.current)), []);

  const setAnswer = (key: string, value: unknown) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    schedule({ answers: next, last_screen: screenIdAt(step), completed_at: completedAt });
  };

  const go = (n: number) => {
    setStep(n);
    setShowScript(false);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const done = completedAt ?? (n === doneStep ? new Date().toISOString() : null);
    if (done !== completedAt) setCompletedAt(done);
    schedule({ answers, last_screen: screenIdAt(n), completed_at: done });
  };

  const total = doneStep;
  const progress = Math.round((Math.min(step, total) / total) * 100);
  const screen = step < screens.length ? screens[step] : null;
  const pdfUrl = ebook.pdf_path ? signed[ebook.pdf_path] : undefined;
  const audio = useMediaSrc(screen?.narration?.audio ? signed[screen.narration.audio] : undefined);

  return (
    <SignedUrls.Provider value={signed}>
    {!online && <p className="t-card mb-4 text-sm">📵 {t.offlineBanner}</p>}
    <div ref={top} className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Contents */}
      <nav aria-label={t.contents} className="t-card space-y-1 self-start">
        <p className="t-muted mb-2 text-xs font-semibold uppercase tracking-wide">{t.contents}</p>
        {screens.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            aria-current={step === i ? "step" : undefined}
            className={`block w-full rounded-[var(--t-radius)] px-2 py-1.5 text-left text-sm ${step === i ? "bg-[var(--t-accent)] text-[var(--t-accent-ink)]" : "hover:bg-[var(--t-border)]"}`}
          >
            <span className={`mr-1 text-xs ${step === i ? "" : "t-muted"}`}>{i + 1}.</span> {s.kicker ?? s.title}
          </button>
        ))}
        {hasQuiz && (
          <button
            onClick={() => go(quizStep)}
            className={`block w-full rounded-[var(--t-radius)] px-2 py-1.5 text-left text-sm ${step === quizStep ? "bg-[var(--t-accent)] text-[var(--t-accent-ink)]" : "hover:bg-[var(--t-border)]"}`}
          >
            ✔︎ {t.quiz}
          </button>
        )}
        <div className="pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--t-border)]">
            <div className="h-full bg-[var(--t-accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="t-muted mt-1 text-xs" aria-live="polite">
            {save === "saving"
              ? t.saving
              : save === "saved"
                ? `✓ ${t.saved}`
                : save === "queued"
                  ? `⏳ ${t.savedLocally}`
                  : save === "error"
                    ? t.saveError
                    : `${progress}%`}
          </p>
        </div>
        {moduleId && offlineSupported() && (
          <div className="space-y-2 border-t border-[var(--t-border)] pt-3 text-xs">
            {offline.state === "ready" ? (
              <>
                <p>
                  ✅ {t.offlineReady}{" "}
                  {offline.until && new Date(offline.until).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </p>
                <button onClick={remove} className="t-link">
                  {t.offlineRemove}
                </button>
              </>
            ) : (
              <button onClick={download} disabled={offline.state === "busy" || !online} className="t-btn-ghost w-full !text-xs">
                {offline.state === "busy" ? t.offlineBusy : `⬇ ${t.offlineDownload}`}
              </button>
            )}
            {offline.state === "error" && <p className="text-red-600">{t.offlineError}</p>}
            <p className="t-muted">{t.offlineNote}</p>
          </div>
        )}
      </nav>

      <article className="min-w-0 space-y-6">
        {screen && (
          <>
            <header className="space-y-1">
              <p className="t-muted text-xs font-semibold uppercase tracking-wide">
                {t.screen} {step + 1} {t.of} {screens.length}
                {screen.kicker && ` · ${screen.kicker}`}
                {screen.minutes ? ` · ${screen.minutes} ${t.minutes}` : ""}
              </p>
              <h2 className="t-heading text-2xl">{screen.title}</h2>
            </header>

            {(audio || screen.narration?.script) && (
              <Narration
                key={screen.id}
                src={audio}
                script={screen.narration?.script}
                wt={screen.narration?.wt}
                showScript={showScript}
                toggle={() => setShowScript((v) => !v)}
                t={t}
              />
            )}

            <div className="space-y-6">
              {screen.blocks.map((b, i) => (
                <ReaderBlock
                  key={i}
                  block={b}
                  value={answers[answerKey(screen.id, i)]}
                  onChange={(v) => setAnswer(answerKey(screen.id, i), v)}
                  t={t}
                />
              ))}
            </div>
          </>
        )}

        {step === quizStep && hasQuiz && (
          <Quiz ebook={ebook} answers={answers} setAnswer={setAnswer} goTo={go} t={t} />
        )}

        {step === doneStep && (
          <section className="space-y-5 text-center">
            <p className="text-5xl" aria-hidden>🎉</p>
            <h2 className="t-heading text-2xl">{t.done}</h2>
            <p className="t-muted">{t.doneSub}</p>
            {hasQuiz && (
              <p className="t-badge">
                {t.score}: {ebook.quiz.filter((q, n) => answers[quizKey(n)] === q.answer).length} / {ebook.quiz.length}
              </p>
            )}
            {ebook.resources.length > 0 && (
              <div className="t-card mx-auto max-w-md space-y-2 text-left">
                <p className="t-heading">{t.resources}</p>
                {ebook.resources.map((r) => (
                  <Link key={r.ebook} href={`/app/libros/${r.ebook}`} className="t-link block">
                    📘 {resourceTitles[r.ebook] ?? r.title}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener" className="t-btn-ghost">
                  📄 {t.downloadPdf}
                </a>
              )}
              <button onClick={() => go(0)} className="t-btn-ghost">
                ↺ {t.restart}
              </button>
            </div>
          </section>
        )}

        {step < doneStep && (
          <nav className="flex flex-wrap justify-between gap-3 border-t border-[var(--t-border)] pt-5">
            {step > 0 ? (
              <button onClick={() => go(step - 1)} className="t-btn-ghost">
                ← {t.prev}
              </button>
            ) : (
              <span />
            )}
            <button onClick={() => go(step + 1)} className="t-btn">
              {step === screens.length - 1 && hasQuiz ? t.toQuiz : step === doneStep - 1 ? t.finish : t.next} →
            </button>
          </nav>
        )}
      </article>
    </div>
    </SignedUrls.Provider>
  );
}

/** Narration player. With word timings (wt) the script highlights each word as it is spoken. */
function Narration({
  src,
  script,
  wt,
  showScript,
  toggle,
  t,
}: {
  src?: string;
  script?: string;
  wt?: number[];
  showScript: boolean;
  toggle: () => void;
  t: Dictionary["reader"];
}) {
  const [time, setTime] = useState(-1);
  const words = script ? script.split(/\s+/).filter(Boolean) : [];
  const timed = Boolean(wt && wt.length === words.length);
  let current = -1;
  if (timed && time >= 0) for (let i = 0; i < wt!.length && wt![i] <= time; i++) current = i;
  const visible = showScript || (timed && time >= 0);
  return (
    <div className="t-card flex flex-wrap items-center gap-3 !py-3">
      {src && (
        <audio
          controls
          preload="none"
          src={src}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={() => setTime(-1)}
          className="h-9 max-w-full flex-1"
          aria-label={t.listen}
        />
      )}
      {script && (
        <button onClick={toggle} className="t-btn-ghost text-xs">
          {showScript ? t.hideScript : t.script}
        </button>
      )}
      {visible && script && (
        <p className="w-full text-sm leading-relaxed">
          {timed
            ? words.map((w, i) => (
                <span key={i} className={i === current ? "rounded bg-[var(--t-accent)] px-0.5 text-[var(--t-accent-ink)]" : i < current ? "" : "t-muted"}>
                  {w}{" "}
                </span>
              ))
            : <span className="t-muted">{script}</span>}
        </p>
      )}
    </div>
  );
}

function Quiz({
  ebook,
  answers,
  setAnswer,
  goTo,
  t,
}: {
  ebook: Ebook;
  answers: Answers;
  setAnswer: (k: string, v: unknown) => void;
  goTo: (n: number) => void;
  t: Dictionary["reader"];
}) {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="t-heading text-2xl">{t.quiz}</h2>
        <p className="t-muted">{t.quizIntro}</p>
      </header>
      {ebook.quiz.map((q, n) => {
        const picked = answers[quizKey(n)] as number | undefined;
        const answered = typeof picked === "number";
        const screenIndex = ebook.screens.findIndex((s) => s.id === q.screen);
        return (
          <fieldset key={n} className="t-card space-y-3">
            <legend className="sr-only">{q.q}</legend>
            <p className="font-semibold">
              {n + 1}. {q.q}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const state = !answered ? "" : i === q.answer ? "t-opt-correct" : i === picked ? "t-opt-wrong" : "t-opt-dim";
                return (
                  <button
                    key={i}
                    onClick={() => !answered && setAnswer(quizKey(n), i)}
                    disabled={answered}
                    className={`t-btn-ghost !justify-start text-left ${state}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className="text-sm" aria-live="polite">
                <p className="font-semibold">{picked === q.answer ? `✅ ${t.correct}` : `❌ ${t.incorrect}`}</p>
                {q.why && <p className="t-muted">{q.why}</p>}
                {picked !== q.answer && screenIndex >= 0 && (
                  <button onClick={() => goTo(screenIndex)} className="t-link mt-1">
                    {t.reviewScreen} →
                  </button>
                )}
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
