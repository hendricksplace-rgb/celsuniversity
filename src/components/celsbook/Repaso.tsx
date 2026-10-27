"use client";

// CelsUS CelsBook "Repaso" (celsus-repaso-mockup.html): the book's quiz (ebooks.quiz), one question at a time,
// shuffled options, right/wrong pop with sounds and confetti, and an English/Spanish switch when the data has
// the Spanish fields (q_es, options_es). Track C (65/20) gets a card that points to their 20 questions instead.
import "./celsbook.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackButtons, type UsBack } from "@/components/celsus/BackButtons";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { afterPartFinished } from "@/app/app/cursos/[slug]/episodio/[n]/terminado/actions";
import type { QuizItem } from "@/lib/ebook-format";
import { isStarred } from "@/lib/celsbook";
import { SignedUrls, useSignedRef } from "@/components/reader/media";
import { jakartaItalic } from "./fonts";
import { Immersive } from "./Immersive";

/** A quiz item with the optional fields Cowork adds (Spanish, audio, starred). */
export type RepasoItem = QuizItem & {
  q_es?: string;
  options_es?: string[];
  why_es?: string;
  why_en?: string;
  audio_en?: string | null;
  audio_es?: string | null;
  starred?: boolean;
  uscis_2025_no?: number;
};
type Lang = "en" | "es";
export type Track = "A" | "B" | "C" | null;

type Props = {
  items: RepasoItem[];
  episodeN: number;
  track: Track;
  /** The CelsBook's screen titles, for "Repasar en la página …" */
  screens: { id: string; title: string }[];
  /** The CelsBook (/app/libros/<slug>) */
  bookHref: string;
  episodeHref: string;
  /** C-013 back buttons (course + episode). */
  back?: UsBack;
  courseSlug: string;
  /** The episode's Part 6 lesson: finishing records it (progress + XP, as the CelsTV quiz) with the score. */
  lessonId: string | null;
  videoHref: string | null;
  /** "Practicar mis 20 preguntas" (track C) */
  starredHref: string | null;
  userId: string;
  sound: boolean;
  /** storage:// → signed URL for the question audio */
  signed: Record<string, string>;
};

const LET = "ABCDEFG";
const shuffle = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let ac: AudioContext | null = null;
/** A short rising "ding" (right) or a low "buzz" (wrong), ≤ 0.4 s and quiet. */
function tone(ok: boolean) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac ??= new AC();
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    (ok ? [523, 659, 784] : [220, 180]).forEach((f, k) => {
      const o = ac!.createOscillator();
      const g = ac!.createGain();
      o.type = ok ? "triangle" : "sawtooth";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + k * 0.09);
      g.gain.exponentialRampToValueAtTime(ok ? 0.16 : 0.07, t + k * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.09 + 0.25);
      o.connect(g).connect(ac!.destination);
      o.start(t + k * 0.09);
      o.stop(t + k * 0.09 + 0.3);
    });
  } catch {
    // no sound on this device
  }
}

/** Red, white and blue pieces flying off the right answer. */
function burst(el: HTMLElement) {
  if (reduced()) return;
  const r = el.getBoundingClientRect();
  const colors = ["#E8333A", "#ffffff", "#1E4E8C", "#F2C230"];
  for (let k = 0; k < 18; k++) {
    const d = document.createElement("i");
    d.className = "rp-burst";
    d.setAttribute("aria-hidden", "true");
    d.style.left = `${r.left + r.width - 50}px`;
    d.style.top = `${r.top + r.height / 2}px`;
    d.style.background = colors[k % 4];
    d.style.setProperty("--x", `${Math.random() * 240 - 120}px`);
    d.style.setProperty("--y", `${Math.random() * -180 - 20}px`);
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }
}

export function Repaso(p: Props) {
  return (
    <SignedUrls.Provider value={p.signed}>
      <RepasoInner {...p} />
    </SignedUrls.Provider>
  );
}

