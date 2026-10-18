"use client";

// CelsAudio (board "CelsBook, CelsAudio y Grammar", phone 2): a player with a live karaoke transcript
// (tap a line to jump to it), chapters, speed 0.75 / 1 / 1.25×, a repeat-phrase loop and an offline badge.
// Tracks are tabs: CelsCast (the podcast recap, Amy and Brian) first when the episode has one, then the
// original recording. Each works with just the audio; lines, words and chapters show when they exist.
// Finishing either track completes the part.
import { useEffect, useMemo, useRef, useState } from "react";
import { cachedMediaUrl, offlineEntry } from "@/lib/offline";
import { fill } from "@/components/course/kit";
import { Empty, FinishButton, usePartShell } from "./PartShell";

/** A transcript line; `words` (with their start times) light up one by one while the line plays. */
export type Cue = { start: number; text: string; words?: { start: number; text: string }[]; speaker?: string };
export type Track = { key: string; label: string; src: string | null; cues: Cue[]; chapters: Chapter[]; voice: string | null };
// CelsCast hosts: Amy in pink, Brian in cyan; anyone else in white.
const SPEAKER_COLOR: Record<string, string> = { Amy: "#FF7AB8", Brian: "#5CE1FF" };
export type Chapter = { start: number; title: string };
const SPEEDS = [1, 1.25, 0.75];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function AudioPart({ tracks, title, episodeKey, finishLabel }: { tracks: Track[]; title: string; episodeKey: string; finishLabel: string }) {
  const playable = tracks.filter((x) => x.src);
  const [tab, setTab] = useState(playable[0]?.key ?? "");
  const track = playable.find((x) => x.key === tab) ?? playable[0];
  return (
    <div className="flex flex-1 flex-col gap-3 pt-2">
      {playable.length > 1 && (
        <div className="flex gap-2" role="tablist">
          {playable.map((x) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={x.key === track?.key}
              onClick={() => setTab(x.key)}
              className={`kit-focus-light rounded-full px-3.5 py-1.5 text-[13px] font-extrabold transition ${x.key === track?.key ? "bg-[#C5F58F] text-[#0E2B07]" : "bg-white/10 text-white/85"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
      {/* key: each track starts with its own time, speed and loop */}
      <Player key={track?.key ?? "none"} track={track ?? null} title={title} episodeKey={episodeKey} finishLabel={finishLabel} />
    </div>
  );
}

function Player({ track, title, episodeKey, finishLabel }: { track: Track | null; title: string; episodeKey: string; finishLabel: string }) {
  const src = track?.src ?? null;
  const cues = useMemo(() => track?.cues ?? [], [track]);
  const chapters = useMemo(() => track?.chapters ?? [], [track]);
  const { t, setProgress, finish } = usePartShell();
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState(src);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [loop, setLoop] = useState(false);
  const [offline, setOffline] = useState(false);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);

  // Downloaded episode: play the saved copy (signed URLs change on every load).
  useEffect(() => {
    void offlineEntry(episodeKey).then((b) => setOffline(!!b));
    if (src) void cachedMediaUrl(src).then((u) => u && setUrl(u));
  }, [src, episodeKey]);

  const line = useMemo(() => cues.findLastIndex((c) => c.start <= time + 0.05), [cues, time]);
  const chapter = useMemo(() => chapters.findLast((c) => c.start <= time + 0.05) ?? chapters[0], [chapters, time]);

  useEffect(() => setProgress(dur ? time / dur : 0), [time, dur, setProgress]);
  // The metadata can load before hydration attaches onLoadedMetadata.
  useEffect(() => {
    const el = audio.current;
    if (el && el.readyState >= 1 && Number.isFinite(el.duration)) setDur(el.duration);
  }, [url]);
  useEffect(() => {
    const el = lineRefs.current[line];
    // Keep the current line in the middle of the transcript box (only the box scrolls, not the page).
    if (el && playing && box.current)
      box.current.scrollTo({
        top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }, [line, playing]);

  if (!url) {
    return (
      <>
        <Empty text={t.audioSoon} />
        <FinishButton label={finishLabel} />
      </>
    );
  }

  const a = () => audio.current!;
  const toggle = () => (a().paused ? void a().play() : a().pause());
  const seek = (s: number) => {
    a().currentTime = Math.max(0, Math.min(dur || s, s));
    setTime(a().currentTime);
  };
  const onTime = () => {
    const now = a().currentTime;
    // Repeat phrase: back to the start of the current line when it ends.
    if (loop && line >= 0 && cues[line + 1] && now >= cues[line + 1].start) {
      a().currentTime = cues[line].start;
      return;
    }
    setTime(now);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => setDur(a().duration || 0)}
        onDurationChange={() => Number.isFinite(a().duration) && setDur(a().duration)}
        onTimeUpdate={onTime}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          void finish();
        }}
      />
      {offline && <span className="self-end rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-[#C5F58F]">⤓ {t.offline}</span>}

      <div className="relative mx-auto grid aspect-square w-[min(62vw,240px)] place-items-center rounded-full border border-[#A6EB6E]/25">
        <span aria-hidden className="absolute inset-4 rounded-full border border-[#A6EB6E]/20" />
        <div className="flex h-16 items-end gap-1" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-[#C5F58F] transition-[height] duration-300 motion-reduce:transition-none"
              style={{ height: playing ? `${20 + ((i * 37 + Math.floor(time * 6)) % 44)}px` : `${10 + ((i * 13) % 18)}px`, opacity: 0.55 + (i % 3) * 0.15 }}
            />
          ))}
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-extrabold">
          {title} · {track?.key === "celscast" ? "CelsCast" : t.audioTitle}
        </h2>
        <p className="text-sm text-white/75">{[chapter?.title, track?.voice].filter(Boolean).join(" · ")}</p>
      </div>

      <div ref={box} className="relative max-h-48 overflow-y-auto rounded-3xl bg-black/25 p-4" aria-live="off">
        {cues.length ? (
          <ol className="space-y-2">
            {cues.map((c, i) => (
              <li key={i}>
                <button
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => {
                    seek(c.start);
                    void a().play();
                  }}
                  className={`kit-focus-light w-full rounded-lg px-1 text-left text-[15px] font-bold transition-colors ${i === line ? (c.words?.length ? "text-white" : "text-[#FFEF05]") : i < line ? "text-white/70" : "text-white/45"}`}
                >
                  {c.speaker && (
                    <span className="mr-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: SPEAKER_COLOR[c.speaker] ?? "#FFFFFF" }}>
                      {c.speaker}
                    </span>
                  )}
                  {i === line && c.words?.length
                    ? c.words.map((w, k) => (
                        <span
                          key={k}
                          className={
                            w.start <= time + 0.05 ? (c.words![k + 1] && c.words![k + 1].start <= time + 0.05 ? "text-[#FFEF05]" : "rounded bg-[#FFEF05] text-[#0E2B07]") : ""
                          }
                        >
                          {w.text}{" "}
                        </span>
                      ))
                    : c.text}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-white/75">{t.noTranscript}</p>
        )}
      </div>

      <div>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={t.audioTitle}
            className="w-full accent-[#A6EB6E]"
          />
          {dur > 0 &&
            chapters
              .slice(1)
              .map((c) => (
                <span
                  key={c.start}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-white/60"
                  style={{ left: `${(c.start / dur) * 100}%` }}
                />
              ))}
        </div>
        <div className="flex justify-between text-xs font-semibold text-white/75">
          <span>{clock(time)}</span>
          <span>-{clock(Math.max(0, dur - time))}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const n = (speed + 1) % SPEEDS.length;
            setSpeed(n);
            a().playbackRate = SPEEDS[n];
          }}
          aria-label={fill(t.speed, { n: SPEEDS[speed] })}
          className="kit-focus-light h-11 min-w-14 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-extrabold"
        >
          {SPEEDS[speed]}×
        </button>
        <button type="button" onClick={() => seek(time - 5)} aria-label={t.back5} className="kit-focus-light grid size-11 place-items-center rounded-full text-xl">
          ↺
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t.pause : t.play}
          className="kit-focus-light grid size-[72px] place-items-center rounded-full text-[#0E2B07] shadow-[0_14px_30px_-10px_rgba(166,235,110,.8)]"
          style={{ background: "linear-gradient(160deg, #C5F58F, #6FC23E)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4.5v15l13-7.5z"} />
          </svg>
        </button>
        <button type="button" onClick={() => seek(time + 5)} aria-label={t.fwd5} className="kit-focus-light grid size-11 place-items-center rounded-full text-xl">
          ↻
        </button>
        <button
          type="button"
          onClick={() => setLoop((l) => !l)}
          disabled={!cues.length}
          aria-pressed={loop}
          aria-label={t.loop}
          className={`kit-focus-light grid h-11 min-w-14 place-items-center rounded-xl border text-lg disabled:opacity-35 ${loop ? "border-[#A6EB6E] bg-[#A6EB6E]/20" : "border-white/15 bg-white/5"}`}
        >
          🔁
        </button>
      </div>
      {cues.length > 0 && <p className="text-center text-xs font-semibold text-white/70">{t.tapLine}</p>}
      <FinishButton label={finishLabel} />
    </div>
  );
}
