"use client";

// C-069: animated openers in the student app (Matt's prototype, 2026-11-24). One component, five uses:
//   · the app (a cold open: the first /app load in a browser session, or a home-screen launch): CelsU blue, the
//     liquid ribbons form the U (~2.0 s), the sharp PNG settles on top (2.3 s), and at 2.9 s an iris opens from the
//     centre while the U grows and fades; the app underneath eases in (94% → 100%, 40% → 100% opacity, 0.9 s);
//   · a program (every time it's opened from a link marked data-opener="<program>" on Inicio, Matt 2026-11-24):
//     its logo clip plays full screen while Next navigates underneath (no preventDefault), then the same iris.
// Rules: never slower than the app (no play within 1.5 s → open now); a tap or "Saltar" opens at once; `ended` opens
// as a safety net; reduced motion: none. The background is painted from the clip's own edge pixels (matchColor:
// browsers decode colours slightly differently), except CelsGLOBAL (a busy map at first: a fixed gradient).
// The cold-open decision for full page loads is made before first paint by OPENER_BOOT (an inline script at the
// top of the /app layout); client-side arrivals into /app are decided here in a layout effect (also before paint).
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import "./opener.css";

type Cfg = { src: string; shape: "sq" | "wide"; openAt: number; logoAt?: number; zoom?: string; fallback: string; fixed?: boolean };
export const OPENERS: Record<string, Cfg> = {
  app: { src: "/site/celsu-u-open", shape: "sq", openAt: 2.9, logoAt: 2.3, fallback: "#00B3F7" },
  celstv: { src: "/motion/celstv-open", shape: "wide", openAt: 2.9, fallback: "#1F102D" },
  celsbsns: { src: "/motion/celsbsns-open", shape: "wide", zoom: "112vw", openAt: 2.9, fallback: "#0C0C1B" },
  celsus: { src: "/motion/celsus-open", shape: "wide", zoom: "132vw", openAt: 2.9, fallback: "#0E2A4F" },
  celsglobal: { src: "/motion/celsglobal-open", shape: "wide", openAt: 2.9, fallback: "linear-gradient(180deg,#1F314D,#161B30)", fixed: true },
};
const IRIS_MS = 950;
import { APP_KEY, READY_MS } from "./opener-boot";

type Boot = { t0: number; playing: boolean; skipped: boolean };
const boot = () => (window as Window & { __cuOpener?: Boot }).__cuOpener;


const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const store = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return "1"; // no storage: behave as if already seen (never block on it)
    }
  },
  set: (k: string) => {
    try {
      sessionStorage.setItem(k, "1");
    } catch {
      /* private mode */
    }
  },
};

