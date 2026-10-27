"use client";

// C-026 "Tabla de posiciones" (celsu-tabla-posiciones-mockup.html): one leaderboard per course, by XP this week
// (from Monday 00:00 Mexico City), all time, or in the student's class. The top 3 stand on a podium and can be
// cheered with one of the preset English phrases (never free text); the student's own place stays in a bar at the
// bottom with how much XP they need to pass the next person.
import "./tabla.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary, Lang } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { fill } from "@/components/course/kit";
import { playClip, stopClip } from "@/components/part/clip";
import { reducedMotion, sfx } from "@/components/part/fx";
import { Words } from "./Words";
import { avatarColor, xpToPass, type Lb, type LbCourse, type LbRow, type Period, type Phrase } from "@/lib/leaderboard-shared";

type T = Dictionary["lb"];
type Mine = { count: number; latest: { from: string; en: string; emoji: string }[] };
const RING = ["#FFD21F", "#DDE6FF", "#E0955A"];
const RANK_KEY = (course: string) => `celsu_lb_rank_${course}`;

export function Tabla({
  t,
  userId,
  lang,
  courses,
  course,
  initial,
  initialPeriod,
  phrases,
  prefs: prefs0,
  xpValues,
  mine: mine0,
}: {
  t: T;
  userId: string;
  lang: Lang;
  courses: LbCourse[];
  course: LbCourse;
  initial: Lb | null;
  initialPeriod: "week" | "all";
  phrases: Phrase[];
  prefs: { show: boolean; receive: boolean };
  xpValues: { type: string; xp: number; n: number }[];
  mine: Mine;
}) {
  const router = useRouter();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [lb, setLb] = useState<Lb | null>(initial);
  const [hasClass] = useState(!!initial?.has_class);
  const [prefs, setPrefs] = useState(prefs0);
  const [mine, setMine] = useState(mine0);
  const [sheet, setSheet] = useState<LbRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [barIn, setBarIn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const load = useCallback(
    async (p: Period) => {
      const { data } = await createClient().rpc("leaderboard", {
        p_course: course.id,
        p_period: p === "all" ? "all" : "week",
        p_scope: p === "class" ? "class" : "course",
      });
      if (data) setLb(data as unknown as Lb);
    },
    [course.id],
  );

  const pick = (p: Period) => {
    if (p === period) return;
    setPeriod(p);
    void load(p);
    const u = new URL(window.location.href);
    if (p === "all") u.searchParams.set("p", "all");
    else u.searchParams.delete("p");
    window.history.replaceState(null, "", u);
  };

  // "▲ ¡Subiste N lugares esta semana!": compared with the last rank this device saw for the course this week.
  useEffect(() => {
    const id = setTimeout(() => setBarIn(true), 600);
    if (period !== "week" || !lb?.my_rank) return () => clearTimeout(id);
    const meRow = lb.rows.find((r) => r.is_me);
    if (!meRow?.xp) return () => clearTimeout(id);
    try {
      const prev = JSON.parse(localStorage.getItem(RANK_KEY(course.id)) ?? "null") as { week: string; rank: number } | null;
      if (prev && prev.week === lb.period_start && prev.rank > lb.my_rank) {
        const n = prev.rank - lb.my_rank;
        setTimeout(() => say(n === 1 ? t.movedUp1 : fill(t.movedUp, { n })), 1200);
      }
      localStorage.setItem(RANK_KEY(course.id), JSON.stringify({ week: lb.period_start, rank: lb.my_rank }));
    } catch {}
    return () => clearTimeout(id);
    // Once per load of the weekly table.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lb?.period_start, period]);

  const name = (r: { display: string; is_me?: boolean }) => (!r.is_me && r.display === "Estudiante" ? t.hiddenName : r.display);
  const nf = (n: number) => n.toLocaleString(locale);

  const rows = lb?.rows ?? [];
  const podium = rows.filter((r) => r.rank <= 3 && r.xp > 0);
  const rest = rows.filter((r) => r.rank > 3);
  const me = rows.find((r) => r.is_me) ?? null;
  const canCheer = period !== "all";

  const setPref = async (k: "show" | "receive", v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    await createClient()
      .from("profiles")
      .update(k === "show" ? { show_on_leaderboard: v } : { receive_cheers: v })
      .eq("id", userId);
    void load(period);
  };

  const openFor = (r: LbRow) => {
    if (r.is_me) return setSheet(r);
    if (canCheer && r.receive_cheers) setSheet(r);
  };

  return (
    <div className="lb">
      {toast && (
        <div className="lb-toast" role="status">
          {toast}
        </div>
      )}
      <div className="lb-top">
        <button
          type="button"
          className="lb-back"
          aria-label={t.back}
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/app/progreso"))}
        >
          ‹
        </button>
        <h1>🏆 {t.title}</h1>
      </div>

      {courses.length > 1 && (
        <nav className="lb-prog" aria-label={t.courses}>
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/app/progreso/tabla?c=${c.slug}${period === "all" ? "&p=all" : ""}`}
              className={c.id === course.id ? "on" : ""}
              aria-current={c.id === course.id ? "page" : undefined}
              style={{ ["--c" as string]: c.color }}
            >
              <i aria-hidden />
              {c.label}
            </Link>
          ))}
        </nav>
      )}

      <div className={`lb-seg ${hasClass ? "" : "two"}`} role="tablist">
        {(["week", "all", ...(hasClass ? ["class"] : [])] as Period[]).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={period === p} className={period === p ? "on" : ""} onClick={() => pick(p)}>
            {p === "week" ? t.week : p === "all" ? t.all : t.cls}
          </button>
        ))}
      </div>

      {lb && <Info t={t} lb={lb} period={period} />}

      {lb && lb.ranked === 0 ? (
        <p className="lb-empty">{period === "all" ? t.emptyAll : t.emptyWeek}</p>
      ) : (
        <>
          <div className="lb-pod" key={`${course.id}-${period}`}>
            {[1, 0, 2].map((i) => {
              const r = podium[i];
              if (!r) return <div key={i} className={`lb-pl p${i + 1} vacant`} />;
              const tap = r.is_me || (canCheer && r.receive_cheers);
              const Av = tap ? "button" : "div";
              return (
                <div key={r.user_id} className={`lb-pl p${i + 1}`}>
                  <Av
                    {...(tap
                      ? { type: "button" as const, onClick: () => openFor(r), "aria-label": r.is_me ? t.mine : fill(t.cheerTo, { name: name(r) }) }
                      : {})}
                    className="lb-av big"
                    style={{ background: avatarColor(r.user_id) }}
                  >
                    {i === 0 && (
                      <span className="crown" aria-hidden>
                        👑
                      </span>
                    )}
                    <Face r={r} />
                    {tap && !r.is_me && (
                      <span className="clap" aria-hidden>
                        👏
                      </span>
                    )}
                  </Av>
                  <div className="nm">
                    {name(r)}
                    {r.is_me && <span className="lb-tu">{t.you}</span>}
                  </div>
                  <div className="xp">{nf(r.xp)} XP</div>
                  {canCheer && r.cheers != null && <div className="cc">👏 {r.cheers}</div>}
                  <div className="blk">{i + 1}</div>
                </div>
              );
            })}
          </div>
          {canCheer && podium.some((r) => !r.is_me && r.receive_cheers) && <p className="lb-hint">{t.hint}</p>}

          <div className="lb-list">
            {rest.map((r, k) => {
              const prev = k ? rest[k - 1].rank : 3;
              return (
                <div key={r.user_id} style={{ display: "contents" }}>
                  {period === "week" && prev <= 5 && r.rank > 5 && <div className="lb-zone">{t.zone}</div>}
                  {r.rank > prev + 1 && (
                    <div className="lb-gap" aria-hidden>
                      • • •
                    </div>
                  )}
                  <div className={`lb-row ${r.is_me ? "me" : ""}`} style={{ ["--d" as string]: `${0.5 + Math.min(k, 12) * 0.04}s` }}>
                    <div className="rk">{r.rank}</div>
                    <div className="lb-av" style={{ background: avatarColor(r.user_id) }}>
                      <Face r={r} />
                    </div>
                    <div className="who">
                      <b>
                        {name(r)}
                        {r.is_me && <span className="lb-tu">{t.you}</span>}
                      </b>
                      <small>{r.streak > 1 ? fill(t.streak, { n: r.streak }) : r.streak === 1 ? t.streak1 : t.noStreak}</small>
                    </div>
                    <div className="pts">
                      {nf(r.xp)} XP
                      {period === "week" && <Move n={r.rank_change} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <details className="lb-how">
        <summary>{t.how}</summary>
        <ul>
          {xpValues.map((v) => (
            <li key={v.type}>
              <span>{(t.types as Record<string, string>)[v.type] ?? t.types.other}</span>
              <b>+{v.xp} XP</b>
            </li>
          ))}
        </ul>
        <p className="note">{t.howNote}</p>
        <Switch label={t.showName} help={t.showNameHelp} on={prefs.show} onChange={(v) => void setPref("show", v)} />
        <Switch label={t.recv} help={t.recvHelp} on={prefs.receive} onChange={(v) => void setPref("receive", v)} />
      </details>

      {lb?.my_rank && me && (
        <div className={`lb-mebar ${barIn ? "show" : ""}`}>
          <div className="l1">
            <div className="rk">#{lb.my_rank}</div>
            <div className="t">
              {me.xp === 0 ? (
                t.noXp
              ) : lb.my_rank === 1 ? (
                <>
                  <b>{t.first}</b> {t.firstB}
                </>
              ) : (
                <>
                  {t.behindA} <b>{nf(xpToPass(lb))} XP</b> {t.behindB} <b>{lb.ahead ? name(lb.ahead) : ""}</b>
                </>
              )}
            </div>
            <Link href={course.earnHref} className="go">
              {t.earn}
            </Link>
          </div>
          <div className="bar">
            <i
              style={{
                width: barIn ? `${me.xp === 0 ? 4 : lb.my_rank === 1 || !lb.ahead ? 100 : Math.max(10, Math.round((me.xp / (lb.ahead.xp + 1)) * 100))}%` : 0,
              }}
            />
          </div>
        </div>
      )}

      {sheet &&
        (sheet.is_me ? (
          <MineSheet t={t} r={sheet} mine={mine} onClose={() => setSheet(null)} />
        ) : (
          <CheerSheet
            t={t}
            r={sheet}
            name={name(sheet)}
            nf={nf}
            course={course.id}
            phrases={phrases}
            onClose={() => setSheet(null)}
            onSent={(count, phrase) => {
              setLb((l) => (l ? { ...l, rows: l.rows.map((x) => (x.user_id === sheet.user_id ? { ...x, cheers: count, cheered_today: true } : x)) } : l));
              say(fill(t.sent, { phrase: phrase.en, name: name(sheet).split(" ")[0] }));
            }}
          />
        ))}
      {/* Keep "Tus felicitaciones" fresh after a cheer arrives while the page is open. */}
      <MineRefresher course={course.id} onMine={setMine} />
    </div>
  );
}

function MineRefresher({ course, onMine }: { course: string; onMine: (m: Mine) => void }) {
  useEffect(() => {
    const h = () =>
      void createClient()
        .rpc("my_cheers", { p_course: course })
        .then(({ data }) => data && onMine(data as unknown as Mine));
    window.addEventListener("celsu:cheers", h);
    return () => window.removeEventListener("celsu:cheers", h);
  }, [course, onMine]);
  return null;
}

function Info({ t, lb, period }: { t: T; lb: Lb; period: Period }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const n = Math.max(lb.students, lb.ranked);
  const count = n === 1 ? t.student1 : fill(t.students, { n });
  if (period === "class")
    return (
      <div className="lb-info">
        <span>{lb.teacher ? fill(t.group, { name: lb.teacher }) : t.groupAnon}</span>
        <span className="lg">{count}</span>
      </div>
    );
  if (period === "all")
    return (
      <div className="lb-info">
        <span>{t.since}</span>
        <span className="lg">{count}</span>
      </div>
    );
  const left = Math.max(0, new Date(lb.period_end).getTime() - now);
  const d = Math.floor(left / 864e5);
  const h = Math.floor((left % 864e5) / 36e5);
  const m = Math.floor((left % 36e5) / 6e4);
  return (
    <div className="lb-info">
      <span>
        {t.endsIn} <b>{d ? fill(t.dh, { d, h }) : fill(t.hm, { h, m })}</b>
      </span>
      <span className="lg">{count}</span>
    </div>
  );
}

function Face({ r }: { r: Pick<LbRow, "avatar_url" | "initial"> }) {
  // eslint-disable-next-line @next/next/no-img-element
  return r.avatar_url ? <img src={r.avatar_url} alt="" className="ph" /> : <>{r.initial}</>;
}

function Move({ n }: { n: number | null }) {
  if (!n) return <small className="eq">–</small>;
  return n > 0 ? <small className="up">▲ {n}</small> : <small className="dn">▼ {-n}</small>;
}

function Switch({ label, help, on, onChange }: { label: string; help: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="lb-priv">
      <span>
        {label}
        <small>{help}</small>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`sw ${on ? "" : "off"}`} onClick={() => onChange(!on)} />
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
      stopClip();
    };
  }, [onClose]);
  return (
    <>
      <div className="lb-shade" onClick={onClose} aria-hidden />
      <div className="lb-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" aria-hidden />
        {children}
      </div>
    </>
  );
}

function SheetHead({ r, title, sub, onClose, t }: { r: LbRow; title: string; sub: string; onClose: () => void; t: T }) {
  return (
    <div className="lb-sh-h">
      <div className="lb-av" style={{ background: avatarColor(r.user_id), ["--ring" as string]: RING[r.rank - 1] ?? "#fff" }}>
        <Face r={r} />
      </div>
      <div>
        <b>{title}</b>
        <small>{sub}</small>
      </div>
      <button type="button" className="x" onClick={onClose} aria-label={t.close}>
        ✕
      </button>
    </div>
  );
}

function MineSheet({ t, r, mine, onClose }: { t: T; r: LbRow; mine: Mine; onClose: () => void }) {
  const shown = mine.latest.slice(0, 4);
  return (
    <Sheet onClose={onClose} label={t.mine}>
      <SheetHead r={r} t={t} title={t.mine} sub={fill(t.mineSub, { n: mine.count })} onClose={onClose} />
      {mine.count ? (
        <ul className="lb-mine">
          {shown.map((c, i) => (
            <li key={i}>
              <b>{c.from}:</b> «{c.en} {c.emoji}»
            </li>
          ))}
          {mine.count > shown.length && <li className="more">{fill(t.more, { n: mine.count - shown.length })}</li>}
        </ul>
      ) : (
        <p className="lb-sh-sub">{t.mineNone}</p>
      )}
    </Sheet>
  );
}

function CheerSheet({
  t,
  r,
  name,
  nf,
  course,
  phrases,
  onClose,
  onSent,
}: {
  t: T;
  r: LbRow;
  name: string;
  nf: (n: number) => string;
  course: string;
  phrases: Phrase[];
  onClose: () => void;
  onSent: (count: number, p: Phrase) => void;
}) {
  const first = name.split(" ")[0];
  const [sel, setSel] = useState<Phrase | null>(null);
  const [k, setK] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(!!r.cheered_today);
  const sendRef = useRef<HTMLButtonElement>(null);
  const [fly, setFly] = useState<{ id: number; e: string; x: number; dx: number; dy: number; r: number; d: number }[]>([]);

  const choose = (p: Phrase) => {
    if (done || busy) return;
    setSel(p);
    setErr(null);
    playClip(p.audio ?? undefined, setK, p.wt, () => setK(-1));
  };

  const send = async () => {
    if (!sel || busy) return;
    setBusy(true);
    const { data, error } = await createClient().rpc("send_cheer", { p_to: r.user_id, p_course: course, p_phrase: sel.code });
    if (error) {
      setBusy(false);
      const code = Object.keys(t.errors).find((c) => error.message.includes(c)) as keyof T["errors"] | undefined;
      if (code === "cheer_today") setDone(true);
      setErr(t.errors[code ?? "generic"]);
      return;
    }
    sfx.cheer();
    if (!reducedMotion()) {
      const b = sendRef.current?.getBoundingClientRect();
      const x = b ? b.left + b.width / 2 : window.innerWidth / 2;
      setFly(
        Array.from({ length: 12 }, (_, i) => ({
          id: i,
          e: ["👏", "🎉", "⭐", "💜"][i % 4],
          x: x - 13 + (Math.random() - 0.5) * 60,
          dx: (Math.random() - 0.5) * 200,
          dy: -(160 + Math.random() * 220),
          r: (Math.random() - 0.5) * 90,
          d: i * 0.03,
        })),
      );
    }
    const count = Number((data as { count?: number } | null)?.count ?? (r.cheers ?? 0) + 1);
    setTimeout(
      () => {
        onSent(count, sel);
        onClose();
      },
      reducedMotion() ? 0 : 650,
    );
  };

  return (
    <Sheet onClose={onClose} label={fill(t.sheetTitle, { name })}>
      <SheetHead r={r} t={t} title={fill(t.sheetTitle, { name })} sub={fill(t.sheetSub, { rank: r.rank, xp: nf(r.xp) })} onClose={onClose} />
      <p className="lb-sh-sub">{fill(t.pick, { name: first })}</p>
      <div className="lb-opts">
        {phrases.map((p) => (
          <button
            key={p.code}
            type="button"
            className={`opt ${sel?.code === p.code ? "sel" : ""}`}
            aria-pressed={sel?.code === p.code}
            disabled={done}
            onClick={() => choose(p)}
          >
            <span className="e" aria-hidden>
              {p.emoji}
            </span>
            <b lang="en">
              <Words text={p.en} k={sel?.code === p.code ? k : -1} />
            </b>
            <small>{p.es}</small>
          </button>
        ))}
      </div>
      {err && <p className="lb-err">{err}</p>}
      <button ref={sendRef} type="button" className="lb-send" disabled={done || !sel || busy} onClick={() => void send()}>
        {done ? t.done : busy ? t.sending : sel ? fill(t.send, { name: first }) : t.choose}
      </button>
      <div className="lb-rule">{t.rule}</div>
      {fly.map((f) => (
        <span
          key={f.id}
          className="lb-fly"
          aria-hidden
          style={{
            left: f.x,
            top: (sendRef.current?.getBoundingClientRect().top ?? 400) - 10,
            ["--dx" as string]: `${f.dx}px`,
            ["--dy" as string]: `${f.dy}px`,
            ["--r" as string]: `${f.r}deg`,
            animationDelay: `${f.d}s`,
          }}
        >
          {f.e}
        </span>
      ))}
    </Sheet>
  );
}
