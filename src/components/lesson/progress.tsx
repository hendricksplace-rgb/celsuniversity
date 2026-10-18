"use client";

// Lesson completion tracking. Each visible content block is a part of the lesson:
//   "seen"     text, images, audio, files, e-books: done after ~2 s on screen
//   "video"    YouTube: done at 90 % watched or at the end (the player's postMessage events)
//   "activity" flashcards, quizzes, grammar, flipbooks: done when the student reaches the end
// The lesson is finished when every part is done, or when the student taps "Marcar como terminada".
// Everything is written by public.record_lesson_progress (progress row, XP once, daily streak).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PartKind = "seen" | "video" | "activity";
type Strings = { parts: string; finish: string; finished: string; xp: string };

type Ctx = { done: (id: string) => void; isDone: (id: string) => boolean };
const LessonCtx = createContext<Ctx | null>(null);
const PartCtx = createContext<(() => void) | null>(null);

/** For activities: call the returned function when the student reaches the end. No-op outside a lesson. */
export function usePartDone() {
  const done = useContext(PartCtx);
  return useCallback(() => done?.(), [done]);
}

export function LessonProgress({
  lessonId,
  partIds,
  initialParts,
  initialStatus,
  t,
  children,
}: {
  lessonId: string;
  partIds: string[];
  initialParts: Record<string, unknown>;
  initialStatus: string | null;
  t: Strings;
  children: React.ReactNode;
}) {
  const [parts, setParts] = useState<Set<string>>(() => new Set(Object.keys(initialParts ?? {}).filter((k) => partIds.includes(k))));
  const [status, setStatus] = useState(initialStatus ?? "not_started");
  const [xp, setXp] = useState(0);
  const sent = useRef(new Set(parts));
  const finishing = useRef(false);

  const call = useCallback(
    async (part: string | null, finish: boolean) => {
      const { data, error } = await createClient().rpc("record_lesson_progress", { p_lesson: lessonId, p_part: part ?? undefined, p_finish: finish });
      if (error || !data) return;
      const r = data as { status: string; xp: number };
      setStatus(r.status);
      if (r.xp) setXp(r.xp);
    },
    [lessonId],
  );

  // Opening the lesson counts as studying today (streak) and marks it "in progress".
  useEffect(() => {
    void call(null, false);
  }, [call]);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setParts(new Set(partIds));
    await call(null, true);
  }, [call, partIds]);

  const done = useCallback(
    (id: string) => {
      if (sent.current.has(id)) return;
      sent.current.add(id);
      setParts((p) => new Set(p).add(id));
      void call(id, false);
    },
    [call],
  );

  // Every part done → the lesson is finished.
  useEffect(() => {
    if (status !== "completed" && partIds.length > 0 && partIds.every((id) => parts.has(id))) void finish();
  }, [parts, partIds, status, finish]);

  const value = useMemo<Ctx>(() => ({ done, isDone: (id) => parts.has(id) }), [done, parts]);
  const completed = status === "completed";
  const count = completed ? partIds.length : partIds.filter((id) => parts.has(id)).length;

  return (
    <LessonCtx.Provider value={value}>
      {children}
      <div className="t-card flex flex-col gap-3 sm:flex-row sm:items-center" role="status" aria-live="polite">
        <div className="min-w-0 flex-1">
          {partIds.length > 0 && (
            <>
              <p className="t-muted text-sm font-semibold">{t.parts.replace("{n}", String(count)).replace("{total}", String(partIds.length))}</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--t-border)]">
                <div className="h-full rounded-full bg-[var(--t-accent)] transition-all motion-reduce:transition-none" style={{ width: `${(count / partIds.length) * 100}%` }} />
              </div>
            </>
          )}
        </div>
        {completed ? (
          <p className="font-bold">
            ✓ {t.finished}
            {xp > 0 && <span className="ml-2 text-sm">{t.xp.replace("{n}", String(xp))}</span>}
          </p>
        ) : (
          <button type="button" className="t-btn" onClick={() => void finish()}>
            {t.finish}
          </button>
        )}
      </div>
    </LessonCtx.Provider>
  );
}

/** One part of the lesson: reports itself done according to its kind. */
export function Part({ id, kind, children }: { id: string; kind: PartKind; children: React.ReactNode }) {
  const lesson = useContext(LessonCtx);
  const ref = useRef<HTMLDivElement>(null);
  const done = useCallback(() => lesson?.done(id), [lesson, id]);
  const already = lesson?.isDone(id) ?? true;

  // "seen": on screen for 2 seconds.
  useEffect(() => {
    if (kind !== "seen" || already || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) timer = setTimeout(done, 2000);
        else clearTimeout(timer);
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [kind, already, done]);

  // "video": the YouTube player reports time and state once we start listening.
  useEffect(() => {
    if (kind !== "video" || already || !ref.current) return;
    const frame = ref.current.querySelector("iframe");
    if (!frame) return;
    const listen = () => frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id }), "*");
    frame.addEventListener("load", listen);
    listen();
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || !/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      try {
        const msg = JSON.parse(String(e.data)) as { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } | number };
        const info = typeof msg.info === "object" ? msg.info : null;
        const ended = msg.event === "onStateChange" ? msg.info === 0 : info?.playerState === 0;
        const watched = info?.duration && info.currentTime ? info.currentTime / info.duration >= 0.9 : false;
        if (ended || watched) done();
      } catch {
        /* not a player message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      frame.removeEventListener("load", listen);
      window.removeEventListener("message", onMessage);
    };
  }, [kind, already, done, id]);

  return (
    <div ref={ref}>
      <PartCtx.Provider value={kind === "activity" ? done : null}>{children}</PartCtx.Provider>
    </div>
  );
}
