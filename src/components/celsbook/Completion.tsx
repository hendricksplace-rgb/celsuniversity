"use client";

// CelsUS completion screen (celsus-final-mockup.html). State A: the CelsBook is done, the episode isn't.
// State B: all 6 parts are done. Medal drop + shine, rotating rays, ~3 s of confetti and the part circles popping
// in; nothing moves under prefers-reduced-motion. Buttons only, 60–68 px.
import "./celsbook.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { jakartaItalic } from "./fonts";
import { Immersive } from "./Immersive";
import { createClient } from "@/lib/supabase/client";

export type CompletionProps = {
  state: "A" | "B";
  userId: string;
  n: number;
  firstName: string | null;
  /** "Principios de la democracia y documentos fundacionales" */
  topic: string;
  pages: { read: number; total: number };
  parts: { icon: string; name: string; done: boolean; now: boolean }[];
  done: number;
  total: number;
  bookXp: number;
  episodeXp: number;
  streak: number;
  quiz: { right: number; total: number } | null;
  /** Name of a medal earned in the last half hour */
  medal: string | null;
  episodeHref: string;
  next: { label: string; href: string; index: number } | null;
  nextEpisode: { n: number; href: string; topic: string } | null;
  finalExamHref: string | null;
  readAgainHref: string;
};

const COLORS = ["#E8333A", "#ffffff", "#1E4E8C", "#F2C230", "#FFE27A"];

