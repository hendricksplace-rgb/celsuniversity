"use client";

// CelsBSNS Video Submission (celsu-celsbsns-video-brief.md, celsbsns-video-semana1-mockup.html): prepare the script
// (from the Writing email), get ready, record with the camera (or pick a local file), choose a thumbnail, save it.
// Matt's decision: the video NEVER leaves the device. It lives in memory as a Blob URL only (no Storage, no IndexedDB,
// no localStorage). Only the chosen JPEG frame goes to the private video-proofs bucket (the bucket itself only accepts
// image/jpeg under 200 KB). Saving completes the lesson through record_lesson_progress (finishLesson).
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { navTitle } from "@/lib/reading";
import { fmtTime, grabFrames, jpegBlob, spokenSeconds, thumbPath, type VideoProof, type VideoTaskData } from "@/lib/video-task";
import { Icon, Layout, Pager, RailCard, RailSteps, ShellPage, StepHead, StepRowText, TopBar, goTo, iconOr, shell as sh, useLangPref, useScrollSpy, type Lang, type NavLink } from "@/components/bsns/shell";
import s from "./video.module.css";

type Props = {
  data: VideoTaskData;
  lessonId: string;
  userId: string;
  backHref: string;
  prev: NavLink;
  next: NavLink;
  proof: VideoProof | null;
  writing: { subject: string | null; body: string } | null;
  defaultLang: Lang;
};
type Phase = "idle" | "recording" | "review" | "uploading" | "saved";

