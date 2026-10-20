"use client";

// Build sections first used by "Crack the U.S. Interview Code" (celsu-global-interview-brief.md), part of the shared
// guided template: normal → better answers, the answers accordion (by form, with the live speaking meter), the self
// video (never uploaded), the rubric, a toggle and the simulator's entry card. Everything saves to the product
// (answer_banks.data for this course), except the video, which only lives in this page's memory.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FORM_FIELDS, answerText, mmss, obj, pathValue, simPath, speakSeconds, str, type AnswerQ, type AnswerVal, type Section, type SimRun } from "@/lib/guided";
import type { BuildCtx } from "./Build";
import { Ico, say } from "./ui";
import { pickMime, stopRecorder, usePageLeave } from "@/lib/voice";
import s from "./guided.module.css";

type Sec<T extends Section["type"]> = Extract<Section, { type: T }>;

export function InterviewSection({ sec, ctx }: { sec: Section; ctx: BuildCtx }) {
  if (sec.type === "normal_vs_better") return <NormalBetter sec={sec} ctx={ctx} />;
  if (sec.type === "answers") return <Answers sec={sec} ctx={ctx} />;
  if (sec.type === "self_video") return <SelfVideo sec={sec} />;
  if (sec.type === "rubric") return <Rubric sec={sec} ctx={ctx} />;
  if (sec.type === "toggle") return <Toggle sec={sec} ctx={ctx} />;
  if (sec.type === "simulator") return <SimCard sec={sec} ctx={ctx} />;
  return null;
}

