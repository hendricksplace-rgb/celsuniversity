"use client";

// The mock interview (interview-mockup.html ?v=sim), the `simulator` build section of the guided template. 7
// questions, solo or with a friend who evaluates on the same device. The voice is NEVER stored: Web Speech (en-US)
// gives the live words; when it gives nothing, the recording of that one answer goes in memory to the
// transcribe-speech Edge Function (which keeps nothing) and is dropped. Only the text and the evaluation are saved,
// in answer_banks.data.sim_runs[] (owner only).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePageLeave, useVoiceCapture } from "@/lib/voice";
import { answersSection, mmss, obj, productPath, simRuns, stepPath, str, uid, type GuidedStep, type Lang, type ResumeData, type Section, type SimItem, type SimRun } from "@/lib/guided";
import { Ico, TopBar, UI, say, useLang, useResume } from "./ui";
import s from "./guided.module.css";

type Sim = Extract<Section, { type: "simulator" }>;

export function SimulatorView({
  userId,
  slug,
  courseTitle,
  steps,
  bank,
  audio,
  initialQ,
  defaultLang,
}: {
  userId: string;
  slug: string;
  courseTitle: string;
  steps: GuidedStep[];
  bank: ResumeData;
  /** Recorded question audio: file name → signed URL (the rest uses the device's voice). */
  audio: Record<string, string>;
  initialQ: string | null;
  defaultLang: Lang;
}) {
  const [lang, setLang] = useLang(defaultLang);
  const t = UI[lang];
  const simStep = steps.find((x) => x.build.sections.some((y) => y.type === "simulator"));
  const sec = simStep?.build.sections.find((y): y is Sim => y.type === "simulator");
  const { data, update } = useResume(userId, bank, "answer_banks");
  const ans = answersSection(steps);
  const company = obj(data.company);
  const total = sec?.questions.length ?? 7;
  const max = sec?.max_s ?? 120;

  // Solo mode's surprise: a question from the answer list that isn't in the fixed list and wasn't practiced yet.
  const surpriseSolo = useMemo(() => {
    const fixed = new Set((sec?.questions ?? []).map((q) => q.en).filter(Boolean));
    const practiced = new Set(simRuns(bank).flatMap((r) => r.items.map((i) => i.q)));
    const pool = (ans?.sec.questions ?? []).map((q) => q.en).filter((q) => !fixed.has(q));
    return pool.find((q) => !practiced.has(q)) ?? pool[0] ?? "Why should we hire you?";
  }, [sec, ans, bank]);

  const startIdx = useMemo(() => {
    if (!initialQ || !sec) return 0;
    const i = sec.questions.findIndex((q) => q.en === initialQ);
    return i >= 0 ? i : total - 1;
  }, [initialQ, sec, total]);
  const [mode, setMode] = useState<"solo" | "friend">("solo");
  const [idx, setIdx] = useState(startIdx);
  const [items, setItems] = useState<SimItem[]>([]);
  const runId = useRef(uid());
  const [friendQ, setFriendQ] = useState("");
  const [finished, setFinished] = useState(false);

  const def = sec?.questions[idx];
  const surpriseQ = initialQ && sec && !sec.questions.some((q) => q.en === initialQ) ? initialQ : null;
  const question = def?.surprise ? (mode === "friend" ? friendQ.trim() : (surpriseQ ?? surpriseSolo)) : (def?.en ?? "");
  const es = ans?.sec.questions.find((q) => q.en === question)?.es ?? "";

  // ---------- question audio ----------
  const player = useRef<HTMLAudioElement | null>(null);
  const play = useCallback(() => {
    if (!question) return;
    const url = def?.audio ? audio[def.audio] : undefined;
    try {
      player.current?.pause();
      window.speechSynthesis?.cancel();
    } catch {
      /* nothing playing */
    }
    if (url) {
      player.current = new Audio(url);
      void player.current.play().catch(() => say(question));
    } else say(question);
  }, [question, def, audio]);
  useEffect(() => {
    if (question && !finished) play();
    // Only when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, question === "" ? "" : question]);
  useEffect(() => () => player.current?.pause(), []);

  // ---------- microphone (lib/voice: one capture at a time, stop always settles) ----------
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState<"saving" | "transcribing" | null>(null);
  const [secs, setSecs] = useState(0);
  const [text, setText] = useState("");
  const [micErr, setMicErr] = useState(false);
  const [evals, setEvals] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const voice = useVoiceCapture({ supabase: () => (sb.current ??= createClient()), onLive: setText, onTranscribing: () => setBusy("transcribing") });
  const recRef = useRef(false);
  const busyRef = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stop = useCallback(async () => {
    if (!recRef.current || busyRef.current) return;
    busyRef.current = true;
    recRef.current = false;
    clearInterval(tick.current);
    setRec(false);
    setBusy("saving");
    try {
      const res = await voice.stop();
      if (res) {
        setSecs(res.dur);
        setText(res.text);
        setMicErr(res.failed);
      }
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, [voice]);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const start = async () => {
    if (recRef.current || busyRef.current) return;
    busyRef.current = true;
    setMicErr(false);
    setText("");
    let ok = false;
    try {
      ok = await voice.start();
    } finally {
      busyRef.current = false;
    }
    if (!ok) return setMicErr(true);
    recRef.current = true;
    const t0 = Date.now();
    setSecs(0);
    setRec(true);
    tick.current = setInterval(() => {
      const n = Math.round((Date.now() - t0) / 1000);
      setSecs(n);
      if (n >= max) void stopRef.current();
    }, 250);
  };
  // Leaving the page (or the question changing) drops the recording and frees the mic.
  const drop = useCallback(() => {
    if (!recRef.current) return;
    clearInterval(tick.current);
    recRef.current = false;
    voice.cancel();
    setRec(false);
  }, [voice]);
  usePageLeave(drop);
  useEffect(() => drop, [idx, drop]);

  // ---------- saving: only text and evaluation ----------
  const save = (list: SimItem[], done: boolean) => {
    const run: SimRun = { id: runId.current, at: new Date().toISOString(), mode, items: list, done };
    update((d) => ({ ...d, sim_runs: [...simRuns(d).filter((x) => x.id !== run.id), run].slice(-20) }), true);
  };
  const resetAnswer = () => {
    setText("");
    setSecs(0);
    setEvals({});
    setComments("");
  };
  const next = () => {
    const item: SimItem = { q: question, transcript: text.trim(), seconds: secs, eval: evals, comments: comments.trim() };
    const list = [...items, item];
    setItems(list);
    const last = idx >= total - 1;
    save(list, last);
    resetAnswer();
    if (last) setFinished(true);
    else setIdx(idx + 1);
  };

  if (!sec) return null;
  const pct = Math.min(100, (secs / max) * 100);
  const back = productPath(slug, "interview");
  return (
    <div className={`${s.page} ${s.thInterview}`} lang={lang}>
      <TopBar kicker={`${t.stepN(simStep!.step).toUpperCase()} · SIMULACRO`} title="Simulacro de entrevista" backHref={back} progress={(idx + (finished ? 1 : 0)) / total} lang={lang} onLang={setLang} t={t} />
      <div className={s.wrap} style={{ display: "block" }}>
        <h1 className={s.sr}>Simulacro de entrevista · {courseTitle}</h1>
        {finished ? (
          <div className={s.room} style={{ padding: 28 }} data-sim="finished">
            <p className={s.roomK}>SIMULACRO TERMINADO</p>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 8 }}>¡Bien hecho! Respondiste {items.length} preguntas.</h2>
            <p className={s.roomNote}>Se guardó en tu banco: el texto de cada respuesta y tu evaluación. Tu voz no se guardó.</p>
            <div className={s.btnRow}>
              <Link href={back} className={`${s.btn} ${s.btnG}`}>
                <Ico n="eye" />
                Ver mi banco
              </Link>
              <Link href={`${stepPath(slug, simStep!.step)}#build`} className={`${s.btn} ${s.btnO}`} style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}>
                <Ico n="pen" />
                Escribir mi reflexión final
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className={s.room} data-sim={rec ? "recording" : "idle"}>
              <div className={s.rtop}>
                <small className={s.roomK}>
                  PREGUNTA {idx + 1} DE {total}
                </small>
                <div className={s.seg} role="group" aria-label="Modo">
                  <button type="button" aria-pressed={mode === "solo"} onClick={() => setMode("solo")} disabled={items.length > 0}>
                    Practico solo
                  </button>
                  <button type="button" aria-pressed={mode === "friend"} onClick={() => setMode("friend")} disabled={items.length > 0} data-mode="friend">
                    Con un amigo o familiar
                  </button>
                </div>
              </div>
              <div className={s.segs} aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                  <i key={i} className={i < idx ? s.sd : i === idx ? s.sc2 : ""} />
                ))}
              </div>
              <div className={s.rbody}>
                <div style={{ minWidth: 0 }}>
                  <div className={s.who}>
                    <div className={s.av}>{(sec.interviewer?.name ?? "S").charAt(0)}</div>
                    <div>
                      <b>{sec.interviewer?.name ?? "Sarah"} · Entrevistadora</b>
                      <span>{[str(company.role), str(company.company)].filter(Boolean).join(" · ") || "Tu entrevista"}</span>
                    </div>
                  </div>
                  {def?.surprise && mode === "friend" && !friendQ.trim() ? (
                    <div className={s.fld}>
                      <label htmlFor="friendq" style={{ color: "#F4CF5E" }}>
                        Pregunta sorpresa: tu amigo o familiar la escribe (en inglés)
                      </label>
                      <input id="friendq" lang="en" placeholder="Why should we hire you?" onKeyDown={(e) => e.key === "Enter" && setFriendQ((e.target as HTMLInputElement).value)} onBlur={(e) => setFriendQ(e.target.value)} />
                    </div>
                  ) : (
                    <>
                      {def?.surprise && <p className={s.roomK}>PREGUNTA SORPRESA</p>}
                      <div className={s.qbig} lang="en" data-question>
                        {question}
                      </div>
                      {es && <div className={s.qes}>{es}</div>}
                      <div className={s.rbtns}>
                        <button type="button" className={`${s.btn} ${s.btnG}`} onClick={play}>
                          <Ico n="vol" />
                          Escuchar otra vez
                        </button>
                        <button type="button" className={`${s.btn} ${s.btnO}`} onClick={() => say("Can you please repeat the question?")}>
                          <Ico n="chat" />
                          «Can you repeat the question?»
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className={s.micw}>
                  <div className={`${s.ring} ${rec ? s.ringRec : ""}`} style={{ ["--p" as string]: `${pct}%` }}>
                    <button type="button" onClick={() => (rec ? void stop() : void start())} aria-label={rec ? "Terminar" : "Responder"} disabled={!!busy || !question} aria-busy={!!busy} data-mic>
                      <Ico n={rec ? "stop" : "mic"} />
                    </button>
                  </div>
                  <div className={s.mt} aria-live="polite">
                    {mmss(rec ? Math.max(0, max - secs) : secs ? secs : max)}
                  </div>
                  <small>{busy === "transcribing" ? "Transcribiendo…" : busy ? "Guardando…" : rec ? "Grabando · toca para terminar" : micErr ? "No pudimos usar tu micrófono o convertir tu voz. Revisa los permisos o escribe tu respuesta." : "Toca y responde en voz alta"}</small>
                </div>
              </div>
              {question && (
                <div className={s.trans}>
                  <small>{rec ? "LO QUE VAS DICIENDO" : text || secs > 0 ? "TU RESPUESTA (puedes corregir el texto)" : "TU RESPUESTA · habla con el micrófono o escríbela aquí"}</small>
                  {rec ? (
                    <span lang="en">{text || "…"}</span>
                  ) : (
                    <textarea lang="en" aria-label="Tu respuesta" value={text} onChange={(e) => setText(e.target.value)} placeholder={busy ? "…" : "Si no salió el texto, escríbelo aquí."} data-transcript />
                  )}
                </div>
              )}
            </div>

            <div className={s.card} style={{ marginTop: 18 }}>
              <h3>{mode === "friend" ? "Tu amigo te evalúa" : "Evalúa tu respuesta"}</h3>
              <p className={s.sub}>{mode === "friend" ? "Pásale el teléfono a quien te entrevista: marca una opción en cada fila." : "Lee la transcripción y marca con honestidad."}</p>
              <div className={s.evalG}>
                {sec.eval.map((e) => (
                  <div className={s.erow} key={e.k}>
                    <b>{e.label}</b>
                    <div className={s.opts3} role="group" aria-label={e.label}>
                      {e.o.map((o, j) => (
                        <button key={o} type="button" aria-pressed={evals[e.k] === j} onClick={() => setEvals((v) => ({ ...v, [e.k]: j }))} data-eval={`${e.k}-${j}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {sec.comments && (
                  <div className={s.fld}>
                    <label htmlFor="simc">Comentarios</label>
                    <textarea id="simc" value={comments} placeholder="¿Qué salió bien? ¿Qué mejorarías?" onChange={(e) => setComments(e.target.value)} />
                  </div>
                )}
              </div>
              <p className={s.privacy}>
                <Ico n="lock" />
                Tu voz no se guarda: solo el texto de tu respuesta y tu evaluación, y solo tú los ves.
              </p>
              <div className={s.btnRow}>
                <button type="button" className={`${s.btn} ${s.btnO}`} onClick={resetAnswer} disabled={rec}>
                  <Ico n="mic" />
                  Intentar otra vez
                </button>
                <button type="button" className={`${s.btn} ${s.btnG}`} onClick={next} disabled={rec || !!busy || !question} data-action="next">
                  {idx >= total - 1 ? "Terminar el simulacro" : "Siguiente pregunta"}
                  <Ico n="right" />
                </button>
              </div>
            </div>
          </>
        )}
        <nav className={s.nav}>
          <Link href={back} className={`${s.btn} ${s.btnO}`}>
            <Ico n="left" />
            <div>
              <small>REGRESAR</small>
              <span>A mis respuestas</span>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
