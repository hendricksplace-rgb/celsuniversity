"use client";

// CelsBSNS "Mi Capstone" (celsu-celsbsns-capstone-brief.md, celsbsns-capstone-mockup.html): the hero with the N/10
// ring, the 10 parts as a timeline (current / done / locked), Part 1's evidence cards and 4 required fields that
// autosave to capstone_parts.fields, "Marcar la Parte N como completa" (sets completed_at), the Week 10 final card,
// the rail, and the "Ver mi perfil" preview that prints as the PDF. No coach: the app only checks the minimums.
import { fileHref } from "@/lib/file-href";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAPSTONE_PARTS, INPUT_MAX, RESUME_MAX_BYTES, fieldOk, partBody, partReady, resumePath, splitName, type CapField, type CapFields, type CapPart, type Lang } from "@/lib/capstone";
import type { CapstoneLoad, Evidence } from "@/lib/capstone-server";
import { Icon, Layout, RailCard, ShellPage, TopBar, shell as sh, useLangPref } from "@/components/bsns/shell";
import s from "./capstone.module.css";

const UI = {
  es: {
    kicker: "CELSBSNS · PROYECTO FINAL",
    title: "Mi Capstone",
    back: (n: number) => `Volver a la semana ${n}`,
    kick: "PROYECTO FINAL · CAPSTONE",
    h1a: "Mi perfil",
    h1b: "profesional",
    sub: "Tu Capstone es el documento que construyes durante las 10 semanas: una parte cada semana. Es obligatorio. Lo presentas en tu entrevista final y lo necesitas para tu certificado.",
    ring: (b: number) => `de ${b} partes`,
    ringAria: (a: number, b: number) => `${a} de ${b} partes completas`,
    req: ["Completa las 10 partes", "Tu currículum final (Parte 10)", "Tu entrevista simulada en la semana 10"],
    partsH: "Las 10 partes",
    partsI: "Cada parte se abre en su semana. Complétala antes de cerrar esa semana.",
    wk: (w: number, n: number) => `SEMANA ${w} · PARTE ${n}`,
    cur: "Esta semana",
    pending: "Pendiente",
    done: "Completa",
    locked: (n: number) => `Se abre en la semana ${n}`,
    from: (n: number) => `YA LO TRAES DE TU SEMANA ${n}`,
    evW: (w: number): string => (w === 1 ? "Tu correo de presentación" : "Tu Writing de la semana"),
    evWp: (n: number, fin: boolean) => `${n} palabras · ${fin ? "terminado" : "borrador"}`,
    evV: "Tu video",
    evVAlt: "Miniatura de tu video",
    evS: "Tu mejor intento de Speaking",
    notYet: "Aún no lo haces",
    goW: "Ir a Writing",
    goV: "Ir al video",
    goS: "Ir a Speaking",
    see: "Ver",
    req2: "OBLIGATORIO",
    fillBtn: "Usar lo de mi semana",
    chars: (a: number, b: number) => `${a} caracteres · mínimo ${b}`,
    complete: (n: number) => `Marcar la Parte ${n} como completa`,
    compN: (n: number) => (n === 1 ? "Te falta 1 campo para completar esta parte." : `Llena los ${n} campos para completar esta parte.`),
    compOk: "Todo listo. Puedes seguir editándola después.",
    doneLine: (n: number) => `Parte ${n} completa. Puedes editarla cuando quieras hasta la semana 10.`,
    lockIntro: "En esta parte vas a incluir:",
    soon: "Las preguntas de esta parte se publican con el contenido de su semana.",
    finK: "SEMANA 10 · PRESENTACIÓN FINAL",
    finH: "Tu entrevista simulada en vivo",
    finP: "Presentas tu perfil completo en una entrevista de 50 minutos. Para tener tu certificado necesitas:",
    fl: ["Las 10 partes completas", "Tu currículum final en PDF", "Repasar el método STAR", "Tu entrevista en vivo de 50 minutos"],
    flDone: "hecho",
    flTodo: "pendiente",
    rail: "TU AVANCE",
    railAria: "Tu Capstone",
    pv: "VISTA PREVIA",
    pvP: "Así se ve tu perfil hoy. Crece con cada parte que completas.",
    pvB: "Ver mi perfil",
    pdf: "Descargar PDF",
    close: "Cerrar",
    dht: "Mi perfil profesional",
    empty: (n: number) => `Se completa en la semana ${n}`,
    docTag: "CELSBSNS · PERFIL PROFESIONAL",
    docName: "Tu nombre",
    docRole: "Tu puesto",
    toast: (n: number) => `Parte ${n} completa. ¡Bien hecho!`,
    mob: (a: number, b: number) => `${a} de ${b} partes`,
    saving: "Guardando…",
    saved: "Guardado",
    saveErr: "No se pudo guardar. Revisa tu conexión; lo intentamos otra vez al escribir.",
    fileNone: "Aún no subes tu currículum.",
    fileUp: "Subir mi PDF",
    fileRe: "Reemplazar PDF",
    fileSee: "Ver mi PDF",
    fileBusy: "Subiendo…",
    fileOk: "Currículum subido",
    fileReq: "Archivo PDF · máximo 5 MB",
    fileBadType: "Sube un archivo PDF.",
    fileBig: "El archivo pesa más de 5 MB.",
    fileErr: "No se pudo subir. Revisa tu conexión e inténtalo otra vez.",
    resumeDoc: "Currículum final adjunto (PDF)",
    phrases: "Mis frases",
    phrasesSub: "Las frases que guardaste en Research. Úsalas en tu Capstone.",
    phrasesNone: "Aún no guardas frases. En Research toca “Guardar” en una frase y aparecerá aquí.",
  },
  en: {
    kicker: "CELSBSNS · FINAL PROJECT",
    title: "My Capstone",
    back: (n: number) => `Back to week ${n}`,
    kick: "FINAL PROJECT · CAPSTONE",
    h1a: "My professional",
    h1b: "profile",
    sub: "Your Capstone is the document you build over the 10 weeks: one part each week. It's required. You present it in your final interview and you need it for your certificate.",
    ring: (b: number) => `of ${b} parts`,
    ringAria: (a: number, b: number) => `${a} of ${b} parts complete`,
    req: ["Complete all 10 parts", "Your final resume (Part 10)", "Your mock interview in Week 10"],
    partsH: "The 10 parts",
    partsI: "Each part opens in its week. Complete it before you close that week.",
    wk: (w: number, n: number) => `WEEK ${w} · PART ${n}`,
    cur: "This week",
    pending: "Pending",
    done: "Complete",
    locked: (n: number) => `Opens in Week ${n}`,
    from: (n: number) => `ALREADY FROM YOUR WEEK ${n}`,
    evW: (w: number): string => (w === 1 ? "Your introduction email" : "This week's Writing"),
    evWp: (n: number, fin: boolean) => `${n} words · ${fin ? "finished" : "draft"}`,
    evV: "Your video",
    evVAlt: "Your video thumbnail",
    evS: "Your best Speaking try",
    notYet: "Not done yet",
    goW: "Go to Writing",
    goV: "Go to the video",
    goS: "Go to Speaking",
    see: "See",
    req2: "REQUIRED",
    fillBtn: "Use what I did this week",
    chars: (a: number, b: number) => `${a} characters · minimum ${b}`,
    complete: (n: number) => `Mark Part ${n} as complete`,
    compN: (n: number) => (n === 1 ? "1 field left to complete this part." : `Fill in all ${n} fields to complete this part.`),
    compOk: "All set. You can keep editing it later.",
    doneLine: (n: number) => `Part ${n} complete. You can edit it anytime until Week 10.`,
    lockIntro: "In this part you'll include:",
    soon: "The questions for this part are published with that week's content.",
    finK: "WEEK 10 · FINAL PRESENTATION",
    finH: "Your live mock interview",
    finP: "You present your full profile in a 50-minute interview. To earn your certificate you need:",
    fl: ["All 10 parts complete", "Your final resume as a PDF", "Review the STAR method", "Your 50-minute live interview"],
    flDone: "done",
    flTodo: "to do",
    rail: "YOUR PROGRESS",
    railAria: "Your Capstone",
    pv: "PREVIEW",
    pvP: "This is how your profile looks today. It grows with every part you complete.",
    pvB: "See my profile",
    pdf: "Download PDF",
    close: "Close",
    dht: "My professional profile",
    empty: (n: number) => `Completed in Week ${n}`,
    docTag: "CELSBSNS · PROFESSIONAL PROFILE",
    docName: "Your name",
    docRole: "Your role",
    toast: (n: number) => `Part ${n} complete. Well done!`,
    mob: (a: number, b: number) => `${a} of ${b} parts`,
    saving: "Saving…",
    saved: "Saved",
    saveErr: "Couldn't save. Check your connection; we'll try again when you type.",
    fileNone: "You haven't uploaded your resume yet.",
    fileUp: "Upload my PDF",
    fileRe: "Replace PDF",
    fileSee: "See my PDF",
    fileBusy: "Uploading…",
    fileOk: "Resume uploaded",
    fileReq: "PDF file · 5 MB max",
    fileBadType: "Upload a PDF file.",
    fileBig: "The file is larger than 5 MB.",
    fileErr: "Couldn't upload. Check your connection and try again.",
    resumeDoc: "Final resume attached (PDF)",
    phrases: "My phrases",
    phrasesSub: "The phrases you saved in Research. Use them in your Capstone.",
    phrasesNone: "No saved phrases yet. In Research, tap “Save” on a phrase and it will show up here.",
  },
};
type UIT = (typeof UI)["es"];
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
type Save = "saving" | "saved" | "error" | null;