function NormalBetter({ sec, ctx }: { sec: Sec<"normal_vs_better">; ctx: BuildCtx }) {
  const rows = (Array.isArray(ctx.data[sec.key]) ? (ctx.data[sec.key] as unknown[]) : []).map(obj);
  const put = (i: number, k: "normal" | "better", v: string) => ctx.set(sec.key, sec.questions.map((_, j) => (j === i ? { ...rows[j], [k]: v } : (rows[j] ?? {}))));
  return (
    <div className={s.stack}>
      {sec.questions.map((q, i) => (
        <div className={s.job} key={q}>
          <p className={s.qTitle} lang="en">
            {q}
            <button type="button" className={s.sayBtn} aria-label={`Escuchar ${q}`} onClick={() => say(q)}>
              <Ico n="vol" />
            </button>
          </p>
          <div className={s.grid2}>
            <div className={s.fld}>
              <label htmlFor={`nb-${i}-n`}>Respuesta normal</label>
              <textarea id={`nb-${i}-n`} lang="en" rows={3} value={str(rows[i]?.normal)} onChange={(e) => put(i, "normal", e.target.value)} />
            </div>
            <div className={s.fld}>
              <label htmlFor={`nb-${i}-b`}>Respuesta mejorada (demuestra tu valor)</label>
              <textarea id={`nb-${i}-b`} lang="en" rows={3} value={str(rows[i]?.better)} onChange={(e) => put(i, "better", e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- the 8 answers ----------

export const answersOf = (d: Record<string, unknown>, key: string, n: number): AnswerVal[] =>
  Array.from({ length: n }, (_, i) => {
    const o = obj((Array.isArray(d[key]) ? (d[key] as unknown[]) : [])[i]);
    return { text: str(o.text) || undefined, star: obj(o.star) as AnswerVal["star"], parts: obj(o.parts) as Record<string, string>, ready: o.ready === true };
  });

export function Meter({ text, wpm = 130, max = 120 }: { text: string; wpm?: number; max?: number }) {
  const secs = speakSeconds(text, wpm);
  const ok = secs <= max;
  const det = secs >= 40;
  return (
    <div className={s.meter} data-meter={secs}>
      <span className={s.tm}>
        <Ico n="clock" />≈ {mmss(secs)} min hablando
      </span>
      <span className={s.mbar}>
        <i style={{ width: `${Math.min(100, (secs / max) * 100)}%`, background: ok ? undefined : "#D9455B" }} />
      </span>
      <span className={s.chk} style={{ margin: 0 }}>
        <span className={ok ? s.ok : ""}>
          <Ico n={ok ? "check" : "x"} />
          Menos de 2 min
        </span>
        <span className={det ? s.ok : s.warn}>
          <Ico n={det ? "check" : "alert"} />
          {det ? "Buen nivel de detalle" : "Agrega un poco más de detalle"}
        </span>
      </span>
    </div>
  );
}

function Answers({ sec, ctx }: { sec: Sec<"answers">; ctx: BuildCtx }) {
  const list = answersOf(ctx.data, sec.key, sec.questions.length);
  const [open, setOpen] = useState<number>(() => Math.max(0, list.findIndex((a) => !a.ready)));
  const write = useCallback((i: number, v: AnswerVal) => ctx.set(sec.key, list.map((a, j) => (j === i ? v : a))), [ctx, list, sec.key]);
  // prefill_from: an empty answer starts from what the student already wrote (the value statement, the company card).
  const prefill = (q: AnswerQ, a: AnswerVal): AnswerVal => {
    if (!q.prefill_from || answerText(q.form, a)) return a;
    const v = str(pathValue(ctx.data, q.prefill_from)).trim();
    if (!v) return a;
    const first = FORM_FIELDS[q.form][0]!.k;
    if (q.form === "free") return { ...a, text: v };
    if (q.form === "star") return { ...a, star: { ...a.star, [first]: v } };
    return { ...a, parts: { ...a.parts, [first]: v } };
  };
  const toggle = (i: number) => setOpen(open === i ? -1 : i);
  // Opening an empty answer fills it from its prefill_from source (once; the student edits from there).
  const filled = useRef(new Set<number>());
  useEffect(() => {
    if (open < 0 || filled.current.has(open)) return;
    filled.current.add(open);
    const q = sec.questions[open];
    const a = list[open];
    if (!q || !a) return;
    const p = prefill(q, a);
    if (p !== a) write(open, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another question opens
  }, [open]);
  return (
    <>
      {sec.questions.map((q, i) => {
        const a = list[i]!;
        const txt = answerText(q.form, a);
        const isOpen = open === i;
        const status = a.ready ? "Lista" : txt ? "Escribiendo" : "Pendiente";
        return (
          <div className={`${s.qa} ${a.ready ? s.qaOk : ""}`} key={q.en} data-answer={i}>
            <button type="button" className={s.qh} aria-expanded={isOpen} onClick={() => toggle(i)}>
              <i>{a.ready ? "✓" : i + 1}</i>
              <b lang="en">
                {q.en}
                <small lang="es">{q.es}</small>
              </b>
              <span className={s.st2}>{status}</span>
            </button>
            {isOpen && (
              <div className={s.qb}>
                {FORM_FIELDS[q.form].map((f) => {
                  const val = q.form === "star" ? (a.star?.[f.k as "S"] ?? "") : q.form === "free" ? (a.text ?? "") : (a.parts?.[f.k] ?? "");
                  const set = (v: string) =>
                    write(i, q.form === "star" ? { ...a, star: { ...a.star, [f.k]: v } } : q.form === "free" ? { ...a, text: v } : { ...a, parts: { ...a.parts, [f.k]: v } });
                  const id = `a-${i}-${f.k}`;
                  return f.color ? (
                    <div className={s.sfield} key={f.k} style={{ ["--c" as string]: f.color }}>
                      <em>{f.k}</em>
                      <div>
                        <label htmlFor={id}>{f.es}</label>
                        <textarea id={id} lang="en" value={val} onChange={(e) => set(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className={s.fld} key={f.k} style={{ marginTop: 12 }}>
                      <label htmlFor={id}>{f.es}</label>
                      <textarea id={id} lang="en" rows={q.form === "free" ? 5 : 3} value={val} onChange={(e) => set(e.target.value)} />
                    </div>
                  );
                })}
                <Meter text={txt} wpm={sec.speaking_wpm} max={sec.max_s} />
                <div className={s.btnRow}>
                  <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} disabled={!txt} onClick={() => say(txt)}>
                    <Ico n="vol" />
                    Escuchar mi respuesta
                  </button>
                  <Link href={`${simPath(ctx.slug)}?q=${encodeURIComponent(q.en)}`} className={`${s.btn} ${s.btnT} ${s.btnSm}`}>
                    <Ico n="mic" />
                    Practicar en voz alta
                  </Link>
                  <button type="button" className={`${s.btn} ${a.ready ? s.btnO : s.btnG} ${s.btnSm}`} disabled={!txt} onClick={() => write(i, { ...a, ready: !a.ready })} data-ready={i}>
                    <Ico n="check" />
                    {a.ready ? "Lista · editar" : "Marcar como lista"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------- self video: in memory only, never uploaded ----------

function SelfVideo({ sec }: { sec: Sec<"self_video"> }) {
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<"idle" | "preview" | "recording" | "done" | "error">("idle");
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const max = sec.max_s ?? 180;
  const min = sec.min_s ?? 120;

  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  // On leave: stop the camera and drop the recording.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (rec.current && rec.current.state !== "inactive") rec.current.stop();
      stopTracks();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const open = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("no media");
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: true });
      setState("preview");
      requestAnimationFrame(() => {
        if (live.current && stream.current) {
          live.current.srcObject = stream.current;
          void live.current.play().catch(() => undefined);
        }
      });
    } catch {
      setState("error");
    }
  };
  const start = () => {
    if (!stream.current) return;
    const type = pickMime("video") ?? "";
    const r = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.current = r;
    r.start(1000);
    setSecs(0);
    setState("recording");
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const n = Math.round((Date.now() - t0) / 1000);
      setSecs(n);
      if (n >= max) void stop();
    }, 250);
  };
  // Stop always finishes: state check, then onstop or (after 1.5 s) the chunks already collected.
  const stop = async () => {
    if (timer.current) clearInterval(timer.current);
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    try {
      const blob = await stopRecorder(r, chunks.current, 1500);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const u = URL.createObjectURL(blob);
      urlRef.current = u;
      setUrl(u);
      setState("done");
    } finally {
      chunks.current = [];
      stopTracks();
    }
  };
  // Phone locked or app switched: stop there and keep the take; leaving: free the camera.
  usePageLeave(() => {
    if (rec.current) void stop();
    else stopTracks();
  });
  const again = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    void open();
  };

  return (
    <div className={s.selfv} data-selfvideo={state}>
      {sec.setup?.length ? (
        <ul className={s.ckList} style={{ marginBottom: 14 }}>
          {sec.setup.map((x) => (
            <li key={x} className={s.ckRow}>
              <Ico n="check" style={{ color: "var(--ok)" }} />
              <span style={{ fontWeight: 600 }}>{x}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={s.cam}>
        {state === "done" && url ? (
          <video src={url} controls playsInline aria-label="Tu grabación" />
        ) : (
          <video ref={live} muted playsInline aria-label="Tu cámara" />
        )}
        {(state === "preview" || state === "recording") && (
          <div className={s.camQ}>
            <small>PREGUNTA</small>
            <b lang="en">{sec.question}</b>
          </div>
        )}
        {state === "recording" && (
          <div className={s.camT} aria-live="polite">
            <span className={s.recDot} />
            {mmss(secs)} / {mmss(max)}
          </div>
        )}
        {(state === "idle" || state === "error") && (
          <div className={s.camIdle}>
            <Ico n="eye" />
            <p>{state === "error" ? "No pudimos abrir tu cámara. Revisa los permisos del navegador." : `Respondes «${sec.question}» de ${Math.round(min / 60)} a ${Math.round(max / 60)} minutos.`}</p>
          </div>
        )}
      </div>
      <div className={s.btnRow}>
        {state === "idle" || state === "error" ? (
          <button type="button" className={`${s.btn} ${s.btnG}`} onClick={() => void open()} data-cam="open">
            <Ico n="eye" />
            Abrir mi cámara
          </button>
        ) : state === "preview" ? (
          <button type="button" className={`${s.btn} ${s.btnN}`} onClick={start} data-cam="start">
            <Ico n="play" />
            Empezar a grabar
          </button>
        ) : state === "recording" ? (
          <button type="button" className={`${s.btn} ${s.btnN}`} onClick={stop} data-cam="stop">
            <Ico n="x" />
            {secs < min ? `Terminar (recomendado: ${mmss(min)})` : "Terminar"}
          </button>
        ) : (
          <button type="button" className={`${s.btn} ${s.btnO}`} onClick={again} data-cam="again">
            <Ico n="play" />
            Grabar otra vez
          </button>
        )}
      </div>
      {sec.watch?.length ? (
        <div className={s.watch}>
          <p className={s.groupT}>Pon atención a</p>
          <ul>
            {sec.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className={s.privacy}>
        <Ico n="check" />
        Tu video no se sube: se queda en este dispositivo y se borra al salir de la página.
      </p>
    </div>
  );
}

function Rubric({ sec, ctx }: { sec: Sec<"rubric">; ctx: BuildCtx }) {
  const v = obj(ctx.data[sec.key]);
  const ans = obj(v.answers) as Record<string, number>;
  const com = obj(v.comments) as Record<string, string>;
  const total = sec.groups.reduce((n, g) => n + g.items.length, 0);
  const done = Object.keys(ans).length;
  return (
    <>
      {sec.groups.map((g, gi) => (
        <div key={g.title} className={s.rubG}>
          <p className={s.groupT}>{g.title}</p>
          {g.items.map((it, ii) => {
            const k = `${gi}-${ii}`;
            return (
              <div className={s.erow} key={k}>
                <span>{it}</span>
                <div className={s.opts3} role="group" aria-label={it}>
                  {sec.scale.map((o, j) => (
                    <button key={o} type="button" aria-pressed={ans[k] === j} onClick={() => ctx.set(sec.key, { ...v, answers: { ...ans, [k]: j } })}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {sec.comments_per_group && (
            <div className={s.fld} style={{ marginTop: 8 }}>
              <label htmlFor={`rc-${gi}`}>Comentarios</label>
              <input id={`rc-${gi}`} value={com[gi] ?? ""} onChange={(e) => ctx.set(sec.key, { ...v, comments: { ...com, [gi]: e.target.value } })} />
            </div>
          )}
        </div>
      ))}
      <p className={`${s.result} ${done === total ? s.resultHigh : ""}`}>
        {done}/{total}
      </p>
    </>
  );
}

function Toggle({ sec, ctx }: { sec: Sec<"toggle">; ctx: BuildCtx }) {
  const on = ctx.data[sec.key] === true;
  return (
    <label className={s.ckRow} style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={on} onChange={(e) => ctx.set(sec.key, e.target.checked)} />
      <span style={{ fontWeight: 600 }}>{sec.text}</span>
    </label>
  );
}

function SimCard({ sec, ctx }: { sec: Sec<"simulator">; ctx: BuildCtx }) {
  const runs = (Array.isArray(ctx.data.sim_runs) ? (ctx.data.sim_runs as SimRun[]) : []).filter((r) => r?.items?.length);
  const company = obj(ctx.data.company);
  const who = sec.interviewer?.name ?? "Sarah";
  return (
    <div data-section={sec.key}>
      <div className={s.simt}>
        <div style={{ minWidth: 0 }}>
          <small>SIMULACRO · {sec.questions.length} PREGUNTAS</small>
          <h3>Tu entrevista completa, en inglés</h3>
          <p>
            {who} te hace las preguntas en voz alta{str(company.company) ? ` (${[str(company.role), str(company.company)].filter(Boolean).join(" · ")})` : ""}. Respondes hablando y luego evalúas cada respuesta, solo o con
            alguien de confianza.
          </p>
          <ol lang="en">
            {sec.questions.map((q, i) => (
              <li key={i}>{q.en ?? <i lang="es">Pregunta sorpresa</i>}</li>
            ))}
          </ol>
          {runs.length > 0 && (
            <p className={s.roomNote}>
              {runs.length} {runs.length === 1 ? "simulacro guardado" : "simulacros guardados"} · el último: {new Date(runs[runs.length - 1]!.at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
        <Link href={simPath(ctx.slug)} className={`${s.btn} ${s.btnG}`} data-action="sim">
          <Ico n="mic" />
          {runs.length ? "Hacer otro simulacro" : "Empezar el simulacro"}
        </Link>
      </div>
      {sec.before?.length ? (
        <div className={`${s.card} ${s.gcard}`}>
          <h3>Antes de empezar</h3>
          <ul className={s.gl}>
            {sec.before.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className={s.privacy}>
        <Ico n="lock" />
        Tu voz no se guarda: solo el texto de tu respuesta y tu evaluación.
      </p>
    </div>
  );
}
