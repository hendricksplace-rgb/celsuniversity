"use client";

// CelsUS CelsAudio (C-005): the CelsCast podcast in English (Amy hosts, Brian is the USCIS officer) with a
// Spanish subtitle under every line, always shown. Tabs: CelsCast, then the original episode recording.
// Karaoke follows the voice; tapping a line or a chapter jumps there. The answer pauses are silence in the
// file: while one plays (after "Your turn…" or a question from Brian) the player says "Tu turno…".
// Finishing either track completes the part (usePartDone); the seal is quiet, no confetti.
// Audio goes through /app/archivo (signed on request) unless the file was saved offline (C-004).
import "./celscast.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { cachedMediaUrl } from "@/lib/offline";
import { fileRoute } from "@/components/reader/media";
import { usePartDone } from "@/components/lesson/progress";
import { fill } from "@/components/course/kit";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Cue, Track } from "@/components/part/AudioPart";

type T = Dictionary["part"];
const SPEEDS = [1, 0.8, 1.2];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** A gap this long after a prompt is the student's turn. */
const TURN_GAP = 1.5;
const isPrompt = (c: Cue) => /\byour turn\b/i.test(c.text) || (c.speaker === "Brian" && c.text.trim().endsWith("?"));
/** When a line stops talking: its last word's start plus a short word, or a rough reading time. */
const lineEnd = (c: Cue) => (c.words?.length ? c.words[c.words.length - 1].start + 0.7 : c.start + c.text.split(/\s+/).length * 0.45);

export function CelsCast({ tracks, title, t }: { tracks: Track[]; title: string; t: T }) {
  const playable = tracks.filter((x) => x.src);
  const [tab, setTab] = useState(playable[0]?.key ?? "");
  const track = playable.find((x) => x.key === tab) ?? playable[0];
  if (!track) return null;
  return (
    <div className="ccu">
      {playable.length > 1 && (
        <div className="tabs" role="tablist">
          {playable.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={x.key === track.key} onClick={() => setTab(x.key)}>
              {x.key === "celscast" ? "CelsCast" : x.label}
            </button>
          ))}
        </div>
      )}
      {/* key: each track starts with its own time and speed */}
      <Player key={track.key} track={track} title={title} t={t} />
    </div>
  );
}

function Player({ track, title, t }: { track: Track; title: string; t: T }) {
  const done = usePartDone();
  const cast = track.key === "celscast";
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState(track.ref ? fileRoute(track.ref) : track.src);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [ended, setEnded] = useState(false);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const box = useRef<HTMLOListElement>(null);
  const { cues, chapters } = track;

  // A downloaded copy plays offline (it is keyed by the signed URL).
  useEffect(() => {
    if (track.src) void cachedMediaUrl(track.src).then((u) => u && setUrl(u));
  }, [track.src]);
  // The metadata can load before hydration attaches onLoadedMetadata.
  useEffect(() => {
    const el = audio.current;
    if (el && el.readyState >= 1 && Number.isFinite(el.duration)) setDur(el.duration);
  }, [url]);

  const line = useMemo(() => cues.findLastIndex((c) => c.start <= time + 0.05), [cues, time]);
  const chapter = useMemo(() => chapters.findLastIndex((c) => c.start <= time + 0.05), [chapters, time]);
  const cur = cues[line];
  const turn = !!cur && playing && isPrompt(cur) && time > lineEnd(cur) && (cues[line + 1]?.start ?? dur) - lineEnd(cur) >= TURN_GAP;

  useEffect(() => {
    const el = lineRefs.current[line];
    // Keep the current line in the middle of the transcript (only the box scrolls, not the page).
    if (el && playing && box.current)
      box.current.scrollTo({
        top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }, [line, playing]);

  if (!url) return null;
  const a = () => audio.current!;
  const seek = (s: number) => {
    a().currentTime = Math.max(0, Math.min(dur || s, s));
    setTime(a().currentTime);
  };
  const jump = (s: number) => {
    seek(s);
    void a().play();
  };

  return (
    <div className="card">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => Number.isFinite(a().duration) && setDur(a().duration)}
        onDurationChange={() => Number.isFinite(a().duration) && setDur(a().duration)}
        onTimeUpdate={() => setTime(a().currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          done();
        }}
      />
      <header className="hd">
        <p className="kick">{cast ? "CelsCast" : t.originalAudio}</p>
        <h2>{title}</h2>
        {cast && <p className="with">{t.castWith}</p>}
      </header>

      {chapters.length > 1 && (
        <nav className="chap" aria-label={t.castChapters}>
          {chapters.map((c, i) => (
            <button key={c.start} type="button" aria-current={i === chapter ? "true" : undefined} onClick={() => jump(c.start)}>
              <span className="ct">{clock(c.start)}</span>
              {c.title}
            </button>
          ))}
        </nav>
      )}

      {cues.length > 0 && (
        <ol ref={box} className="lines" aria-live="off">
          {cues.map((c, i) => (
            <li key={i}>
              <button
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                type="button"
                className={i === line ? "on" : i < line ? "past" : undefined}
                onClick={() => jump(c.start)}
              >
                {c.speaker && <span className={`who ${c.speaker.toLowerCase()}`}>{c.speaker}</span>}
                <span className="en" lang="en">
                  {i === line && c.words?.length
                    ? c.words.map((w, k) => {
                        const said = w.start <= time + 0.05;
                        const now = said && !(c.words![k + 1] && c.words![k + 1].start <= time + 0.05);
                        return (
                          <span key={k} className={now ? "w now" : said ? "w said" : "w"}>
                            {w.text}{" "}
                          </span>
                        );
                      })
                    : c.text}
                </span>
                {c.es && (
                  <span className="es" lang="es">
                    {c.es}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className={`turn${turn ? " show" : ""}`} aria-live="polite">
        {turn ? t.castTurn : ""}
      </p>

      <div className="bar">
        <input type="range" min={0} max={dur || 0} step={0.1} value={time} onChange={(e) => seek(Number(e.target.value))} aria-label={title} />
        {dur > 0 &&
          chapters.slice(1).map((c) => <span key={c.start} aria-hidden className="tick" style={{ left: `${(c.start / dur) * 100}%` }} />)}
      </div>
      <div className="times">
        <span>{clock(time)}</span>
        <span>-{clock(Math.max(0, dur - time))}</span>
      </div>

      <div className="ctl">
        <button
          type="button"
          className="sp"
          onClick={() => {
            const n = (speed + 1) % SPEEDS.length;
            setSpeed(n);
            a().playbackRate = SPEEDS[n];
          }}
          aria-label={fill(t.speed, { n: SPEEDS[speed] })}
        >
          {SPEEDS[speed]}×
        </button>
        <button type="button" className="sk" onClick={() => seek(time - 5)} aria-label={t.back5}>
          ↺
        </button>
        <button type="button" className="pp" onClick={() => (a().paused ? void a().play() : a().pause())} aria-label={playing ? t.pause : t.play}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4.5v15l13-7.5z"} />
          </svg>
        </button>
        <button type="button" className="sk" onClick={() => seek(time + 5)} aria-label={t.fwd5}>
          ↻
        </button>
        <span className="sp ghost" aria-hidden />
      </div>
      {cues.length > 0 && <p className="tap">{t.tapLine}</p>}

      {ended && (
        <p className="seal" role="status">
          <span aria-hidden>✓</span>
          {cast ? t.castDone : t.castDoneOriginal}
        </p>
      )}
    </div>
  );
}
