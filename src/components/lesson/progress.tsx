"use client";

// Lesson completion tracking. Each visible content block is a part of the lesson:
//   "seen"     text, images, audio, files, e-books: done after ~2 s on screen
//   "video"    YouTube: done at 90 % watched or at the end (the player's postMessage events)
//   "activity" flashcards, quizzes, grammar, flipbooks: done when the student reaches the end
// The lesson is finished when every part is done, or when the student taps "Marcar como terminada".
// Everything is written by public.record_lesson_progress (progress row, XP once, daily streak).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { afterPartFinished } from "@/app/app/cursos/[slug]/episodio/[n]/terminado/actions";
import type { UsRole } from "@/lib/course-page";

export type PartKind = "seen" | "video" | "activity";
type Strings = { parts: string; finish: string; finished: string; xp: string };
type CelsusStrings = {
  partDone: string;
  progress: string;
  next: string;
  complete: string;
  seeCompletion: string;
  back: string;
  roles: Record<UsRole, string>;
};
/** A CelsUS episode part (video, audio, class): when finished, the episode's completion flow takes over. */
type Celsus = { courseSlug: string; n: number; t: CelsusStrings } | null;
type After = Awaited<ReturnType<typeof afterPartFinished>>;
const fillIn = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

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
  celsus = null,
  children,
}: {
  lessonId: string;
  partIds: string[];
  initialParts: Record<string, unknown>;
  initialStatus: string | null;
  t: Strings;
  celsus?: Celsus;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [after, setAfter] = useState<After | null>(null);
  const tapped = useRef(false);
  const usRef = useRef(celsus);
  usRef.current = celsus;
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
      // CelsUS: where to go next — the completion screen when this was the last part missing.
      const us = usRef.current;
      if (finish && us) {
        const a = await afterPartFinished(us.courseSlug, us.n).catch(() => null);
        if (a?.complete && tapped.current) router.push(a.href);
        else if (a) setAfter(a);
      }
    },
    [lessonId, router],
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
          <button
            type="button"
            className="t-btn"
            onClick={() => {
              tapped.current = true;
              void finish();
            }}
          >
            {t.finish}
          </button>
        )}
      </div>
      {celsus && after && (
        <div className="t-card t-card-accent space-y-3" role="status" aria-live="polite">
          <p className="text-xl font-bold">{after.complete ? fillIn(celsus.t.complete, { ep: celsus.n }) : celsus.t.partDone}</p>
          {!after.complete && <p className="text-base">{fillIn(celsus.t.progress, { n: after.done, total: after.total, ep: celsus.n })}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            {after.complete ? (
              <Link href={after.href} className="t-btn min-h-[56px] justify-center text-lg">
                {celsus.t.seeCompletion}
              </Link>
            ) : (
              after.next && (
                <Link href={after.next.href} className="t-btn min-h-[56px] justify-center text-lg">
                  {fillIn(celsus.t.next, { part: celsus.t.roles[after.next.role] })}
                </Link>
              )
            )}
            {!after.complete && (
              <Link href={after.href} className="t-btn-ghost min-h-[56px] justify-center text-lg">
                {celsus.t.back}
              </Link>
            )}
          </div>
        </div>
      )}
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
  useYouTubeWatched(ref, kind === "video" && !already, done, id);

  return (
    <div ref={ref}>
      <PartCtx.Provider value={kind === "activity" ? done : null}>{children}</PartCtx.Provider>
    </div>
  );
}

/** Calls `onDone` when the YouTube iframe inside `ref` reaches 90 % or ends (needs enablejsapi=1). */
export function useYouTubeWatched(ref: React.RefObject<HTMLElement | null>, active: boolean, onDone: () => void, id: string) {
  useEffect(() => {
    if (!active || !ref.current) return;
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
        if (ended || watched) onDone();
      } catch {
        /* not a player message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      frame.removeEventListener("load", listen);
      window.removeEventListener("message", onMessage);
    };
  }, [ref, active, onDone, id]);
}