const UI = {
  es: {
    kick: "VIDEO",
    steps: ["Tu guion", "Prepárate", "Graba", "Guarda tu miniatura"],
    step: "PASO",
    s1: "Prepara tu guion",
    s1i: "Tu video debe incluir estas 4 cosas. Empezamos con tu correo de Writing: ajústalo para decirlo en voz alta.",
    s1in: (n: number) => `Tu video debe incluir estas ${n} cosas. Si ya escribiste tu Writing, empezamos con ese texto: ajústalo para decirlo en voz alta.`,
    s1is: (n: number) => `Tu video debe incluir estas ${n} cosas. Empieza con la plantilla de abajo y cámbiala con tus palabras.`,
    scrK: "MI GUION",
    scrSrc: "Tomado de tu correo de Writing",
    scrSrcN: "Tomado de tu Writing",
    scrStart: "Plantilla para empezar",
    useStarter: "Usar la plantilla",
    scrPhN: "Escribe aquí lo que vas a decir, en inglés.",
    exK: "EJEMPLO",
    aiK: "RETO OPCIONAL · CHATGPT EN MODO DE VOZ",
    copied: "Copiado",
    scrPh: "Hi, my name is… and I'm a… on the… team.\n\nEscribe aquí lo que vas a decir. Si ya enviaste tu correo de Writing, aparecerá aquí.",
    tAt: "Al leerlo en voz alta: ",
    tGoal: (a: string, b: string) => `Meta: ${a} – ${b}`,
    s2: "Prepárate para grabar",
    s2i: "Toca cada consejo cuando lo tengas listo.",
    ready: (a: number, b: number) => `${a} de ${b} listos`,
    readyOk: "¡Todo listo para grabar!",
    s3: "Graba tu video",
    s3i: "Graba aquí mismo con tu cámara o sube un video de tu teléfono. Puedes grabar todas las veces que quieras.",
    camT: "Tu cámara está lista",
    camS: "Toca el botón rojo para empezar. Tu guion aparece arriba si lo activas.",
    prompt: "Guion en pantalla",
    upl: "Subir un video",
    stopHint: "Toca para terminar",
    recHint: "Toca para grabar",
    recNote: "El video se graba en tu dispositivo. Nada se sube mientras grabas.",
    noCam: "No pudimos usar tu cámara. Puedes subir un video desde tu teléfono.",
    s4: "Revisa y guarda tu miniatura",
    s4i: "Mira tu video. Elige la imagen que quieres guardar como prueba.",
    pick: "ELIGE TU MINIATURA",
    frameAt: (t: string) => `Imagen en ${t}`,
    self: "MI VIDEO INCLUYE…",
    feel: "¿CÓMO TE SENTISTE?",
    feels: ["Nervioso", "Un poco", "Bien", "Seguro", "¡Muy seguro!"],
    save: "Guardar mi miniatura",
    saveN: "Solo se sube la imagen (unos 40 KB). Tu video no se sube.",
    upT: "Subiendo tu miniatura…",
    upS: "Solo la imagen · tu video se queda en tu dispositivo",
    upStay: "Video: 0 KB subidos",
    thumbOk: "Miniatura guardada",
    doneK: "VIDEO COMPLETADO",
    doneH: "¡Lo hiciste!",
    doneP: "Guardamos la miniatura de tu video como prueba. Tu video no se subió: es tuyo. Practica las veces que quieras; en clases en vivo lo presentarás frente al grupo.",
    dl: "Descargar mi video",
    again: "Grabar otra vez",
    note: "Descarga tu video ahora si lo quieres conservar. Al salir de esta página ya no estará en la app.",
    capL: (n: number) => `Se agrega a tu Capstone · Parte ${n} como “Video grabado”`,
    rail: "TU AVANCE",
    privH: "PRIVACIDAD",
    privY: "Guardamos: la miniatura, la duración y la fecha.",
    privN: "No guardamos: tu video.",
    done: "Completado",
    err: "No se pudo guardar tu miniatura. Revisa tu conexión e inténtalo de nuevo.",
    chipsAria: "Detalles de la tarea",
    stage: "Grabadora de video",
    yourVideo: "Tu video",
  },
  en: {
    kick: "VIDEO",
    steps: ["Your script", "Get ready", "Record", "Save your thumbnail"],
    step: "STEP",
    s1: "Prepare your script",
    s1i: "Your video needs these 4 things. We start with your Writing email: adjust it so it sounds natural out loud.",
    s1in: (n: number) => `Your video needs these ${n} things. If you've written your Writing task, we start with that text: adjust it so it sounds natural out loud.`,
    s1is: (n: number) => `Your video needs these ${n} things. Start with the template below and change it into your own words.`,
    scrK: "MY SCRIPT",
    scrSrc: "Taken from your Writing email",
    scrSrcN: "Taken from your Writing",
    scrStart: "Starter template",
    useStarter: "Use the template",
    scrPhN: "Write what you'll say here, in English.",
    exK: "EXAMPLE",
    aiK: "OPTIONAL CHALLENGE · CHATGPT VOICE MODE",
    copied: "Copied",
    scrPh: "Hi, my name is… and I'm a… on the… team.\n\nWrite what you'll say here. If you've sent your Writing email, it will show up here.",
    tAt: "Read out loud: ",
    tGoal: (a: string, b: string) => `Goal: ${a} – ${b}`,
    s2: "Get ready to record",
    s2i: "Tap each tip when you have it ready.",
    ready: (a: number, b: number) => `${a} of ${b} ready`,
    readyOk: "All set to record!",
    s3: "Record your video",
    s3i: "Record right here with your camera, or upload a video from your phone. Record as many times as you want.",
    camT: "Your camera is ready",
    camS: "Tap the red button to start. Your script appears at the top if you turn it on.",
    prompt: "Script on screen",
    upl: "Upload a video",
    stopHint: "Tap to finish",
    recHint: "Tap to record",
    recNote: "The video is recorded on your device. Nothing is uploaded while you record.",
    noCam: "We couldn't use your camera. You can upload a video from your phone.",
    s4: "Review and save your thumbnail",
    s4i: "Watch your video. Pick the image you want to save as proof.",
    pick: "PICK YOUR THUMBNAIL",
    frameAt: (t: string) => `Frame at ${t}`,
    self: "MY VIDEO INCLUDES…",
    feel: "HOW DID YOU FEEL?",
    feels: ["Nervous", "A little", "Okay", "Confident", "Very confident!"],
    save: "Save my thumbnail",
    saveN: "Only the image is uploaded (about 40 KB). Your video is not uploaded.",
    upT: "Uploading your thumbnail…",
    upS: "Image only · your video stays on your device",
    upStay: "Video: 0 KB uploaded",
    thumbOk: "Thumbnail saved",
    doneK: "VIDEO COMPLETE",
    doneH: "You did it!",
    doneP: "We saved your video's thumbnail as proof. Your video wasn't uploaded: it's yours. Practice as often as you like; in live classes you'll present it to the group.",
    dl: "Download my video",
    again: "Record again",
    note: "Download your video now if you want to keep it. Once you leave this page, it won't be in the app.",
    capL: (n: number) => `Added to your Capstone · Part ${n} as “Video recorded”`,
    rail: "YOUR PROGRESS",
    privH: "PRIVACY",
    privY: "We save: the thumbnail, the length and the date.",
    privN: "We don't save: your video.",
    done: "Complete",
    err: "Your thumbnail couldn't be saved. Check your connection and try again.",
    chipsAria: "About this task",
    stage: "Video recorder",
    yourVideo: "Your video",
  },
};
const IDS = ["v0", "v1", "v2", "v3"];
const MIME_TYPES = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];

