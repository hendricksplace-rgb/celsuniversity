"use client";

// C-029 CelsBSNS video page (celsbsns-video-v3.html): the header card (real logo, week ring in glass), a poster
// drawn from the data, the native <video> with glass controls (play, back 10 s, scrub, time, speed 0.75–1.5×
// remembered, full screen), completion at 90% (XP once, check + sparks + chime, the next video in 5 s), "Video
// próximamente" only when the block has no file, the student's notes, and the week's videos and tasks.
import "./bsns-video.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TaskStatus } from "@/lib/bsns";
import type { Kind } from "@/lib/bsns-week";
import { createClient } from "@/lib/supabase/client";
import { fill } from "@/components/course/kit";
import { finishLesson } from "@/lib/offline";
import { reducedMotion, sfx } from "@/components/part/fx";

type T = Dictionary["bv"];
export type VideoItem = { id: string; href: string; n: number; done: boolean; duration: number | null };
export type TaskItem = { id: string; href: string; kind: Kind; name: string; time: string | null; status: TaskStatus };

const SPEEDS = [0.75, 1, 1.25, 1.5];
const two = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${two(Math.floor(s % 60))}` : "0:00");
const STATUS_CLS: Record<TaskStatus, string> = { pending: "p", progress: "c", submitted: "e", reviewed: "e", done: "e", coach: "k" };

const Tri = () => (
  <span className="bv-tri" aria-hidden>
    <i style={{ background: "#FFD400" }} />
    <i style={{ background: "#43D6FE" }} />
    <i style={{ background: "#F20174" }} />
  </span>
);

/** The CelsBSNS poster, drawn from the data (no image per video). mini: number + the 3-color line only. */
function Poster({ t, week, x, y, topic, mini }: { t: T; week: number; x: number; y: number; topic: string; mini?: boolean }) {
  return (
    <div className={`bv-poster ${mini ? "mini" : ""}`} aria-hidden>
      {!mini && <div className="halo" />}
      {!mini && <div className="k">{fill(t.posterKick, { n: week })}</div>}
      <div className="n">
        <span>{two(x)}</span>
      </div>
      {!mini && (
        <div className="s">
          <small>{fill(t.posterSub, { x, y })}</small>
          {topic}
        </div>
      )}
      <Tri />
      {!mini && (
        <div className="lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/site/celsbsns-logo.png" alt="" width={900} height={252} />
        </div>
      )}
    </div>
  );
}

const Eq = () => (
  <span className="bv-eq" aria-hidden>
    <i />
    <i />
    <i />
  </span>
);

/** Task icons: line drawings that redraw on hover. */
function TaskIcon({ kind }: { kind: Kind }) {
  const p: Record<string, React.ReactNode> = {
    syllabus: <path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4" />,
    reading: <path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" />,
    writing: <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z" />,
    research: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.5-4.5" />
      </>
    ),
    video_submission: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="3" />
        <path d="M16 10l5-3v10l-5-3" />
      </>
    ),
    speaking: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    feedback: <path d="M4 5h16v11H9l-5 4z" />,
    other: <circle cx="12" cy="12" r="8" />,
  };
  return (
    <span className="ic" aria-hidden>
      <svg viewBox="0 0 24 24">{p[kind] ?? p.other}</svg>
    </span>
  );
}

export function BsnsVideo(props: {
  t: T;
  userId: string;
  lessonId: string;
  blockId: string | null;
  src: string | null;
  week: number;
  topic: string;
  x: number;
  y: number;
  xp: number;
  done: boolean;
  track: boolean;
  weekDone: { x: number; y: number };
  videos: VideoItem[];
  tasks: TaskItem[];
  next: { href: string; label: string; n: number | null } | null;
  prev: { href: string; label: string } | null;
  readingHref: string | null;
  notes: string;
  notify: boolean;
  courseHref: string;
  weekHref: string;
}) {
  const { t, userId, lessonId, blockId, src, week, topic, x, y, xp, track, videos, tasks, next, prev } = props;
  const router = useRouter();
  const search = useSearchParams();
  const vref = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(videos[x - 1]?.duration ?? 0);
  const [speed, setSpeed] = useState(1);
  const [spdOpen, setSpdOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(props.done);
  const [weekDone, setWeekDone] = useState(props.weekDone.x);
  const [celebrate, setCelebrate] = useState<{ xp: number; key: number } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [notify, setNotify] = useState(props.notify);
  const started = useRef(false);
  const finishing = useRef(false);
  const speedKey = `celsu_bsns_speed_${userId}`;
  const soon = !src;

  // Speed: remembered per student on this device.
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(speedKey));
      if (SPEEDS.includes(v)) setSpeed(v);
    } catch {}
  }, [speedKey]);
  useEffect(() => {
    if (vref.current) vref.current.playbackRate = speed;
  }, [speed]);

  // Came here from the previous video's countdown: start playing.
  useEffect(() => {
    if (search.get("autoplay") === "1" && vref.current && !soon) void vref.current.play().catch(() => {});
  }, [search, soon]);

  const finish = useCallback(async () => {
    if (finishing.current || done) return;
    finishing.current = true;
    const r = track ? await finishLesson(createClient(), userId, lessonId) : { xp: 0, queued: false };
    setDone(true);
    setWeekDone((n) => n + 1);
    vref.current?.pause();
    setCelebrate({ xp: r.xp, key: Date.now() });
    sfx.finish();
    if (next && !reducedMotion()) setCount(5);
    router.refresh();
  }, [done, track, userId, lessonId, next, router]);

  // Countdown to the next video.
  useEffect(() => {
    if (count === null || !next) return;
    if (count <= 0) {
      router.push(next.n ? `${next.href}?autoplay=1` : next.href);
      return;
    }
    const h = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(h);
  }, [count, next, router]);

  const onTime = () => {
    const v = vref.current;
    if (!v) return;
    setTime(v.currentTime);
    if (v.duration && v.currentTime / v.duration >= 0.9 && !done) void finish();
  };
  const onMeta = () => {
    const v = vref.current;
    if (!v || !Number.isFinite(v.duration)) return;
    setDur(v.duration);
    v.playbackRate = speed;
    if (blockId && !videos[x - 1]?.duration) void createClient().rpc("set_video_duration", { p_block: blockId, p_seconds: Math.round(v.duration) });
  };
  const onPlay = () => {
    setPlaying(true);
    setCelebrate(null);
    setCount(null);
    // The first play marks the lesson as started (the week page then shows it in progress).
    if (!started.current && track && !done) {
      started.current = true;
      void createClient().rpc("record_lesson_progress", { p_lesson: lessonId, p_finish: false });
    }
  };
  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setFailed(true));
    else v.pause();
  };
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = vref.current;
    if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration;
  };
  const onScrubKey = (e: React.KeyboardEvent) => {
    const v = vref.current;
    if (!v) return;
    if (e.key === "ArrowRight") v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
    if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
  };
  const full = () => {
    const box = boxRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = vref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) return void document.exitFullscreen();
    if (box?.requestFullscreen) void box.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else if (box?.webkitRequestFullscreen) box.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };
  const pickSpeed = (s: number) => {
    setSpeed(s);
    setSpdOpen(false);
    try {
      localStorage.setItem(speedKey, String(s));
    } catch {}
  };
  const toggleNotify = async () => {
    const on = !notify;
    setNotify(on);
    const db = createClient();
    if (on) await db.from("video_ready_requests").upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    else await db.from("video_ready_requests").delete().eq("user_id", userId).eq("lesson_id", lessonId);
  };

  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;
  const left = videos.filter((v) => !(v.done || (v.id === lessonId && done))).length;
  const totalMin = videos.every((v) => v.duration) ? Math.round(videos.reduce((s, v) => s + (v.duration ?? 0), 0) / 60) : null;
  const wy = props.weekDone.y;
  const ringC = 2 * Math.PI * 27;
  const sub = x === 1 ? t.subFirst : x === y ? t.subLast : t.subMid;
  const durLabel = dur ? clock(dur) : null;

  return (
    <div className="bv">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="bv-tri" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFD400" />
            <stop offset=".5" stopColor="#43D6FE" />
            <stop offset="1" stopColor="#F20174" />
          </linearGradient>
        </defs>
      </svg>

      {/* ---------- header ---------- */}
      <header className="bv-hero">
        <div className="glow" aria-hidden>
          <i className="a" />
          <i className="b" />
          <i className="c" />
        </div>
        <div className="htop">
          <div className="crumb">
            <Link href={props.courseHref}>‹ {t.course}</Link>
            <Link href={props.weekHref} className="wk">
              {fill(t.weekCrumb, { n: week })}
            </Link>
          </div>
          <div className="logo" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/site/celsbsns-logo.png" alt="" width={900} height={252} />
          </div>
        </div>
        <div className="hmain">
          <div>
            <div className="kick">{fill(t.kick, { n: week, topic: topic.toUpperCase() })}</div>
            <h1>{fill(t.title, { x, y })}</h1>
            <p className="sub">{sub}</p>
            <div className="chips">
              {durLabel && (
                <span className="chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#A9EEFF" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {durLabel} {t.min}
                </span>
              )}
              {xp > 0 && <span className="chip xp">⚡ +{xp} XP</span>}
              <span className="chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="#FF8AC0" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-1v-6h3M4 12v5a2 2 0 0 0 2 2h1v-6H4" />
                </svg>
                {t.english}
              </span>
            </div>
          </div>
          <div className="wkc bv-glass">
            <div className="bv-ring">
              <svg viewBox="0 0 64 64" aria-hidden>
                <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="7" />
                <circle className="fg" cx="32" cy="32" r="27" strokeDasharray={ringC} style={{ strokeDashoffset: ringC * (1 - (wy ? weekDone / wy : 0)) }} />
              </svg>
              <b>{wy ? Math.round((weekDone / wy) * 100) : 0}%</b>
            </div>
            <div>
              <b className="t">{fill(t.myWeek, { n: week })}</b>
              <small>{fill(t.weekDone, { x: weekDone, y: wy })}</small>
            </div>
          </div>
        </div>
      </header>

      <div className="bv-main">
        <div className="bv-col">
          {/* ---------- player ---------- */}
          <div ref={boxRef} className={`bv-player ${playing ? "playing" : ""} ${soon || failed ? "soon" : ""} ${celebrate ? "celebrating" : ""}`}>
            <Poster t={t} week={week} x={x} y={y} topic={topic} />
            {!soon && (
              <video
                ref={vref}
                src={src ?? undefined}
                playsInline
                preload="metadata"
                className={playing || time > 0 ? "on" : ""}
                onClick={toggle}
                onPlay={onPlay}
                onPause={() => setPlaying(false)}
                onTimeUpdate={onTime}
                onLoadedMetadata={onMeta}
                onEnded={() => void finish()}
                onError={() => setFailed(true)}
              />
            )}
            <div className="nowp" aria-hidden>
              <Eq />
              {t.playing}
            </div>
            {!soon && !failed && (
              <>
                <button type="button" className="big" aria-label={t.play} onClick={toggle}>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M7 4.5v15l12.5-7.5z" fill="#fff" />
                  </svg>
                </button>
                <div className="ctrls bv-glass">
                  <button type="button" className="ib" aria-label={playing ? t.pause : t.play} onClick={toggle}>
                    {playing ? (
                      <svg viewBox="0 0 24 24" fill="#fff" aria-hidden>
                        <rect x="6" y="5" width="4" height="14" rx="1.2" />
                        <rect x="14" y="5" width="4" height="14" rx="1.2" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="#fff" aria-hidden>
                        <path d="M7 4.5v15l12.5-7.5z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="ib hs"
                    aria-label={t.back10}
                    onClick={() => {
                      if (vref.current) vref.current.currentTime = Math.max(0, vref.current.currentTime - 10);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
                    </svg>
                  </button>
                  <div
                    className="scrub"
                    role="slider"
                    tabIndex={0}
                    aria-label={t.scrub}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(dur)}
                    aria-valuenow={Math.round(time)}
                    aria-valuetext={`${clock(time)} / ${clock(dur)}`}
                    onPointerDown={seek}
                    onKeyDown={onScrubKey}
                  >
                    <div className="tr" />
                    <div className="fl" style={{ width: `${pct}%` }} />
                    <div className="kn" style={{ left: `${pct}%` }} />
                  </div>
                  <span className="tm">
                    {clock(time)} / {clock(dur)}
                  </span>
                  <div className={`spd ${spdOpen ? "open" : ""}`}>
                    <button type="button" aria-label={t.speed} aria-expanded={spdOpen} onClick={() => setSpdOpen((o) => !o)}>
                      {speed}×
                    </button>
                    {spdOpen && (
                      <ul>
                        {SPEEDS.map((s) => (
                          <li key={s}>
                            <button type="button" className={s === speed ? "on" : ""} onClick={() => pickSpeed(s)}>
                              {s}×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button type="button" className="ib hs" aria-label={t.full} onClick={full}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {celebrate && (
              <div className="done" role="status">
                <Sparks key={celebrate.key} xp={celebrate.xp} />
                <svg className="ck" viewBox="0 0 90 90" aria-hidden>
                  <circle cx="45" cy="45" r="40" />
                  <path d="M28 46l11 11 23-24" />
                </svg>
                <h2>{t.doneTitle}</h2>
                <p>{celebrate.xp ? fill(t.doneSub, { xp: celebrate.xp, x: weekDone, y: wy }) : fill(t.doneSubNoXp, { x: weekDone, y: wy })}</p>
                {next &&
                  (count !== null ? (
                    <Link href={next.n ? `${next.href}?autoplay=1` : next.href} className="nextc bv-glass">
                      <span className="cd" aria-hidden>
                        <svg viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
                          <circle
                            className="cdc"
                            cx="22"
                            cy="22"
                            r="19"
                            fill="none"
                            stroke="#FFD24D"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="119.4"
                          />
                        </svg>
                        <b>{count}</b>
                      </span>
                      <span>
                        <small>{t.next}</small>
                        <b>{next.label}</b>
                      </span>
                    </Link>
                  ) : (
                    <Link href={next.href} className="bv-btn">
                      {t.goNext}: {next.label} →
                    </Link>
                  ))}
                <button
                  type="button"
                  className="lnk"
                  onClick={() => {
                    setCount(null);
                    setCelebrate(null);
                  }}
                >
                  {t.stay}
                </button>
              </div>
            )}

            {(soon || failed) && (
              <div className="soonp">
                <div className="bv-glass box">
                  <svg
                    className="hg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#A9EEFF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />
                  </svg>
                  <h2>{soon ? t.soonTitle : t.errTitle}</h2>
                  <p>{soon ? t.soonSub : t.errSub}</p>
                  <div className="bt">
                    {failed && !soon && (
                      <button
                        type="button"
                        className="bv-btn"
                        onClick={() => {
                          setFailed(false);
                          vref.current?.load();
                        }}
                      >
                        {t.retry}
                      </button>
                    )}
                    {next && (
                      <Link href={next.href} className="bv-btn">
                        {next.n ? `${fill(t.videoN, { n: two(next.n) })} →` : `${next.label} →`}
                      </Link>
                    )}
                    {props.readingHref && next?.href !== props.readingHref && (
                      <Link href={props.readingHref} className="bv-btn g">
                        {tasks.find((k) => k.href === props.readingHref)?.name}
                      </Link>
                    )}
                  </div>
                  {soon && (
                    <>
                      <button type="button" role="switch" aria-checked={notify} className={`tg ${notify ? "on" : ""}`} onClick={() => void toggleNotify()}>
                        <span className="sw" aria-hidden />
                        {t.notify}
                      </button>
                      {notify && <p className="ok">{t.notifyOn}</p>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------- motivation strip ---------- */}
          <div className="bv-goal">
            <span className="gi" aria-hidden>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M22 12h-3" />
              </svg>
            </span>
            <div>
              <b>{left === 0 ? t.goalDone : left === 1 ? t.goalLeft1 : fill(t.goalLeft, { n: left })}</b>
              <small>{totalMin ? fill(t.goalMinutes, { n: totalMin }) : t.goalPace}</small>
            </div>
            <div className="steps" aria-hidden>
              {videos.map((v) => (
                <i key={v.id} className={v.done || (v.id === lessonId && done) ? "on" : v.id === lessonId ? "now" : ""} />
              ))}
            </div>
          </div>

          <Notes t={t} userId={userId} lessonId={lessonId} initial={props.notes} />

          {/* ---------- bottom navigation ---------- */}
          <nav className="bv-nav">
            {prev ? (
              <Link href={prev.href} className="prev">
                {t.prev}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.href} className={`nx ${done ? "pulse" : ""}`}>
                {next.n && (
                  <span className="th">
                    <Poster t={t} week={week} x={next.n} y={y} topic={topic} mini />
                  </span>
                )}
                <span>
                  <small>{t.nextLabel}</small>
                  <b>{next.label} →</b>
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* ---------- the week ---------- */}
        <aside className="bv-side">
          <div className="bv-card">
            <div className="lab">
              <span>{t.vids}</span>
              <span>{fill(t.vidsCount, { x: videos.filter((v) => v.done || (v.id === lessonId && done)).length, y })}</span>
            </div>
            <ul className="vis">
              {videos.map((v) => {
                const cur = v.id === lessonId;
                const seen = v.done || (cur && done);
                return (
                  <li key={v.id}>
                    <Link href={v.href} className={`vi ${cur ? "now" : ""}`} aria-current={cur ? "page" : undefined}>
                      <span className="th">
                        <Poster t={t} week={week} x={v.n} y={y} topic={topic} mini />
                        {seen && (
                          <span className="badge" aria-hidden>
                            <svg width="9" viewBox="0 0 24 24">
                              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span>
                        <b>
                          {fill(t.videoN, { n: two(v.n) })}
                          {cur && playing && <Eq />}
                        </b>
                        <small>
                          {(cur && dur ? clock(dur) : v.duration ? clock(v.duration) : null) ?? ""}
                          {(cur && dur) || v.duration ? " · " : ""}
                          {seen ? `${t.seen} ✓` : cur ? (playing ? t.now : t.here) : t.toSee}
                        </small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {tasks.length > 0 && (
              <>
                <div className="lab" style={{ marginTop: 14 }}>
                  <span>{t.tasks}</span>
                </div>
                <ul className="tas">
                  {tasks.map((k) => (
                    <li key={k.id}>
                      <Link href={k.href} className="ta">
                        <TaskIcon kind={k.kind} />
                        <span className="nm">
                          <b>{k.name}</b>
                          <small>{k.kind === "feedback" ? t.withCoach : (k.time ?? "")}</small>
                        </span>
                        <span className={`s ${STATUS_CLS[k.status]}`}>{t.status[k.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Sparks({ xp }: { xp: number }) {
  const [list] = useState(() =>
    reducedMotion()
      ? []
      : Array.from({ length: 18 }, (_, i) => {
          const a = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * 110;
          return { c: ["#FFD400", "#43D6FE", "#F20174"][i % 3], x: Math.cos(a) * r, y: Math.sin(a) * r, rot: Math.random() * 360 };
        }),
  );
  return (
    <>
      {list.map((s, i) => (
        <span
          key={i}
          className="spark"
          aria-hidden
          style={{ background: s.c, ["--x" as string]: `${s.x}px`, ["--y" as string]: `${s.y}px`, ["--r" as string]: `${s.rot}deg` }}
        />
      ))}
      {xp > 0 && (
        <span className="xpf" aria-hidden>
          +{xp} XP
        </span>
      )}
    </>
  );
}

function Notes({ t, userId, lessonId, initial }: { t: T; userId: string; lessonId: string; initial: string }) {
  const [body, setBody] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = (text: string) => {
    clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      const { error } = await createClient()
        .from("lesson_notes")
        .upsert({ user_id: userId, lesson_id: lessonId, body: text, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
      setState(error ? "idle" : "saved");
    }, 800);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="bv-card notes">
      <div className="hd">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
        <label htmlFor="bv-notes">{t.notes}</label>
        <small className={state !== "idle" ? "on" : ""} aria-live="polite">
          {state === "saving" ? t.saving : state === "saved" ? t.saved : ""}
        </small>
      </div>
      <textarea
        id="bv-notes"
        value={body}
        placeholder={t.notesPh}
        maxLength={20000}
        onChange={(e) => {
          setBody(e.target.value);
          save(e.target.value);
        }}
      />
      <div className="tips">
        {t.tips.map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
    </div>
  );
}
