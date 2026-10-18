"use client";

// CelsBSNS task screen (celsu-celsbook-us-bsns-spec.md §3, phone 4). Writing and research tasks get an
// editor that saves on its own; speaking and video tasks record or upload a file. "Entregar a mi coach"
// marks the submission submitted (it shows up in the coach queue) and completes the lesson. Reading and
// "Feedback and Progress" lessons show the text and a "done" button; Feedback also lists the coach's
// comments for the week.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/components/course/kit";

type T = Dictionary["bsns"];
type Sub = { body: string; media_path: string | null; media_url: string | null; status: string; coach_feedback: string | null; submitted_at: string | null };

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function useAutosave(lessonId: string, initial: string, enabled: boolean) {
  const [body, setBody] = useState(initial);
  const [savedAt, setSavedAt] = useState<number | null>(initial ? Date.now() : null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [, tick] = useState(0);
  const last = useRef(initial);

  const save = useCallback(
    async (text: string, extra: Record<string, unknown> = {}) => {
      setState("saving");
      const { error } = await createClient()
        .from("submissions")
        .upsert({ lesson_id: lessonId, body: text, ...extra }, { onConflict: "user_id,lesson_id" });
      if (error) return setState("error"), false;
      last.current = text;
      setSavedAt(Date.now());
      setState("idle");
      return true;
    },
    [lessonId],
  );

  useEffect(() => {
    if (!enabled || body === last.current) return;
    const h = setTimeout(() => void save(body), 1500);
    return () => clearTimeout(h);
  }, [body, enabled, save]);
  useEffect(() => {
    const h = setInterval(() => tick((x) => x + 1), 5000);
    return () => clearInterval(h);
  }, []);
  return { body, setBody, save, savedAt, state, dirty: body !== last.current };
}

function Recorder({ t, video, onFile }: { t: T; video: boolean; onFile: (f: Blob, ext: string) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const canRecord = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices;
  useEffect(() => {
    if (!rec) return;
    const h = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(h);
  }, [rec]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(video ? { audio: true, video: true } : { audio: true });
      const types = video ? ["video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const r = new MediaRecorder(stream, { mimeType: types.find((m) => MediaRecorder.isTypeSupported(m)) });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        const type = r.mimeType || (video ? "video/webm" : "audio/webm");
        onFile(new Blob(chunks, { type }), type.includes("mp4") ? (video ? "mp4" : "m4a") : "webm");
      };
      r.start();
      setSecs(0);
      setRec(r);
    } catch {
      setRec(null);
    }
  };
  if (!canRecord) return <p className="text-sm text-[#4A5878]">{t.noRecorder}</p>;
  return rec ? (
    <button type="button" onClick={() => (rec.stop(), setRec(null))} className="kit-focus rounded-lg bg-[#A3123F] px-4 py-2.5 text-sm font-extrabold text-white">
      ■ {t.stop} · {fill(t.recording, { s: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` })}
    </button>
  ) : (
    <button type="button" onClick={() => void start()} className="kit-focus rounded-lg bg-[#13284D] px-4 py-2.5 text-sm font-extrabold text-white">
      ● {video ? t.recordVideo : t.recordAudio}
    </button>
  );
}

export function BsnsTask({
  t,
  week,
  backHref,
  lessonId,
  userId,
  name,
  time,
  kind,
  media,
  en,
  es,
  done,
  sub,
  feedback,
}: {
  t: T;
  week: number;
  backHref: string;
  lessonId: string;
  userId: string;
  name: string;
  time: string | null;
  kind: "submission" | "read" | "feedback";
  media: "audio" | "video" | null;
  en: string;
  es: string | null;
  done: boolean;
  sub: Sub | null;
  feedback: { task: string; text: string; at: string | null }[];
}) {
  const router = useRouter();
  const [showEs, setShowEs] = useState(false);
  const [status, setStatus] = useState(sub?.status ?? "draft");
  const [submittedAt, setSubmittedAt] = useState(sub?.submitted_at ?? null);
  const [file, setFile] = useState<{ path: string | null; url: string | null }>({ path: sub?.media_path ?? null, url: sub?.media_url ?? null });
  const [busy, setBusy] = useState<"upload" | "submit" | "done" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = status === "submitted" || status === "reviewed";
  const editor = useAutosave(lessonId, sub?.body ?? "", kind === "submission" && !locked);
  const ago = editor.savedAt ? Math.max(1, Math.round((Date.now() - editor.savedAt) / 1000)) : null;

  const upload = async (blob: Blob, ext: string) => {
    setBusy("upload");
    setError(null);
    const supabase = createClient();
    const path = `${userId}/${lessonId}/${Date.now()}.${ext}`;
    const { error: up } = await supabase.storage.from("submissions").upload(path, blob, { contentType: blob.type || undefined });
    if (up || !(await editor.save(editor.body, { media_path: path }))) {
      setBusy(null);
      return setError(t.saveError);
    }
    const { data } = await supabase.storage.from("submissions").createSignedUrl(path, 3600);
    setFile({ path, url: data?.signedUrl ?? URL.createObjectURL(blob) });
    setBusy(null);
  };
  const submit = async () => {
    setBusy("submit");
    setError(null);
    if (!(await editor.save(editor.body, { status: "submitted" }))) {
      setBusy(null);
      return setError(t.saveError);
    }
    await finishLesson(createClient(), userId, lessonId);
    setStatus("submitted");
    setSubmittedAt(new Date().toISOString());
    setBusy(null);
    router.refresh();
  };
  const markDone = async () => {
    setBusy("done");
    await finishLesson(createClient(), userId, lessonId);
    setBusy(null);
    router.push(backHref);
    router.refresh();
  };
  const canSubmit = !!editor.body.trim() || (!!media && !!file.path);
  const text = showEs && es ? es : en;

  return (
    <div className="-mx-4 -mt-6 min-h-[calc(100dvh-7.5rem)] bg-[#F4F7FB] pb-8 sm:mx-auto sm:mt-0 sm:max-w-[720px] sm:overflow-hidden sm:rounded-xl md:-mt-2">
      <header className="flex items-center gap-2.5 border-b border-[#E4E9F2] bg-white px-4 pb-3 pt-4">
        <Link href={backHref} aria-label={t.back} className="kit-focus grid size-8 shrink-0 place-items-center rounded-lg bg-[#EEF2F9] text-[#13284D]">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-[#2C6BC4]">{fill(t.taskKicker, { n: week })}</p>
          <h1 className="truncate text-[15px] font-extrabold text-[#13284D]">{name}</h1>
        </div>
        {time && <span className="ml-auto shrink-0 rounded-md bg-[#E2ECFB] px-2 py-1 text-[11px] font-extrabold text-[#2C6BC4]">{time}</span>}
      </header>

      <div className="space-y-3 px-4 pt-3.5">
        <section className="rounded-[10px] bg-white p-3.5 shadow-[0_0_0_1px_#DCE3F0]">
          {es && (
            <button
              type="button"
              onClick={() => setShowEs((v) => !v)}
              aria-pressed={showEs}
              className="kit-focus mb-2.5 rounded-md bg-[#EEF2F9] px-2.5 py-1.5 text-xs font-extrabold text-[#2C6BC4]"
            >
              {showEs ? t.showEn : t.showEs}
            </button>
          )}
          <div lang={showEs ? "es" : "en"} className="whitespace-pre-line text-[14px] leading-relaxed text-[#13284D] [overflow-wrap:anywhere]">
            {text}
          </div>
        </section>

        {kind === "feedback" && (
          <section className="rounded-[10px] bg-white p-3.5 shadow-[0_0_0_1px_#DCE3F0]">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#5B6B86]">{t.feedbackTitle}</h2>
            {feedback.length ? (
              <ul className="mt-2 space-y-2">
                {feedback.map((f, i) => (
                  <li key={i} className="rounded-lg bg-[#FFF4D6] p-3 text-sm text-[#3B2E00]">
                    <strong className="block text-[#8A6400]">{f.task}</strong>
                    <span className="whitespace-pre-line">{f.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#4A5878]">{t.noFeedback}</p>
            )}
          </section>
        )}

        {kind === "submission" && (
          <>
            {sub?.coach_feedback && (
              <section className="rounded-[10px] bg-[#FFF4D6] p-3.5 text-[#3B2E00]">
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8A6400]">{t.coachSays}</h2>
                <p className="mt-1 whitespace-pre-line text-sm">{sub.coach_feedback}</p>
              </section>
            )}
            {media && (
              <section className="space-y-2.5 rounded-[10px] bg-white p-3.5 shadow-[0_0_0_1px_#DCE3F0]">
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#5B6B86]">{t.yourFile}</h2>
                {file.url &&
                  (media === "video" ? (
                    <video controls playsInline src={file.url} className="aspect-video w-full rounded-lg bg-black" />
                  ) : (
                    <audio controls src={file.url} className="w-full" />
                  ))}
                {!locked && (
                  <div className="flex flex-wrap items-center gap-2">
                    {busy === "upload" ? (
                      <span className="text-sm font-semibold text-[#2C6BC4]" role="status">
                        {t.uploading}
                      </span>
                    ) : (
                      <>
                        <Recorder t={t} video={media === "video"} onFile={(b, ext) => void upload(b, ext)} />
                        <label className="kit-focus cursor-pointer rounded-lg bg-white px-4 py-2.5 text-sm font-extrabold text-[#13284D] shadow-[inset_0_0_0_2px_#C9D6EE]">
                          {file.path ? t.replace : t.upload}
                          <input
                            type="file"
                            accept={media === "video" ? "video/*" : "audio/*"}
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void upload(f, f.name.split(".").pop()?.toLowerCase() || (media === "video" ? "mp4" : "m4a"));
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
            <section className="flex min-h-[230px] flex-col rounded-[10px] bg-white p-3.5" style={{ boxShadow: locked ? "0 0 0 1px #DCE3F0" : "inset 0 0 0 2px #2C6BC4" }}>
              <label htmlFor="answer" className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#5B6B86]">
                {media ? t.notes : t.answer}
              </label>
              <textarea
                id="answer"
                lang="en"
                value={editor.body}
                readOnly={locked}
                onChange={(e) => editor.setBody(e.target.value)}
                placeholder={t.placeholder}
                className="mt-1.5 min-h-[180px] flex-1 resize-y bg-transparent text-[14px] leading-relaxed text-[#13284D] outline-none placeholder:text-[#9AA6BD]"
              />
              <div className="mt-2 flex justify-between text-[11.5px] text-[#5B6B86]">
                <span aria-live="polite">
                  {editor.state === "saving" ? t.saving : editor.state === "error" ? t.saveError : editor.dirty ? t.notSaved : ago ? fill(t.saved, { n: ago }) : ""}
                </span>
                <span>{fill(t.words, { n: words(editor.body) })}</span>
              </div>
            </section>
            {error && (
              <p role="alert" className="text-sm font-semibold text-[#A3123F]">
                {error}
              </p>
            )}
            {locked ? (
              <p className="rounded-lg bg-[#E3F1E6] p-3 text-sm font-semibold text-[#1E7A3A]">
                ✓ {fill(t.submittedNote, { date: submittedAt ? new Date(submittedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "" })}
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void editor.save(editor.body)}
                    className="kit-focus flex-1 rounded-lg bg-white py-3.5 text-sm font-extrabold text-[#13284D] shadow-[inset_0_0_0_2px_#C9D6EE]"
                  >
                    {t.save}
                  </button>
                  <button
                    type="button"
                    disabled={!canSubmit || !!busy}
                    onClick={() => void submit()}
                    className="kit-focus flex-[1.4] rounded-lg bg-[#2C6BC4] py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    {t.submit}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-[#4A5878]">{t.helper}</p>
              </>
            )}
          </>
        )}

        {kind !== "submission" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void markDone()}
            className="kit-focus block w-full rounded-lg bg-[#2C6BC4] py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {done ? `✓ ${t.status.done}` : t.markDone}
          </button>
        )}
      </div>
    </div>
  );
}