export function InteractiveVideo(p: Props) {
  const { data } = p;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);

  useEffect(() => {
    void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId]);

  // ---------- the script: the saved one, else the Writing email; edits persist (row) or stay on this device ----------
  const draftKey = `celsu:video-script:${p.userId}:${p.lessonId}`;
  // The script starts from: the saved one, else the Writing text, else (week 6) the week's starter template.
  const starter = data.script_starter?.en ?? null;
  const fromWriting = !p.proof?.script && !!p.writing;
  const fromStarter = !p.proof?.script && !p.writing && !!starter;
  const [script, setScript] = useState(p.proof?.script ?? p.writing?.body ?? starter ?? "");
  const [copiedAi, setCopiedAi] = useState<number | null>(null);
  const [hasProof, setHasProof] = useState(!!p.proof);
  useEffect(() => {
    if (p.proof?.script) return;
    try {
      const v = localStorage.getItem(draftKey);
      if (v) setScript(v);
    } catch {
      /* storage blocked */
    }
  }, [draftKey, p.proof?.script]);
  const scriptTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onScript = (v: string) => {
    setScript(v);
    clearTimeout(scriptTimer.current);
    scriptTimer.current = setTimeout(() => {
      if (hasProof)
        void db()
          .from("video_proofs")
          .update({ script: v.slice(0, 6000), updated_at: new Date().toISOString() })
          .eq("user_id", p.userId)
          .eq("lesson_id", p.lessonId)
          .then(() => undefined);
      else
        try {
          localStorage.setItem(draftKey, v.slice(0, 6000));
        } catch {
          /* storage blocked */
        }
    }, 600);
  };
  const est = spokenSeconds(script, data.wpm);
  const inZone = (x: number) => x >= data.seconds.min && x <= data.seconds.max;

  const [tips, setTips] = useState<number[]>([]);

  // ---------- recorder ----------
  const [phase, setPhase] = useState<Phase>(p.proof ? "saved" : "idle");
  const [showPrompt, setShowPrompt] = useState(true);
  const [camError, setCamError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [pick, setPick] = useState(1);
  const [dur, setDur] = useState(p.proof?.duration_s ?? 0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("video/webm");
  const [self, setSelf] = useState<number[]>(p.proof?.self_check ?? []);
  const [feel, setFeel] = useState<number | null>(p.proof?.confidence ? p.proof.confidence - 1 : null);
  const [thumb, setThumb] = useState<string | null>(p.proof?.thumbUrl ?? null);
  const [savedAt, setSavedAt] = useState(p.proof?.updated_at ?? null);
  const [upPct, setUpPct] = useState(0);
  const [error, setError] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const tStart = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const blobRef = useRef<string | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((x) => x.stop());
    streamRef.current = null;
  };
  const setBlob = (url: string | null) => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = url;
    setBlobUrl(url);
  };
  // Leaving the page: stop the camera, drop the recording.
  useEffect(
    () => () => {
      clearInterval(tick.current);
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
      stopTracks();
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    },
    [],
  );
  useEffect(() => {
    if (phase === "recording" && liveRef.current && streamRef.current) {
      liveRef.current.srcObject = streamRef.current;
      void liveRef.current.play().catch(() => undefined);
    }
  }, [phase]);

  const toReview = async (url: string, fallback: number) => {
    const g = await grabFrames(url, fallback);
    setFrames(g.frames);
    setDur(g.dur);
    setPick(1);
    setPhase("review");
    requestAnimationFrame(() => goTo("v3"));
  };
  const stopRec = useCallback(() => {
    clearInterval(tick.current);
    const r = recRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);
  const startRec = async () => {
    setCamError(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("no media");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: true });
      streamRef.current = stream;
      const type = MIME_TYPES.find((x) => MediaRecorder.isTypeSupported(x)) ?? "video/webm";
      setMime(type);
      chunks.current = [];
      const rec = new MediaRecorder(stream, { mimeType: type });
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const seconds = Math.max(1, (Date.now() - tStart.current) / 1000);
        stopTracks();
        // In memory only: the recording is never written to storage of any kind.
        const url = URL.createObjectURL(new Blob(chunks.current, { type: type.split(";")[0] }));
        chunks.current = [];
        setBlob(url);
        void toReview(url, seconds);
      };
      recRef.current = rec;
      rec.start(500);
    } catch {
      stopTracks();
      setCamError(true);
      return;
    }
    tStart.current = Date.now();
    setElapsed(0);
    setPhase("recording");
    tick.current = setInterval(() => {
      const sec = (Date.now() - tStart.current) / 1000;
      setElapsed(sec);
      if (sec >= data.auto_stop_s) stopRec();
    }, 250);
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMime(f.type || "video/mp4");
    const url = URL.createObjectURL(f); // read locally; never uploaded
    setBlob(url);
    await toReview(url, 0);
  };
  const again = () => {
    setBlob(null);
    setFrames([]);
    setPhase("idle");
    setError(false);
    requestAnimationFrame(() => goTo("v2"));
  };

  // Teleprompter: scrolls with the recording, timed to the script estimate.
  const [promptShift, setPromptShift] = useState(0);
  useEffect(() => {
    if (phase !== "recording" || !promptRef.current) return setPromptShift(0);
    const el = promptRef.current;
    const total = el.scrollHeight - (el.parentElement?.clientHeight ?? 0) * 0.5;
    setPromptShift(-Math.max(0, total) * Math.min(1, elapsed / Math.max(60, est)));
  }, [elapsed, phase, est]);

  // ---------- save the thumbnail (the only upload) ----------
  const save = async () => {
    const frame = frames[pick];
    if (!frame) return;
    setError(false);
    setPhase("uploading");
    setUpPct(15);
    const path = thumbPath(p.userId, p.lessonId);
    const blob = await jpegBlob(frame);
    setUpPct(45);
    const up = await db().storage.from("video-proofs").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    setUpPct(75);
    const now = new Date().toISOString();
    const row = up.error
      ? up
      : await db()
          .from("video_proofs")
          .upsert(
            {
              user_id: p.userId,
              lesson_id: p.lessonId,
              thumb_path: path,
              duration_s: Math.round(dur * 10) / 10,
              frame_at_s: Math.round(((dur * (pick + 0.5)) / frames.length) * 10) / 10,
              self_check: self,
              confidence: feel === null ? null : feel + 1,
              script: script.slice(0, 6000),
              updated_at: now,
            },
            { onConflict: "user_id,lesson_id" },
          );
    if (up.error || row.error) {
      setPhase("review");
      return setError(true);
    }
    await finishLesson(db(), p.userId, p.lessonId);
    setUpPct(100);
    setHasProof(true);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* storage blocked */
    }
    setThumb(frame);
    setSavedAt(now);
    setTimeout(() => {
      setPhase("saved");
      requestAnimationFrame(() => goTo("v3"));
    }, 350);
  };

  // ---------- progress ----------
  const { current } = useScrollSpy(phase === "review" || phase === "uploading" || phase === "saved" ? IDS : IDS.slice(0, 3));
  const stepsDone = [true, tips.length === data.tips.length, phase !== "idle" && phase !== "recording", phase === "saved"];
  const seen = (i: number) => stepsDone[i] && (i > 0 || current > 0 || phase !== "idle");
  const progress = phase === "idle" ? 0.15 + tips.length * 0.05 : { recording: 0.55, review: 0.75, uploading: 0.9, saved: 1 }[phase];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dateLabel = savedAt && mounted ? new Date(savedAt).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "";
  const showStep4 = phase === "review" || phase === "uploading" || phase === "saved";
  const recording = phase === "recording";
  const stageImg = phase === "uploading" ? frames[pick] : phase === "saved" ? thumb : null;

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        week={data.week}
        kind="VIDEO"
        title={`${data.hero.title_a} ${data.hero.title_b}`}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={progress}
        row={
          <>
            <StepRowText lang={lang} n={current + 1} total={IDS.length} name={t.steps[current]} />
            {phase === "saved" && (
              <span className={s.donePill}>
                <Icon name="check" size={14} />
                {t.done}
              </span>
            )}
          </>
        }
      />
      <Layout
        railLabel={t.rail}
        main={
          <>
            {/* ---------- hero ---------- */}
            <section className={sh.hero} aria-labelledby="vd-title">
              <p className={sh.pill}>
                <Icon name="video" size={16} />
                {t.kick}
              </p>
              <h1 id="vd-title" className={sh.heroTitle} lang="en">
                {data.hero.title_a} <em>{data.hero.title_b}</em>
              </h1>
              <p className={sh.heroIntro}>{lang === "es" ? data.hero.intro_es : data.hero.intro_en}</p>
              <ul className={sh.chips} aria-label={t.chipsAria}>
                {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((chip, i) => (
                  <li key={chip}>
                    <Icon name={(["clock", "video", "shield", "trophy"] as const)[i] ?? "doc"} size={18} />
                    {chip}
                  </li>
                ))}
              </ul>
              <div className={s.priv}>
                <span className={s.privI}>
                  <Icon name="lock" size={20} />
                </span>
                <p>
                  <strong>{data.hero.priv_b[lang]}</strong> {data.hero.priv_p[lang]}
                </p>
              </div>
            </section>

            {/* ---------- step 1: the script ---------- */}
            <section id="v0" className={sh.step} aria-labelledby="vd-s1">
              <StepHead kicker={`${t.step} 1`} icon="doc" id="vd-s1" title={t.s1} />
              <p className={sh.intro}>{data.week === 1 ? t.s1i : fromStarter ? t.s1is(data.must.length) : t.s1in(data.must.length)}</p>
              <ol className={s.must} style={{ "--n": data.must.length } as React.CSSProperties}>
                {data.must.map((m, i) => (
                  <li key={i} style={{ "--c": m.color } as React.CSSProperties}>
                    <b aria-hidden>{i + 1}</b>
                    <span>
                      {m[lang]}
                      {m.ex && (
                        <small className={s.mustEx} lang="en">
                          “{m.ex}”
                        </small>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {data.example_line && (
                <p className={s.exLine}>
                  <b>{t.exK}</b> {data.example_line[lang]}
                </p>
              )}
              <div className={`${sh.card} ${s.scr}`}>
                <div className={s.scrh}>
                  <label htmlFor="vd-script" className={s.scrK}>
                    {t.scrK}
                  </label>
                  {fromWriting && (
                    <span className={s.src}>
                      <Icon name="check" size={15} />
                      {data.week === 1 ? t.scrSrc : t.scrSrcN}
                    </span>
                  )}
                  {fromStarter && (
                    <span className={s.src}>
                      <Icon name="doc" size={15} />
                      {t.scrStart}
                    </span>
                  )}
                  {starter && !fromStarter && script.trim() !== starter.trim() && (
                    <button type="button" className={s.useStarter} onClick={() => onScript(starter)}>
                      <Icon name="doc" size={15} />
                      {t.useStarter}
                    </button>
                  )}
                </div>
                {starter && data.script_starter && lang === "es" && <p className={s.starterNote}>{data.script_starter.es}</p>}
                <textarea id="vd-script" value={script} placeholder={data.week === 1 ? t.scrPh : t.scrPhN} lang="en" maxLength={6000} onChange={(e) => onScript(e.target.value)} />
                <div className={s.time} data-ok={inZone(est) || undefined}>
                  <span className={s.tt2}>
                    {t.tAt}
                    <b>{fmtTime(est)}</b>
                  </span>
                  <span className={s.bar} aria-hidden>
                    <span className={s.zone} style={{ left: `${(data.seconds.min / data.auto_stop_s) * 100}%`, width: `${((data.seconds.max - data.seconds.min) / data.auto_stop_s) * 100}%` }} />
                    <i style={{ width: `${Math.min(100, (est / data.auto_stop_s) * 100)}%` }} />
                  </span>
                  <small>{t.tGoal(fmtTime(data.seconds.min), fmtTime(data.seconds.max))}</small>
                </div>
              </div>
            </section>

            {/* ---------- step 2: get ready ---------- */}
            <section id="v1" className={sh.step} aria-labelledby="vd-s2">
              <StepHead kicker={`${t.step} 2`} icon="sun" id="vd-s2" title={t.s2} />
              <p className={sh.intro}>{t.s2i}</p>
              <ul className={s.tips}>
                {data.tips.map((x, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={s.tipc}
                      aria-pressed={tips.includes(i)}
                      onClick={() => setTips((cur) => (cur.includes(i) ? cur.filter((y) => y !== i) : [...cur, i]))}
                    >
                      <span className={s.ti3}>
                        <Icon name={iconOr(x.icon, "check")} size={20} />
                      </span>
                      <b>{x[lang]}</b>
                      <span>{lang === "es" ? x.desc_es : x.desc_en}</span>
                      <span className={s.ck} aria-hidden>
                        <Icon name="check" size={15} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className={s.ready} data-ok={tips.length === data.tips.length || undefined} aria-live="polite">
                {tips.length === data.tips.length && <Icon name="check" size={18} />}
                {tips.length === data.tips.length ? t.readyOk : t.ready(tips.length, data.tips.length)}
              </p>
              <ul className={s.deliver}>
                {data.delivery[lang].map(([a, b]) => (
                  <li key={a}>
                    <b>{a}</b>
                    {b}
                  </li>
                ))}
              </ul>
              {data.ai_challenge && data.ai_challenge.prompts.length > 0 && (
                <div className={s.ai}>
                  <p className={s.aiK}>
                    <Icon name="spark" size={16} /> {t.aiK}
                  </p>
                  <p>{lang === "es" ? data.ai_challenge.intro_es : data.ai_challenge.intro_en}</p>
                  <div className={s.aiPrompts}>
                    {data.ai_challenge.prompts.map((pr, j) => (
                      <button
                        key={pr}
                        type="button"
                        lang="en"
                        data-ok={copiedAi === j || undefined}
                        onClick={() => {
                          void navigator.clipboard?.writeText(pr).catch(() => undefined);
                          setCopiedAi(j);
                        }}
                      >
                        <Icon name={copiedAi === j ? "check" : "copy"} size={16} />
                        <span>“{pr}”</span>
                        {copiedAi === j && <span className={sh.sr}> {t.copied}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ---------- step 3: record ---------- */}
            <section id="v2" className={sh.step} aria-labelledby="vd-s3">
              <StepHead kicker={`${t.step} 3`} icon="cam" id="vd-s3" title={t.s3} />
              <p className={sh.intro}>{t.s3i}</p>
              <div className={`${sh.card} ${s.rec}`} data-recording={recording || undefined}>
                <div className={s.stage} role="region" aria-label={t.stage}>
                  {recording && <video ref={liveRef} className={s.mirror} playsInline muted aria-hidden />}
                  {phase === "review" && blobUrl && <video src={blobUrl} controls playsInline aria-label={t.yourVideo} />}
                  {stageImg && (
                    // eslint-disable-next-line @next/next/no-img-element -- a data: URL or a short-lived signed URL
                    <img src={stageImg} alt="" />
                  )}
                  {phase === "idle" && (
                    <div className={s.ph}>
                      <div>
                        <span className={s.cam}>
                          <Icon name="cam" size={30} />
                        </span>
                        <b>{t.camT}</b>
                        <small role={camError ? "alert" : undefined}>{camError ? t.noCam : t.camS}</small>
                      </div>
                    </div>
                  )}
                  {(phase === "idle" || recording) && <span className={s.guide} aria-hidden />}
                  {showPrompt && (phase === "idle" || recording) && (
                    <div className={s.prompt} aria-hidden={!recording}>
                      <p ref={promptRef} lang="en" style={{ transform: `translateY(${promptShift}px)` }}>
                        {script}
                      </p>
                    </div>
                  )}
                  {(phase === "idle" || recording) && (
                    <div className={s.hud}>
                      <span className={s.timer} data-ok={inZone(elapsed) || undefined} role="timer" aria-live="off">
                        <i aria-hidden />
                        <span>{fmtTime(elapsed)}</span> / {fmtTime(data.seconds.max)}
                      </span>
                      <span className={s.tag2}>{recording ? t.stopHint : t.recHint}</span>
                    </div>
                  )}
                </div>
                {(phase === "idle" || recording) && (
                  <>
                    <div className={s.ctrl}>
                      <button type="button" className={s.btnDk} aria-pressed={showPrompt} onClick={() => setShowPrompt((v) => !v)}>
                        <Icon name="text" size={18} />
                        {t.prompt}
                      </button>
                      <button type="button" className={s.recbtn} aria-label={recording ? t.stopHint : t.recHint} onClick={() => (recording ? stopRec() : void startRec())}>
                        <span />
                      </button>
                      <button type="button" className={s.btnDk} onClick={() => fileRef.current?.click()} disabled={recording}>
                        <Icon name="upload" size={18} />
                        {t.upl}
                      </button>
                      <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
                    </div>
                    <p className={s.recnote}>
                      <Icon name="lock" size={13} /> {t.recNote}
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* ---------- step 4: review and save ---------- */}
            {showStep4 && (
              <section id="v3" className={sh.step} aria-labelledby="vd-s4">
                <StepHead kicker={`${t.step} 4`} icon="image" id="vd-s4" title={t.s4} />
                <div className={sh.card}>
                  {phase === "saved" ? (
                    <>
                      <div className={s.saved}>
                        <div className={s.thumb}>
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element -- a data: URL or a short-lived signed URL
                            <img src={thumb} alt={t.thumbOk} />
                          )}
                          <span className={s.ok}>
                            <Icon name="check" size={13} />
                            {t.thumbOk}
                          </span>
                          {dur > 0 && <span className={s.d}>{fmtTime(dur)}</span>}
                        </div>
                        <div>
                          <p className={s.k}>{t.doneK}</p>
                          <h3 className={s.savedH}>{t.doneH}</h3>
                          <p className={s.savedP}>{t.doneP}</p>
                          <ul className={s.meta3}>
                            {dur > 0 && (
                              <li>
                                <Icon name="clock" size={14} />
                                {fmtTime(dur)} min
                              </li>
                            )}
                            {dateLabel && (
                              <li>
                                <Icon name="cal" size={14} />
                                {dateLabel}
                              </li>
                            )}
                            <li>
                              <Icon name="trophy" size={14} />
                              {t.capL(data.capstone_part)}
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className={s.acts}>
                        {blobUrl && (
                          <a className={s.btnP} href={blobUrl} download={`mi-presentacion.${mime.includes("mp4") ? "mp4" : "webm"}`}>
                            <Icon name="download" size={18} />
                            {t.dl}
                          </a>
                        )}
                        <button type="button" className={s.btnO} onClick={again}>
                          <Icon name="redo" size={18} />
                          {t.again}
                        </button>
                      </div>
                      {blobUrl && (
                        <p className={s.note2}>
                          <Icon name="lock" size={18} />
                          <span>{t.note}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={sh.intro}>{t.s4i}</p>
                      {phase === "uploading" ? (
                        <div className={s.up} role="status">
                          {/* eslint-disable-next-line @next/next/no-img-element -- the chosen frame (data: URL) */}
                          <img src={frames[pick]} alt="" />
                          <div className={s.uinfo}>
                            <b>{t.upT}</b>
                            <small>{t.upS}</small>
                            <div className={s.pb}>
                              <i style={{ width: `${upPct}%` }} />
                            </div>
                            <p className={s.stay}>
                              <Icon name="shield" size={15} />
                              {t.upStay}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={s.lab2} id="vd-pick">
                            {t.pick}
                          </p>
                          <div className={s.film} role="group" aria-labelledby="vd-pick">
                            {frames.map((f, i) => (
                              <button key={i} type="button" aria-pressed={i === pick} onClick={() => setPick(i)} aria-label={t.frameAt(fmtTime((dur * (i + 0.5)) / frames.length))}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- a frame of the local video (data: URL) */}
                                <img src={f} alt="" />
                                <small aria-hidden>{fmtTime((dur * (i + 0.5)) / frames.length)}</small>
                              </button>
                            ))}
                          </div>
                          <p className={s.lab2} id="vd-self">
                            {t.self}
                          </p>
                          <ul className={s.selfck} aria-labelledby="vd-self">
                            {data.must.map((m, i) => (
                              <li key={i}>
                                <button
                                  type="button"
                                  aria-pressed={self.includes(i)}
                                  onClick={() => setSelf((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()))}
                                >
                                  <i aria-hidden>
                                    <Icon name="check" size={15} />
                                  </i>
                                  {m[lang]}
                                  <em style={{ "--c": m.color } as React.CSSProperties} aria-hidden />
                                </button>
                              </li>
                            ))}
                          </ul>
                          <p className={s.lab2} id="vd-feel">
                            {t.feel}
                          </p>
                          <div className={s.feel} role="group" aria-labelledby="vd-feel">
                            {t.feels.map((f, i) => (
                              <button key={i} type="button" aria-pressed={feel === i} onClick={() => setFeel(i)}>
                                <span aria-hidden>{i + 1}</span>
                                {f}
                              </button>
                            ))}
                          </div>
                          <div className={s.savebar}>
                            <button type="button" className={s.btnP} onClick={() => void save()} disabled={!frames.length}>
                              <Icon name="upload" size={18} />
                              {t.save}
                            </button>
                            <p>
                              <Icon name="shield" size={16} />
                              {t.saveN}
                            </p>
                          </div>
                          {error && (
                            <p className={s.err} role="alert">
                              {t.err}
                            </p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            <Pager lang={lang} prev={p.prev} next={p.next} label={(x) => navTitle(x, lang)} />
          </>
        }
        rail={
          <>
            <RailCard title={t.rail}>
              <RailSteps steps={t.steps} current={current} done={seen} onGo={(i) => goTo(i === 3 && !showStep4 ? "v2" : IDS[i])} />
            </RailCard>
            <RailCard title={t.privH}>
              <p className={`${s.privRow} ${s.y}`}>
                <Icon name="check" size={18} />
                <span>{t.privY}</span>
              </p>
              <p className={`${s.privRow} ${s.n}`}>
                <Icon name="x" size={18} />
                <span>{t.privN}</span>
              </p>
            </RailCard>
          </>
        }
      />
    </ShellPage>
  );
}