export function Capstone({ d, userId, defaultLang }: { d: CapstoneLoad; userId: string; defaultLang: Lang }) {
  const [lang, chooseLang] = useLangPref(userId, defaultLang);
  const t = UI[lang];
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);

  const [values, setValues] = useState<Record<number, CapFields>>(() => {
    const v: Record<number, CapFields> = {};
    for (const def of CAPSTONE_PARTS) v[def.part] = { ...(d.rows[def.part]?.fields ?? {}) };
    // Part 1's name starts from the profile name (the student adds the role).
    if (!v[1].name && d.prefillName) v[1].name = d.prefillName;
    return v;
  });
  const [sources, setSources] = useState<Record<number, Record<string, string>>>(() =>
    Object.fromEntries(CAPSTONE_PARTS.map((p) => [p.part, { ...(d.rows[p.part]?.sources ?? {}) }])),
  );
  const [doneAt, setDoneAt] = useState<Record<number, string | null>>(() => Object.fromEntries(CAPSTONE_PARTS.map((p) => [p.part, d.rows[p.part]?.completedAt ?? null])));
  const firstOpen = CAPSTONE_PARTS.find((p) => p.week === d.currentWeek && !d.rows[p.part]?.completedAt)?.part;
  const [open, setOpen] = useState<Set<number>>(() => new Set(firstOpen ? [firstOpen] : []));
  const [save, setSave] = useState<Record<number, Save>>({});
  const [toast, setToast] = useState<number | null>(null);
  const [pv, setPv] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nd = CAPSTONE_PARTS.filter((p) => doneAt[p.part]).length;

  // ---------- autosave (about 700 ms after typing stops), one row per part ----------
  const latest = useRef({ values, sources, doneAt });
  latest.current = { values, sources, doneAt };
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const saveNow = useCallback(
    async (part: number, complete = false) => {
      clearTimeout(timers.current.get(part));
      timers.current.delete(part);
      const def = CAPSTONE_PARTS.find((p) => p.part === part)!;
      const v = latest.current.values[part] ?? {};
      const src = latest.current.sources[part] ?? {};
      const ready = partReady(def, v);
      const wasDone = latest.current.doneAt[part];
      // A completed part that drops below a minimum goes back to "not complete".
      const completed_at = complete && ready ? new Date().toISOString() : wasDone && !ready ? null : undefined;
      setSave((x) => ({ ...x, [part]: "saving" }));
      const { error } = await db()
        .from("capstone_parts")
        .upsert(
          {
            user_id: userId,
            course_id: d.courseId,
            part,
            title: def.title.es,
            fields: v,
            sources: src,
            body: partBody(def, v),
            ...(src.submission ? { source_submission_id: src.submission } : {}),
            ...(completed_at !== undefined ? { completed_at } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id,part" },
        );
      setSave((x) => ({ ...x, [part]: error ? "error" : "saved" }));
      if (!error && completed_at !== undefined) setDoneAt((x) => ({ ...x, [part]: completed_at }));
      return !error;
    },
    [db, userId, d.courseId],
  );
  const schedule = useCallback(
    (part: number) => {
      clearTimeout(timers.current.get(part));
      timers.current.set(
        part,
        setTimeout(() => void saveNow(part), 700),
      );
    },
    [saveNow],
  );
  useEffect(() => {
    const pending = timers.current;
    const flush = () => pending.forEach((_, part) => void saveNow(part));
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [saveNow]);

  const setField = (part: number, k: string, val: string) => {
    setValues((x) => ({ ...x, [part]: { ...x[part], [k]: val } }));
    schedule(part);
  };
  const fill = (part: number, k: string, val: string, src: Record<string, string>) => {
    setValues((x) => ({ ...x, [part]: { ...x[part], [k]: val } }));
    setSources((x) => ({ ...x, [part]: { ...x[part], ...src } }));
    schedule(part);
  };
  const complete = async (def: CapPart) => {
    // The video used for this part is recorded too (the profile header shows its thumbnail).
    const vid = d.evidence[def.week]?.video;
    const videoId = vid && !("missing" in vid) ? vid.id : null;
    if (videoId) {
      const next = { ...latest.current.sources, [def.part]: { ...latest.current.sources[def.part], video_proof: videoId } };
      latest.current.sources = next;
      setSources(next);
    }
    if (await saveNow(def.part, true)) {
      setOpen((o) => {
        const n = new Set(o);
        n.delete(def.part);
        return n;
      });
      setToast(def.part);
      setTimeout(() => setToast(null), 2600);
      requestAnimationFrame(() => document.getElementById(`p${def.part}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };
  // Part 10's resume: a PDF in the private resumes bucket, in the student's own folder (replaced on re-upload).
  const upload = async (part: number, k: string, file: File): Promise<string | null> => {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return t.fileBadType;
    if (file.size > RESUME_MAX_BYTES) return t.fileBig;
    const path = resumePath(userId, d.courseId);
    const { error } = await db().storage.from("resumes").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (error) return t.fileErr;
    const next = { ...latest.current.values, [part]: { ...latest.current.values[part], [k]: path } };
    latest.current.values = next;
    setValues(next);
    return (await saveNow(part)) ? null : t.fileErr;
  };
  const toggle = (n: number) =>
    setOpen((o) => {
      const x = new Set(o);
      if (x.has(n)) x.delete(n);
      else x.add(n);
      return x;
    });
  const jump = (n: number) => {
    const def = CAPSTONE_PARTS[n - 1];
    if (def.week <= d.currentWeek) setOpen((o) => new Set(o).add(n));
    requestAnimationFrame(() => document.getElementById(`p${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const row = (
    <>
      <span className={s.mobT}>
        <Icon name="trophy" size={16} className={s.mobIco} /> {t.mob(nd, 10)}
      </span>
      <button type="button" className={s.rowBtn} onClick={() => setPv(true)}>
        <Icon name="eye" size={16} />
        {t.pvB}
      </button>
    </>
  );

  const rail = (
    <>
      <RailCard title={t.rail}>
        <ol className={s.mini}>
          {CAPSTONE_PARTS.map((p) => {
            const done = !!doneAt[p.part];
            const cur = p.week === d.currentWeek && !done;
            const full = p.title[lang].split(/[?:]/)[0]!;
            const label = full.length > 24 ? `${full.slice(0, 24).trimEnd()}…` : full;
            return (
              <li key={p.part}>
                <button type="button" onClick={() => jump(p.part)} className={cx(done && s.mDone, cur && s.mCur)} aria-current={cur ? "step" : undefined} title={p.title[lang]}>
                  <i aria-hidden>{done ? <Icon name="check" size={13} /> : p.part}</i>
                  <span className={s.mLabel}>{label}</span>
                  {p.week > d.currentWeek && <small>{(lang === "es" ? "S" : "W") + p.week}</small>}
                </button>
              </li>
            );
          })}
        </ol>
      </RailCard>
      <RailCard title={t.pv}>
        <p className={s.pvP}>{t.pvP}</p>
        <button type="button" className={cx(s.btn, s.btnG, s.pvBtn)} onClick={() => setPv(true)}>
          <Icon name="eye" size={18} />
          {t.pvB}
        </button>
      </RailCard>
    </>
  );

  const main = (
    <>
      <section className={cx(sh.hero, s.hero)} aria-labelledby="cap-h1">
        <div className={s.hgrid}>
          <div>
            <p className={cx(sh.pill, s.kickGold)}>
              <Icon name="trophy" size={16} />
              {t.kick}
            </p>
            <h1 id="cap-h1" className={cx(sh.heroTitle, s.h1)}>
              {t.h1a} <em>{t.h1b}</em>
            </h1>
            <p className={sh.heroIntro}>{t.sub}</p>
          </div>
          <div className={s.ring} style={{ "--p": `${nd * 10}%` } as React.CSSProperties} role="img" aria-label={t.ringAria(nd, 10)}>
            <div aria-hidden>
              <b>{nd}/10</b>
              <span>{t.ring(10)}</span>
            </div>
          </div>
        </div>
        <ul className={s.req}>
          {t.req.map((r, k) => (
            <li key={r}>
              <Icon name={(["doc", "download", "people"] as const)[k]} size={20} />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className={s.sec} aria-labelledby="cap-parts">
        <div className={s.sh}>
          <span className={s.ti} aria-hidden>
            <Icon name="trophy" size={23} />
          </span>
          <div>
            <p className={s.shK}>CAPSTONE</p>
            <h2 id="cap-parts" className={s.shH}>
              {t.partsH}
            </h2>
          </div>
        </div>
        <p className={s.intro}>{t.partsI}</p>
        <ol className={s.parts}>
          {CAPSTONE_PARTS.map((def) => (
            <PartCard
              key={def.part}
              t={t}
              lang={lang}
              def={def}
              currentWeek={d.currentWeek}
              done={!!doneAt[def.part]}
              isOpen={open.has(def.part)}
              onToggle={() => toggle(def.part)}
              v={values[def.part] ?? {}}
              ev={d.evidence[def.week]}
              save={save[def.part] ?? null}
              onField={(k, val) => setField(def.part, k, val)}
              onFill={(k, val, src) => fill(def.part, k, val, src)}
              onComplete={() => void complete(def)}
              onUpload={(k, file) => upload(def.part, k, file)}
            />
          ))}
        </ol>
      </section>

      <section className={s.sec} aria-labelledby="cap-final">
        <div className={s.final}>
          <p className={s.finK}>{t.finK}</p>
          <h2 id="cap-final" className={s.finH}>
            {t.finH}
          </h2>
          <p className={s.finP}>{t.finP}</p>
          {/* Certificate checklist from data: the 10 completed parts and the Part 10 resume. The STAR review and the
              live interview (marked done by staff) have no data yet, so they render as pending. */}
          <ul className={s.fl}>
            {t.fl.map((f, k) => {
              const ok = k === 0 ? nd === 10 : k === 1 ? !!values[10]?.resume : false;
              return (
                <li key={f} className={cx(ok && s.flOk)}>
                  <i aria-hidden>{ok ? <Icon name="check" size={14} /> : null}</i>
                  <span>
                    {f}
                    {k === 0 ? ` · ${nd}/10` : ""}
                    <span className={sh.sr}> ({ok ? t.flDone : t.flTodo})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={s.sec} aria-labelledby="cap-phr">
        <details className={s.phr}>
          <summary>
            <span aria-hidden>★</span>
            <h2 id="cap-phr">{t.phrases}</h2>
            <em>{d.phrases.length}</em>
            <Icon name="chev" size={18} className={s.chev} />
          </summary>
          <p>{d.phrases.length ? t.phrasesSub : t.phrasesNone}</p>
          {d.phrases.length > 0 && (
            <ul>
              {d.phrases.map((ph) => (
                <li key={ph} lang="en">
                  {ph}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </>
  );

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        kicker={t.kicker}
        title={t.title}
        backHref={d.weekHref}
        backLabel={t.back(d.currentWeek)}
        lang={lang}
        onLang={chooseLang}
        progress={nd / 10}
        row={row}
      />
      <Layout main={main} rail={rail} railLabel={t.railAria} />
      {pv && <Preview t={t} lang={lang} values={values} doneAt={doneAt} thumb={d.thumb} onClose={() => setPv(false)} />}
      {mounted &&
        createPortal(
          <div className={cx(s.printRoot)} aria-hidden>
            <ProfileDoc t={t} lang={lang} values={values} doneAt={doneAt} thumb={d.thumb} />
          </div>,
          document.body,
        )}
      <div className={cx(s.toast, toast !== null && s.toastOn)} role="status" aria-live="polite">
        {toast !== null && (
          <>
            <Icon name="trophy" size={18} className={s.toastIco} />
            {t.toast(toast)}
          </>
        )}
      </div>
    </ShellPage>
  );
}

function PartCard({
  t,
  lang,
  def,
  currentWeek,
  done,
  isOpen,
  onToggle,
  v,
  ev,
  save,
  onField,
  onFill,
  onComplete,
  onUpload,
}: {
  t: UIT;
  lang: Lang;
  def: CapPart;
  currentWeek: number;
  done: boolean;
  isOpen: boolean;
  onToggle: () => void;
  v: CapFields;
  ev: Evidence | undefined;
  save: Save;
  onField: (k: string, val: string) => void;
  onFill: (k: string, val: string, src: Record<string, string>) => void;
  onComplete: () => void;
  onUpload: (k: string, file: File) => Promise<string | null>;
}) {
  const n = def.part;
  const lock = def.week > currentWeek;
  const cur = !done && !lock;
  const editable = def.fields.length > 0;
  const openNow = isOpen && !lock;
  const state = done ? (
    <span className={cx(s.stt, s.sDone)}>
      <Icon name="check" size={14} />
      {t.done}
    </span>
  ) : cur ? (
    <span className={cx(s.stt, s.sCur)}>
      <Icon name="pen" size={14} />
      {def.week === currentWeek ? t.cur : t.pending}
    </span>
  ) : (
    <span className={cx(s.stt, s.sLock)}>
      <Icon name="lock" size={14} />
      {t.locked(def.week)}
    </span>
  );
  const head = (
    <>
      <span className={s.phdT}>
        <small>{t.wk(def.week, n)}</small>
        <h3>{def.title[lang]}</h3>
      </span>
      {state}
    </>
  );
  const ready = partReady(def, v);
  const missing = def.fields.filter((f) => !fieldOk(f, v[f.k] ?? "")).length;
  const preview = (
    <div className={s.lockp}>
      <b>{t.lockIntro}</b>
      <ul>
        {def.preview[lang].map((x) => (
          <li key={x}>
            <Icon name="dot" size={15} />
            <span>{x}</span>
          </li>
        ))}
      </ul>
      {!lock && !editable && <p className={s.soon}>{t.soon}</p>}
    </div>
  );

  return (
    <li className={cx(s.part, done && s.done, cur && s.cur, lock && s.lock, openNow && s.open)} id={`p${n}`}>
      <span className={s.node} aria-hidden>
        {done ? <Icon name="check" size={20} /> : n}
      </span>
      <div className={s.pc}>
        {lock || !editable ? (
          <div className={s.phd}>{head}</div>
        ) : (
          <button type="button" className={s.phd} onClick={onToggle} aria-expanded={openNow} aria-controls={`pb${n}`}>
            {head}
          </button>
        )}
        {lock || !editable ? (
          preview
        ) : (
          <div className={s.pb} id={`pb${n}`} hidden={!openNow}>
            {def.why && <p className={s.why}>{def.why[lang]}</p>}
            {ev && (ev.writing || ev.video || ev.speaking) && <EvidenceBox t={t} week={def.week} ev={ev} />}
            {def.fields.map((f, j) => {
              const val = v[f.k] ?? "";
              const len = val.trim().length;
              const src = fillSource(f, ev);
              const id = `f${n}-${f.k}`;
              return (
                <div key={f.k} className={s.fld}>
                  <label htmlFor={id}>
                    <i aria-hidden>{j + 1}</i>
                    <span>{f.label[lang]}</span> <span className={s.rq}>{t.req2}</span>
                  </label>
                  {f.hint && (
                    <p className={s.hint} id={`${id}-h`}>
                      {f.hint[lang]}
                    </p>
                  )}
                  {f.type === "file" ? (
                    <ResumeField t={t} id={id} val={val} onUpload={(file) => onUpload(f.k, file)} />
                  ) : f.type === "input" ? (
                    <input
                      id={id}
                      className={s.inp}
                      value={val}
                      placeholder={f.placeholder}
                      maxLength={200}
                      onChange={(e) => onField(f.k, e.target.value)}
                      aria-describedby={`${id}-c${f.hint ? ` ${id}-h` : ""}`}
                      autoComplete="off"
                    />
                  ) : (
                    <textarea
                      id={id}
                      className={cx(s.inp, s.ta)}
                      value={val}
                      maxLength={4000}
                      onChange={(e) => onField(f.k, e.target.value)}
                      aria-describedby={`${id}-c${f.hint ? ` ${id}-h` : ""}`}
                      lang="en"
                    />
                  )}
                  <div className={s.cnt}>
                    <span id={`${id}-c`} className={cx(fieldOk(f, val) && s.ok)}>
                      {f.type === "file" ? (val ? t.fileOk : t.fileReq) : t.chars(len, f.min)}
                    </span>
                    {src && (
                      <button type="button" className={s.fill} onClick={() => onFill(f.k, src.text, src.src)}>
                        <Icon name="wand" size={14} />
                        {t.fillBtn}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {done ? (
              <p className={s.doneline}>
                <Icon name="check" size={18} />
                {t.doneLine(n)}
              </p>
            ) : (
              <div className={s.pfoot}>
                <button type="button" className={cx(s.btn, s.btnG)} disabled={!ready} onClick={onComplete}>
                  <Icon name="trophy" size={18} />
                  {t.complete(n)}
                </button>
                <p aria-live="polite">{ready ? t.compOk : t.compN(missing)}</p>
              </div>
            )}
            <p className={cx(s.saveSt, save === "error" && s.saveErr)} aria-live="polite">
              {save === "saving" ? t.saving : save === "saved" ? t.saved : save === "error" ? t.saveErr : ""}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

/** "Usar lo de mi semana": the text from that part's week, or null (the button is hidden when it's empty). */
function fillSource(f: CapField, ev: Evidence | undefined): { text: string; src: Record<string, string> } | null {
  if (!ev || !f.fill_from) return null;
  const fit = (x: string) => (f.type === "input" ? x.replace(/\s+/g, " ").slice(0, INPUT_MAX).trim() : x);
  const w = ev.writing && !("missing" in ev.writing) ? ev.writing : null;
  const v = ev.video && !("missing" in ev.video) ? ev.video : null;
  const sp = ev.speaking && !("missing" in ev.speaking) ? ev.speaking : null;
  const out: { text: string; src: Record<string, string> } | null =
    f.fill_from === "writing" && w?.body
      ? { text: w.body, src: { submission: w.id } }
      : f.fill_from === "speaking" && sp?.text
        ? { text: sp.text, src: { speaking_best: sp.id } }
        : f.fill_from === "video" && v?.script
          ? { text: v.script, src: { video_proof: v.id } }
          : f.fill_from === "research" && ev.research?.text
            ? { text: ev.research.text, src: { research_lesson: ev.research.id } }
            : null;
  return out && out.text.trim() ? { ...out, text: fit(out.text) } : null;
}

/** Part 10's resume: PDF only, 5 MB; "Ver mi PDF" opens a short-lived signed URL. */
function ResumeField({ t, id, val, onUpload }: { t: UIT; id: string; val: string; onUpload: (file: File) => Promise<string | null> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className={s.file}>
      <p className={cx(s.fileSt, val && s.fileHas)}>
        <Icon name={val ? "check" : "doc"} size={18} />
        {val ? t.fileOk : t.fileNone}
      </p>
      <div className={s.fileRow}>
        <button type="button" id={id} className={cx(s.btn, val ? s.btnS : s.btnG, s.fileBtn)} disabled={busy} onClick={() => input.current?.click()} aria-describedby={`${id}-c ${id}-h`}>
          <Icon name="upload" size={18} />
          {busy ? t.fileBusy : val ? t.fileRe : t.fileUp}
        </button>
        {val && (
          // Signed on the server when tapped (/app/archivo): no browser-side signing, and no pop-up blocked after an await.
          <a href={fileHref(`storage://resumes/${val}`)} target="_blank" rel="noopener" className={cx(s.btn, s.btnS, s.fileBtn)}>
            <Icon name="eye" size={18} />
            {t.fileSee}
          </a>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setErr(null);
          setErr(await onUpload(file));
          setBusy(false);
        }}
      />
      {err && (
        <p className={s.fileErr} role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

function EvidenceBox({ t, week, ev }: { t: UIT; week: number; ev: Evidence }) {
  const missing = (href: string, go: string) => (
    <>
      <p>{t.notYet}</p>
      <Link prefetch={false} className={cx(s.btn, s.btnS, s.evBtn)} href={href}>
        {go}
        <Icon name="next" size={16} />
      </Link>
    </>
  );
  return (
    <div className={s.from}>
      <h4>
        <Icon name="link" size={16} />
        {t.from(week)}
      </h4>
      <div className={s.ev}>
        {ev.writing && (
          <div className={s.evc}>
            <b>
              {"missing" in ev.writing ? <Icon name="mail" size={16} className={s.evMiss} /> : <Icon name="check" size={16} />}
              {t.evW(week)}
            </b>
            {"missing" in ev.writing ? (
              missing(ev.writing.href, t.goW)
            ) : (
              <>
                <p>{t.evWp(ev.writing.words, ev.writing.finished)}</p>
                <Link prefetch={false} className={cx(s.btn, s.btnS, s.evBtn)} href={ev.writing.href}>
                  <Icon name="mail" size={16} />
                  {t.see}
                </Link>
              </>
            )}
          </div>
        )}
        {ev.video && (
          <div className={s.evc}>
            <b>
              {"missing" in ev.video ? <Icon name="video" size={16} className={s.evMiss} /> : <Icon name="check" size={16} />}
              {t.evV}
            </b>
            {"missing" in ev.video ? (
              missing(ev.video.href, t.goV)
            ) : ev.video.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL from a private bucket
              <img src={ev.video.thumb} alt={t.evVAlt} width={320} height={180} />
            ) : (
              <span className={s.evPh} aria-hidden />
            )}
          </div>
        )}
        {ev.speaking && (
          <div className={s.evc}>
            <b>
              {"missing" in ev.speaking ? <Icon name="mic" size={16} className={s.evMiss} /> : <Icon name="check" size={16} />}
              {t.evS}
            </b>
            {"missing" in ev.speaking ? missing(ev.speaking.href, t.goS) : <p lang="en">“{ev.speaking.text}”</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** The profile document as it prints ("Descargar PDF"): built from the parts; future parts are dashed placeholders. */
function ProfileDoc({ t, lang, values, doneAt, thumb }: { t: UIT; lang: Lang; values: Record<number, CapFields>; doneAt: Record<number, string | null>; thumb: string | null }) {
  const [name, role] = splitName(values[1]?.name ?? "");
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric" })), [lang]);
  return (
    <div className={s.doc}>
      <div className={s.top3}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL from a private bucket
          <img src={thumb} alt="" width={120} height={68} />
        ) : (
          <span className={s.docPh} aria-hidden />
        )}
        <div>
          <span className={s.tag}>{t.docTag}</span>
          <p className={s.docName}>{name || t.docName}</p>
          <p className={s.role}>{role || t.docRole}</p>
        </div>
      </div>
      {CAPSTONE_PARTS.map((def) => {
        const v = values[def.part] ?? {};
        if (def.doc)
          return def.doc.map((sec) => {
            const x = (v[sec.k] ?? "").trim();
            return (
              <div key={`${def.part}-${sec.k}`}>
                <p className={s.docH}>{sec.h[lang]}</p>
                {x ? <p className={cx(s.docP, sec.quote && s.pitch)}>{sec.quote ? `“${x}”` : x}</p> : <p className={s.empty}>{t.empty(def.week)}</p>}
              </div>
            );
          });
        const filled = def.fields.filter((f) => (v[f.k] ?? "").trim());
        return (
          <div key={def.part}>
            <p className={s.docH}>{def.title[lang].toUpperCase()}</p>
            {doneAt[def.part] && filled.length ? (
              filled.map((f) =>
                f.type === "file" ? (
                  <p key={f.k} className={s.docFile}>
                    {t.resumeDoc}
                  </p>
                ) : (
                  <div key={f.k}>
                    <p className={s.docL}>{f.label[lang]}</p>
                    <p className={s.docP}>{v[f.k]}</p>
                  </div>
                ),
              )
            ) : (
              <p className={s.empty}>{t.empty(def.week)}</p>
            )}
          </div>
        );
      })}
      <div className={s.foot}>
        <span>CelsUniversity · CelsBSNS</span>
        <span>{today}</span>
      </div>
    </div>
  );
}

/** "Ver mi perfil": a centered panel on desktop, full screen on phone. Focus moves in, Tab stays inside, Esc closes. */
function Preview({ t, lang, values, doneAt, thumb, onClose }: { t: UIT; lang: Lang; values: Record<number, CapFields>; doneAt: Record<number, string | null>; thumb: string | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && boxRef.current) {
        const f = boxRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [onClose]);
  return (
    <div className={s.drawer}>
      <div className={s.dbg} onClick={onClose} aria-hidden />
      <div className={s.pnl} ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="cap-pv-h">
        <div className={s.dh}>
          <h2 id="cap-pv-h">{t.dht}</h2>
          <button type="button" className={cx(s.btn, s.btnG, s.pdfBtn)} onClick={() => window.print()}>
            <Icon name="download" size={18} />
            {t.pdf}
          </button>
          <button ref={closeRef} type="button" className={s.x} onClick={onClose} aria-label={t.close}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <ProfileDoc t={t} lang={lang} values={values} doneAt={doneAt} thumb={thumb} />
      </div>
    </div>
  );
}
