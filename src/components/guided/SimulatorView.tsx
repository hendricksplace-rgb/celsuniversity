"use client";

// The mock interview (interview-mockup.html ?v=sim), the `simulator` build section of the guided template. 7
// questions, solo or with a friend who evaluates on the same device. The voice is NEVER stored: Web Speech (en-US)
// gives the live words; when it gives nothing, the recording of that one answer goes in memory to the
// transcribe-speech Edge Function (which keeps nothing) and is dropped. Only the text and the evaluation are saved,
// in answer_banks.data.sim_runs[] (owner only).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { answersSection, mmss, obj, productPath, simRuns, stepPath, str, uid, type GuidedStep, type Lang, type ResumeData, type Section, type SimItem, type SimRun } from "@/lib/guided";
import { Ico, TopBar, UI, say, useLang, useResume } from "./ui";
import s from "./guided.module.css";

type Sim = Extract<Section, { type: "simulator" }>;
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
const speechApi = (): (new () => SR) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const MAX_UPLOAD = 8 * 1024 * 1024;

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

  // ---------- microphone ----------
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [text, setText] = useState("");
  const [micErr, setMicErr] = useState(false);
  const [evals, setEvals] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const r = useRef<{ stream: MediaStream | null; recog: SR | null; mr: MediaRecorder | null; chunks: Blob[]; final: string; t0: number; tick?: ReturnType<typeof setInterval> }>({
    stream: null,
    recog: null,
    mr: null,
    chunks: [],
    final: "",
    t0: 0,
  });
  const cleanup = useCallback(() => {
    const x = r.current;
    clearInterval(x.tick);
    x.stream?.getTracks().forEach((tr) => tr.stop());
    x.stream = null;
    x.chunks = [];
  }, []);
  useEffect(
    () => () => {
      try {
        r.current.recog?.stop();
      } catch {
        /* stopped */
      }
      if (r.current.mr && r.current.mr.state !== "inactive") r.current.mr.stop();
      cleanup();
    },
    [cleanup],
  );

  const stop = useCallback(async () => {
    const x = r.current;
    clearInterval(x.tick);
    setRec(false);
    const dur = Math.round((Date.now() - x.t0) / 1000);
    setSecs(dur);
    if (x.recog) {
      const recog = x.recog;
      await new Promise<void>((res) => {
        recog.onend = () => res();
        try {
          recog.stop();
        } catch {
          res();
        }
        setTimeout(res, 1200);
      });
      x.recog = null;
    }
    let blob: Blob | null = null;
    if (x.mr) {
      const mr = x.mr;
      blob = await new Promise<Blob>((res) => {
        mr.onstop = () => res(new Blob(x.chunks, { type: mr.mimeType || "audio/webm" }));
        if (mr.state !== "inactive") mr.stop();
        else res(new Blob(x.chunks, { type: mr.mimeType || "audio/webm" }));
      });
      x.mr = null;
    }
    cleanup();
    const said = x.final.replace(/\s+/g, " ").trim();
    if (said) return setText(said);
    // Fallback: this one recording goes in memory to transcribe-speech (it keeps nothing), then it's dropped.
    if (blob && blob.size > 0 && blob.size <= MAX_UPLOAD) {
      setBusy(true);
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const { data: out } = await createClient().functions.invoke("transcribe-speech", { body: fd });
      setBusy(false);
      const tx = (out as { text?: unknown } | null)?.text;
      setText(typeof tx === "string" ? tx.trim() : "");
    }
  }, [cleanup]);

  const start = async () => {
    if (rec || busy) return;
    const x = r.current;
    setMicErr(false);
    setText("");
    x.final = "";
    x.chunks = [];
    try {
      x.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setMicErr(true);
    }
    if (typeof MediaRecorder !== "undefined") {
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(x.stream, type ? { mimeType: type } : undefined);
      mr.ondataavailable = (e) => e.data.size && x.chunks.push(e.data);
      mr.start(1000);
      x.mr = mr;
    }
    const Speech = speechApi();
    if (Speech) {
      const recog = new Speech();
      recog.lang = "en-US";
      recog.continuous = true;
      recog.interimResults = true;
      recog.onresult = (e) => {
        let interim = "";
        for (let k = e.resultIndex; k < e.results.length; k++) {
          const res = e.results[k]!;
          if (res.isFinal) x.final += res[0].transcript + " ";
          else interim += res[0].transcript;
        }
        setText((x.final + interim).trim());
      };
      recog.onerror = () => undefined;
      try {
        recog.start();
        x.recog = recog;
      } catch {
        x.recog = null;
      }
    }
    x.t0 = Date.now();
    setSecs(0);
    setRec(true);
    x.tick = setInterval(() => {
      const n = Math.round((Date.now() - x.t0) / 1000);
      setSecs(n);
      if (n >= max) void stop();
    }, 250);
  };

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
                    <button type="button" onClick={() => (rec ? void stop() : void start())} aria-label={rec ? "Terminar" : "Responder"} disabled={busy || !question} data-mic>
                      <Ico n={rec ? "stop" : "mic"} />
                    </button>
                  </div>
                  <div className={s.mt} aria-live="polite">
                    {mmss(rec ? Math.max(0, max - secs) : secs ? secs : max)}
                  </div>
                  <small>{busy ? "Transcribiendo…" : rec ? "Grabando · toca para terminar" : micErr ? "No pudimos usar tu micrófono. Revisa los permisos." : "Toca y responde en voz alta"}</small>
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
                <button type="button" className={`${s.btn} ${s.btnG}`} onClick={next} disabled={rec || busy || !question} data-action="next">
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