export function Completion(p: CompletionProps) {
  const B = p.state === "B";
  const [pieces, setPieces] = useState<{ left: number; x: number; r: number; dur: number; delay: number; c: string }[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: 70 }, (_, k) => ({
        left: Math.random() * 100,
        x: Math.random() * 160 - 80,
        r: Math.random() * 720,
        dur: 2.2 + Math.random() * 1.2,
        delay: Math.random() * 0.6,
        c: COLORS[k % COLORS.length],
      })),
    );
    const t = setTimeout(() => setPieces([]), 4200);
    return () => clearTimeout(t);
  }, []);

  // A medal can be awarded a moment after the page opens (the shell's BadgeWatcher runs private.award_badges):
  // look again once, so the message names it.
  const [medal, setMedal] = useState(p.medal);
  useEffect(() => {
    if (!B || p.medal) return;
    const h = setTimeout(async () => {
      const sb = createClient();
      const { data: g } = await sb.from("gamification").select("badges").eq("user_id", p.userId).maybeSingle();
      const fresh = Object.entries((g?.badges ?? {}) as Record<string, { at?: string }>)
        .filter(([, v]) => v?.at && Date.now() - new Date(v.at).getTime() < 30 * 60 * 1000)
        .sort((a, b) => (b[1].at ?? "").localeCompare(a[1].at ?? ""))[0];
      if (!fresh) return;
      const { data: badge } = await sb.from("badges").select("name").eq("code", fresh[0]).maybeSingle();
      if (badge?.name) setMedal(badge.name);
    }, 2500);
    return () => clearTimeout(h);
  }, [B, p.medal, p.userId]);

  const left = p.total - p.done;
  const kick = p.firstName ? `¡FELICIDADES, ${p.firstName.toUpperCase()}!` : "¡FELICIDADES!";
  const stats: [string, string][] = B
    ? [
        [`${p.done} de ${p.total}`, "partes completas"],
        [`+${p.episodeXp}`, "XP en este episodio"],
        [p.quiz ? `${p.quiz.right} de ${p.quiz.total}` : "—", "en el quiz"],
      ]
    : [
        [String(p.pages.read), "páginas leídas"],
        [`+${p.bookXp}`, "XP ganados"],
        [`🔥 ${p.streak}`, p.streak === 1 ? "día de racha" : "días de racha"],
      ];
  const msg = B
    ? `${medal ? `Ganaste la medalla «${medal}». ¡Así se hace!` : "¡Así se hace! Cada episodio te acerca a tu ciudadanía."} ${
        p.nextEpisode ? "El siguiente episodio ya está abierto para ti." : "Ya puedes hacer el examen final."
      }`
    : `¡Vas muy bien! Ya completaste ${p.done} de las ${p.total} partes del episodio ${p.n}.${left > 0 ? ` Te faltan solo ${left}.` : ""}`;

  return (
    <div className={`cb fin ${jakartaItalic.variable}`}>
      <Immersive />
      <header className="hero">
        <span className="rays" aria-hidden />
        <div className="bar">
          <Link href={p.episodeHref} className="back">
            <i aria-hidden>‹</i>Episodio {p.n}
          </Link>
          <div className="logo" aria-label="CelsUS">
            cels<span>US</span>
          </div>
        </div>
        <div className="medal" aria-hidden>
          <span className="rib" />
          <div className="c">
            <span>{B ? "COMPLETO" : "CELSBOOK"}</span>
            <b>{p.n}</b>
            <span>EPISODIO</span>
          </div>
        </div>
        <p className="kick">{kick}</p>
        <h1>{B ? `¡Terminaste el episodio ${p.n}!` : `¡Terminaste el CelsBook del episodio ${p.n}!`}</h1>
        <p className="sub">
          {B
            ? `${p.topic ? `${p.topic}. ` : ""}Ya estás un paso más cerca de tu ciudadanía.`
            : `Leíste las ${p.pages.total} páginas. Cada página te acerca a tu entrevista de ciudadanía.`}
        </p>
      </header>

      <main className="fmain">
        <section className="card">
          <h2>TU EPISODIO {p.n}</h2>
          <ol className="parts">
            {p.parts.map((pt, k) => (
              <li key={k} className={`pt${pt.done ? " ok" : pt.now ? " now" : ""}`}>
                <i aria-hidden style={{ animationDelay: `${0.6 + k * 0.12}s` }}>
                  {pt.done ? "✓" : pt.icon}
                </i>
                <b>{pt.name}</b>
                <small>{pt.done ? "Hecho" : pt.now ? "Sigue" : "Pendiente"}</small>
              </li>
            ))}
          </ol>
          <div className="fmsg">
            <i aria-hidden>{B ? "🏅" : "👏"}</i>
            <p>{msg}</p>
          </div>
          <div className="stats">
            {stats.map(([v, l]) => (
              <div key={l} className="st">
                <b>{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="fbtns">
            {B ? (
              p.nextEpisode ? (
                <Link className="big b1" href={p.nextEpisode.href}>
                  <span className="tx">
                    Empezar el episodio {p.nextEpisode.n} →{p.nextEpisode.topic && <small>{p.nextEpisode.topic}</small>}
                  </span>
                </Link>
              ) : (
                <Link className="big b1" href={p.finalExamHref ?? "/app/cursos"}>
                  <span className="tx">
                    Hacer el examen final →<small>Evaluación de CelsUS</small>
                  </span>
                </Link>
              )
            ) : (
              p.next && (
                <Link className="big b1" href={p.next.href}>
                  <span className="tx">
                    Seguir: {p.next.label} →
                    <small>
                      Parte {p.next.index} de {p.total} del episodio {p.n}
                    </small>
                  </span>
                </Link>
              )
            )}
            <div className="row2">
              {B ? (
                <>
                  <Link className="big b2" href="/app/cursos">
                    ← Volver a Mis cursos
                  </Link>
                  <Link className="big b2" href="/app/progreso">
                    🏅 Ver mis medallas
                  </Link>
                </>
              ) : (
                <>
                  <Link className="big b2" href={p.episodeHref}>
                    ← Volver al episodio
                  </Link>
                  <Link className="big b2" href={p.readAgainHref}>
                    Leer otra vez
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      {pieces.length > 0 && (
        <div aria-hidden className="cfwrap">
          {pieces.map((c, k) => (
            <i
              key={k}
              className="cf"
              style={{ left: `${c.left}vw`, background: c.c, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, ["--x" as string]: `${c.x}px`, ["--r" as string]: `${c.r}deg` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