function RepasoInner(p: Props) {
  const { items } = p;
  // English and Spanish only when every question has its Spanish text and options; otherwise English.
  const bilingual = items.length > 0 && items.every((q) => q.q_es && Array.isArray(q.options_es) && q.options_es.length === q.options.length);
  const [lang, setLang] = useState<Lang>(bilingual && p.track === "B" ? "es" : "en");
  const [sound, setSound] = useState(p.sound);
  const [order, setOrder] = useState<number[][] | null>(null);
  const [pool, setPool] = useState<number[]>(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [res, setRes] = useState<(boolean | undefined)[]>([]);
  const [picked, setPicked] = useState<(number | undefined)[]>([]);
  const [end, setEnd] = useState(false);
  const opsRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLHeadingElement>(null);

  // Shuffled after the first render, so the server and the browser draw the same page.
  useEffect(() => setOrder(items.map((q) => shuffle(q.options.length))), [items]);
  const [endHref, setEndHref] = useState(p.episodeHref);
  /** Records Part 6 as finished (score in progress.quiz_score / quiz_max_score), then where "Terminar" goes. */
  const record = async (score: { right: number; total: number } | null) => {
    if (!p.lessonId) return;
    const sb = createClient();
    await finishLesson(sb, p.userId, p.lessonId);
    if (score) await sb.from("progress").update({ quiz_score: score.right, quiz_max_score: score.total }).eq("user_id", p.userId).eq("lesson_id", p.lessonId);
    const r = await afterPartFinished(p.courseSlug, p.episodeN).catch(() => null);
    if (r?.complete) setEndHref(r.href);
  };
  // Track C: this part counts as done, so their episode isn't blocked.
  useEffect(() => {
    if (p.track === "C") void record(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  const toggleSound = async () => {
    const v = !sound;
    setSound(v);
    // The same preference as Cuenta → Preferencias → Sonidos (user_preferences.sound_effects).
    const root = document.querySelector("[data-prefs]") as HTMLElement | null;
    if (root) root.dataset.sound = v ? "on" : "off";
    await createClient()
      .from("user_preferences")
      .upsert({ user_id: p.userId, sound_effects: v, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  };

  const i = pool[pos];
  const q = items[i];
  const en = lang === "en";
  const opts = (it: RepasoItem) => (!en && it.options_es ? it.options_es : it.options);
  const qText = (it: RepasoItem) => (!en && it.q_es ? it.q_es : it.q);
  const pick = picked[i];
  const answered = pick !== undefined;
  const right = res.filter(Boolean).length;
  const total = items.length;

  const answer = (k: number, el: HTMLElement) => {
    if (answered) return;
    const ok = k === q.answer;
    setRes((r) => Object.assign([...r], { [i]: ok }));
    setPicked((x) => Object.assign([...x], { [i]: k }));
    if (sound) tone(ok);
    if (ok && sound) burst(el);
  };
  const next = () => {
    if (pos < pool.length - 1) {
      setPos(pos + 1);
      setTimeout(() => qRef.current?.focus(), 0);
      window.scrollTo({ top: 0 });
    } else {
      setEnd(true);
      const r = items.reduce((n, it, k) => n + (res[k] ? 1 : 0), 0);
      void record({ right: r, total });
      window.scrollTo({ top: 0 });
    }
  };
  const restart = (onlyMissed: boolean) => {
    const missed = items.map((_, k) => k).filter((k) => res[k] === false);
    const nextPool = onlyMissed && missed.length ? missed : items.map((_, k) => k);
    setPool(nextPool);
    setPos(0);
    setOrder(items.map((it) => shuffle(it.options.length)));
    setPicked((x) => x.map((v, k) => (nextPool.includes(k) ? undefined : v)));
    setRes((r) => r.map((v, k) => (nextPool.includes(k) ? undefined : v)));
    setEnd(false);
    window.scrollTo({ top: 0 });
  };

  const screen = p.screens.find((s) => s.id === q?.screen);
  const why = q ? (en ? (q.why_en ?? q.why_es ?? q.why) : (q.why_es ?? q.why)) : "";
  const whyEs = q ? (q.why_es ?? q.why) : "";
  const missed = items.length - right;

  return (
    <div className={`cb rp ${jakartaItalic.variable}`}>
      <Immersive />
      <header className="top">
        <span className="wm" aria-hidden data-wm="review" />
        <div className="wrap">
          <div className="bar">
            {p.back ? (
              <BackButtons t={p.back.t} course={p.back.course} episode={{ href: p.episodeHref, n: p.episodeN }} dark />
            ) : (
              <Link href={p.episodeHref} className="back">
                <i aria-hidden>‹</i>Episodio {p.episodeN}
              </Link>
            )}
            <button type="button" className="snd" aria-pressed={sound} onClick={() => void toggleSound()}>
              🔔 Sonidos: {sound ? "sí" : "no"}
            </button>
          </div>
          <div className="title">
            <h1 className="sect">
              Repaso
              <small>
                Quiz del episodio {p.episodeN} · {total} preguntas del examen cívico
              </small>
            </h1>
            {bilingual && p.track !== "C" && (
              <div className="lang" role="group" aria-label="Idioma">
                {(["en", "es"] as Lang[]).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} lang={l}>
                    {l === "en" ? "🇺🇸 English" : "🇲🇽 Español"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {p.track === "C" ? (
          <section className="cbox">
            <div className="ic" aria-hidden>
              ⭐
            </div>
            <h2>Este repaso no es para tu examen</h2>
            <p>
              Tu examen (regla 65/20) solo tiene <b>20 preguntas en español</b>. No necesitas este repaso: concéntrate en tus 20 preguntas y en los videos.
            </p>
            <div className="btns">
              <Link className="redb" href={p.starredHref ?? p.episodeHref}>
                Practicar mis 20 preguntas →
              </Link>
              <Link className="ghost" href={p.videoHref ?? p.episodeHref}>
                Ver el video del episodio
              </Link>
            </div>
          </section>
        ) : end ? (
          <section className="end" aria-live="polite">
            <div className="stars" aria-label={`${right} de ${total} estrellas`}>
              {"★".repeat(right)}
              <span style={{ opacity: 0.25 }}>{"★".repeat(missed)}</span>
            </div>
            <div className="coin">
              <b>{right}</b>
              <span>DE {total}</span>
            </div>
            <h2>{right === total ? "¡Perfecto! Te las sabes todas" : right / total >= 0.6 ? "¡Muy bien!" : "¡Buen intento!"}</h2>
            <p>
              {missed
                ? `Repasa ${missed === 1 ? "la pregunta" : `las ${missed} preguntas`} que fallaste y vuelve a intentarlo.`
                : `Terminaste el repaso del episodio ${p.episodeN}. ¡Sigue así!`}
            </p>
            <div className="btns">
              {missed > 0 && (
                <button type="button" className="next" onClick={() => restart(true)}>
                  {missed === 1 ? "Repetir la que fallé" : `Repetir las ${missed} que fallé`}
                </button>
              )}
              <Link className={missed ? "ghost" : "next"} href={endHref}>
                Terminar el episodio →
              </Link>
              <button type="button" className="ghost" onClick={() => restart(false)}>
                Hacer el repaso otra vez
              </button>
            </div>
          </section>
        ) : q ? (
          <section>
            <div className="prog">
              <b>
                {en ? "Question" : "Pregunta"} {i + 1} {en ? "of" : "de"} {total}
              </b>
              <div className="dots" aria-hidden>
                {items.map((_, k) => (
                  <i key={k} className={res[k] === true ? "ok" : res[k] === false ? "no" : k === i ? "cur" : ""} />
                ))}
              </div>
              <span className="score">✓ {right}</span>
            </div>
            <div className="qc" key={`${i}-${pos}`}>
              <div className="k">
                <span>
                  {en ? "QUESTION" : "PREGUNTA"} {i + 1}
                </span>
                {isStarred({ title: q.q, starred: q.starred, uscis_2025_no: q.uscis_2025_no }) && (
                  <span className="star" aria-label="También está en las 20 preguntas (65/20)">
                    ★ 65/20
                  </span>
                )}
              </div>
              <h2 ref={qRef} tabIndex={-1} lang={lang}>
                {qText(q)}
              </h2>
              <ListenQ src={en ? q.audio_en : q.audio_es} />
            </div>
            <div ref={opsRef} className={`ops${answered ? " locked" : ""}`} lang={lang}>
              {(order?.[i] ?? q.options.map((_, k) => k)).map((k, n) => {
                const state = !answered ? "" : k === q.answer ? "right" : k === pick ? "wrong" : "dim";
                return (
                  <button
                    key={k}
                    type="button"
                    className={`op ${state}`}
                    disabled={answered}
                    onClick={(e) => answer(k, e.currentTarget)}
                    style={{ visibility: order ? undefined : "hidden" }}
                  >
                    <span className="l" aria-hidden>
                      {LET[n]}
                    </span>
                    <span>{opts(q)[k]}</span>
                    {state === "right" && <span className="sr"> (correcta)</span>}
                    {state === "wrong" && <span className="sr"> (incorrecta)</span>}
                    <span className="m" aria-hidden>
                      {k === q.answer ? "✓" : "✗"}
                    </span>
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={`fb ${pick === q.answer ? "good" : "bad"}`} role="status">
                {pick === q.answer ? (
                  <>
                    <h3>🎉 ¡Correcto!</h3>
                    {why && <p>{why}</p>}
                  </>
                ) : (
                  <>
                    <h3>💪 Casi. La respuesta es:</h3>
                    <p>
                      <b>{opts(q)[q.answer]}</b>. {whyEs}
                    </p>
                  </>
                )}
                {screen && (
                  <Link className="see" href={`${p.bookHref}?screen=${encodeURIComponent(screen.id)}`}>
                    Repasar en la página “{screen.title}” ↗
                  </Link>
                )}
              </div>
            )}
            {answered && (
              <button type="button" className="next" onClick={next}>
                {pos < pool.length - 1 ? "Siguiente pregunta →" : "Ver mi resultado →"}
              </button>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** "🔊 Escuchar la pregunta": only when the question has a recording in this language. */
function ListenQ({ src: ref }: { src?: string | null }) {
  const src = useSignedRef(ref);
  const [playing, setPlaying] = useState(false);
  const a = useRef<HTMLAudioElement | null>(null);
  if (!src) return null;
  return (
    <button
      type="button"
      className={`listen${playing ? " playing" : ""}`}
      onClick={() => {
        a.current ??= new Audio(src);
        a.current.onended = () => setPlaying(false);
        a.current.currentTime = 0;
        void a.current.play().then(() => setPlaying(true)).catch(() => {});
      }}
    >
      <span aria-hidden>🔊</span> Escuchar la pregunta
    </button>
  );
}