export function AppOpener() {
  const op = useRef<HTMLDivElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const logo = useRef<HTMLImageElement | null>(null);
  const cur = useRef<Cfg | null>(null);
  const state = useRef<"idle" | "wait" | "play" | "open">("idle");
  const sampled = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const pathname = usePathname();

  /** Paint the overlay with the clip's real edge colours (top-middle and bottom-middle), as a vertical gradient. */
  const matchColor = useCallback(() => {
    const v = vid.current;
    const o = op.current;
    if (!v || !o || cur.current?.fixed) return;
    try {
      const sq = cur.current?.shape === "sq";
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = sq ? 16 : 9;
      const x = c.getContext("2d");
      if (!x) return;
      x.drawImage(v, 0, 0, c.width, c.height);
      // Wide clips:
      // the darkest of three points along the top row (1) and the bottom row (7): the programs' backgrounds are
      // darker than their logos, and a single middle point could land on a ribbon (CelsTV: a pink band).
      const px = (cx: number, cy: number) => x.getImageData(cx, cy, 1, 1).data;
      const darkest = (cy: number) => [px(1, cy), px(8, cy), px(14, cy)].reduce((m, d) => (d[0] + d[1] + d[2] < m[0] + m[1] + m[2] ? d : m));
      // The U: of several points along the top and bottom rows, the one closest to its flat blue (#02C5F7); none
      // close (a ribbon passing everywhere): keep the current colour.
      const nearBlue = (cy: number) => {
        const ds = [1, 4, 8, 11, 14].map((cx) => px(cx, cy));
        const dist = (d: Uint8ClampedArray) => Math.abs(d[0] - 2) + Math.abs(d[1] - 197) + Math.abs(d[2] - 247);
        const best = ds.reduce((m, d) => (dist(d) < dist(m) ? d : m));
        return dist(best) <= 60 ? best : null;
      };
      const t = sq ? nearBlue(1) : darkest(1);
      const b = sq ? nearBlue(14) : darkest(7);
      if (!t || !b) return;
      o.style.background = `linear-gradient(180deg,rgb(${t[0]},${t[1]},${t[2]}),rgb(${b[0]},${b[1]},${b[2]}))`;
    } catch {
      /* keep the fallback colour */
    }
  }, []);

  const open = useCallback(() => {
    const o = op.current;
    if (!o || (state.current !== "wait" && state.current !== "play")) return;
    state.current = "open";
    window.clearTimeout(timer.current);
    // The iris needs @property (an animatable --cu-r); without it the overlay just fades out.
    if (!(window.CSS && "registerProperty" in CSS)) o.classList.add("fade");
    o.classList.add("open");
    document.documentElement.classList.remove("cu-opening", "cu-opening-app");
    // Focus goes to the page underneath.
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    if (main && o.contains(document.activeElement)) main.focus({ preventScroll: true });
    window.setTimeout(() => {
      state.current = "idle";
      o.classList.remove("on", "open", "fade");
      vid.current?.pause();
    }, IRIS_MS);
  }, []);

  const play = useCallback(
    (key: string, budget: number = READY_MS) => {
      const o = op.current;
      const s = stage.current;
      const v = vid.current;
      const cfg = OPENERS[key];
      if (!o || !s || !v || !cfg || reduced()) {
        document.documentElement.classList.remove("cu-opening", "cu-opening-app");
        return;
      }
      cur.current = cfg;
      sampled.current = 0;
      o.style.background = cfg.fallback;
      s.className = `cu-opener-stage ${cfg.shape}`;
      s.style.setProperty("--zoom", cfg.zoom ?? "150vw");
      if (logo.current) {
        logo.current.style.display = cfg.logoAt ? "" : "none";
        logo.current.classList.remove("show");
      }
      // Load this clip now (and only now).
      v.innerHTML = `<source src="${cfg.src}.webm" type="video/webm"><source src="${cfg.src}.mp4" type="video/mp4">`;
      v.load();
      o.classList.remove("open");
      o.classList.add("on");
      document.documentElement.classList.add("cu-opening");
      state.current = "wait";
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (state.current === "wait") open(); // never make anyone wait on a video
      }, budget);
      const onCan = () => {
        v.removeEventListener("canplay", onCan);
        if (state.current !== "wait") return;
        state.current = "play";
        v.play().catch(() => {
          // A refused play (autoplay, Low Power Mode): open now.
          if (state.current === "play") {
            state.current = "wait";
            open();
          }
        });
      };
      v.addEventListener("canplay", onCan);
    },
    [open],
  );

  // The clip's clock: sample the colours, show the U's logo, open at openAt; `ended` as a safety net.
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const onPlaying = () => {
      window.clearTimeout(timer.current);
      const b = boot();
      if (b) b.playing = true;
      if (!sampled.current) {
        sampled.current = 1;
        matchColor();
      }
    };
    const onTime = () => {
      const c = cur.current;
      if (state.current !== "play" || !c) return;
      if (sampled.current < 2 && v.currentTime >= 1.0) {
        sampled.current = 2;
        matchColor();
      }
      if (c.logoAt && v.currentTime >= c.logoAt) logo.current?.classList.add("show");
      if (v.currentTime >= c.openAt) open();
    };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", open);
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", open);
    };
  }, [matchColor, open]);

  // A: the app's cold open. Full page loads were decided by OPENER_BOOT; a client-side arrival into /app is decided
  // here, before paint.
  useLayoutEffect(() => {
    const d = document.documentElement;
    if (!d.classList.contains("cu-opening-app") && !store.get(APP_KEY)) {
      store.set(APP_KEY);
      if (!reduced()) d.classList.add("cu-opening", "cu-opening-app");
    }
    if (!d.classList.contains("cu-opening-app")) return;
    // Full page loads: the 1.5 s started with the boot script; what's left of it is this clip's budget.
    const b = boot();
    if (b?.skipped) return;
    play("app", b ? Math.max(0, READY_MS - (Date.now() - b.t0)) : READY_MS);
  }, [play]);

  // B: a program opened from a marked link (every time). No preventDefault: Next navigates underneath.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[data-opener]");
      const key = a?.dataset.opener;
      if (!key || !OPENERS[key] || state.current !== "idle" || reduced()) return;
      play(key);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [play]);

  // Once Inicio is idle, prefetch the clips of the programs on it, so a tap starts at once.
  useEffect(() => {
    if (reduced()) return;
    const run = () => {
      const v = document.createElement("video");
      const ext = v.canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4";
      const keys = new Set([...document.querySelectorAll<HTMLAnchorElement>("a[data-opener]")].map((a) => a.dataset.opener!));
      keys.forEach((k) => {
        const cfg = OPENERS[k];
        if (!cfg) return;
        const href = `${cfg.src}.${ext}`;
        if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
        const l = document.createElement("link");
        l.rel = "prefetch";
        l.as = "video";
        l.href = href;
        document.head.appendChild(l);
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, [pathname]);

  return (
    <div ref={op} className="cu-opener" aria-hidden="true" onClick={open}>
      <div ref={stage} className="cu-opener-stage sq">
        <video ref={vid} muted playsInline preload="auto" tabIndex={-1} />
        {/* eslint-disable-next-line @next/next/no-img-element -- the sharp U settles on the clip's U */}
        <img ref={logo} src="/site/celsu-logo.png" alt="" />
      </div>
      <button type="button" className="cu-opener-skip" tabIndex={-1} onClick={open}>
        Saltar
      </button>
    </div>
  );
}
