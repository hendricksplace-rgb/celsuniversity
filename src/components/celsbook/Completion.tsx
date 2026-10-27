"use client";

// CelsUS completion screen (celsus-final-mockup.html). State A: the CelsBook is done, the episode isn't.
// State B: all 6 parts are done. Medal drop + shine, rotating rays, ~3 s of confetti and the part circles popping
// in; nothing moves under prefers-reduced-motion. Buttons only, 60–68 px.
import "./celsbook.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButtons, type UsBack } from "@/components/celsus/BackButtons";
import { jakartaItalic } from "./fonts";
import { Immersive } from "./Immersive";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

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
  /** C-013 back buttons (course + episode). */
  back?: UsBack;
  next: { label: string; href: string; index: number } | null;
  nextEpisode: { n: number; href: string; topic: string } | null;
  finalExamHref: string | null;
  readAgainHref: string;
  t: Dictionary["fin"];
};

const COLORS = ["#E8333A", "#ffffff", "#1E4E8C", "#F2C230", "#FFE27A"];

export function Completion(p: CompletionProps) {
  const B = p.state === "B";
  const { t } = p;
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
  const kick = p.firstName ? fill(t.congratsName, { name: p.firstName.toUpperCase() }) : t.congrats;
  const stats: [string, string][] = B
    ? [
        [fill(t.statOf, { n: p.done, m: p.total }), t.partsDone],
        [`+${p.episodeXp}`, t.epXp],
        [p.quiz ? fill(t.statOf, { n: p.quiz.right, m: p.quiz.total }) : "—", t.inQuiz],
      ]
    : [
        [String(p.pages.read), t.pagesRead],
        [`+${p.bookXp}`, t.xp],
        [`🔥 ${p.streak}`, p.streak === 1 ? t.dayStreak : t.daysStreak],
      ];
  const msg = B
    ? `${medal ? fill(t.medal, { m: medal }) : t.wayToGo} ${p.nextEpisode ? t.nextOpen : t.examOpen}`
    : `${fill(t.goingWell, { n: p.done, m: p.total, e: p.n })}${left > 0 ? fill(t.left, { n: left }) : ""}`;

  return (
    <div className={`cb fin ${jakartaItalic.variable}`}>
      <Immersive />
      <header className="hero">
        <span className="rays" aria-hidden />
        <div className="bar">
          {p.back ? (
            <BackButtons t={p.back.t} course={p.back.course} episode={{ href: p.episodeHref, n: p.n }} dark />
          ) : (
            <Link href={p.episodeHref} className="back">
              <i aria-hidden>‹</i>
              {fill(t.back, { n: p.n })}
            </Link>
          )}
          <div className="logo" aria-label="CelsUS">
            cels<span>US</span>
          </div>
        </div>
        <div className="medal" aria-hidden>
          <span className="rib" />
          <div className="c">
            <span>{B ? t.medalDone : t.medalBook}</span>
            <b>{p.n}</b>
            <span>{t.medalEp}</span>
          </div>
        </div>
        <p className="kick">{kick}</p>
        <h1>{fill(B ? t.titleB : t.titleA, { n: p.n })}</h1>
        <p className="sub">{B ? `${p.topic ? `${p.topic}. ` : ""}${t.subB}` : fill(t.subA, { m: p.pages.total })}</p>
      </header>

      <main className="fmain">
        <section className="card">
          <h2>{fill(t.yourEp, { n: p.n })}</h2>
          <ol className="parts">
            {p.parts.map((pt, k) => (
              <li key={k} className={`pt${pt.done ? " ok" : pt.now ? " now" : ""}`}>
                <i aria-hidden style={{ animationDelay: `${0.6 + k * 0.12}s` }}>
                  {pt.done ? "✓" : pt.icon}
                </i>
                <b>{pt.name}</b>
                <small>{pt.done ? t.ptDone : pt.now ? t.ptNow : t.ptLater}</small>
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
                    {fill(t.startEp, { n: p.nextEpisode.n })}
                    {p.nextEpisode.topic && <small>{p.nextEpisode.topic}</small>}
                  </span>
                </Link>
              ) : (
                <Link className="big b1" href={p.finalExamHref ?? "/app/cursos"}>
                  <span className="tx">
                    {t.exam}
                    <small>{t.examSub}</small>
                  </span>
                </Link>
              )
            ) : (
              p.next && (
                <Link className="big b1" href={p.next.href}>
                  <span className="tx">
                    {fill(t.nextPart, { p: p.next.label })}
                    <small>{fill(t.partOf, { i: p.next.index, m: p.total, n: p.n })}</small>
                  </span>
                </Link>
              )
            )}
            <div className="row2">
              {B ? (
                <>
                  <Link className="big b2" href="/app/cursos">
                    {t.myCourses}
                  </Link>
                  <Link className="big b2" href="/app/progreso">
                    {t.medals}
                  </Link>
                </>
              ) : (
                <>
                  <Link className="big b2" href={p.episodeHref}>
                    {t.backEp}
                  </Link>
                  <Link className="big b2" href={p.readAgainHref}>
                    {t.readAgain}
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
