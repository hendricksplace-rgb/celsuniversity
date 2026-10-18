"use client";

// "Descargar app": CelsU installs as a web app, and each environment installs differently.
// <InstallProvider> (root layout) detects the environment and keeps Chrome's install prompt;
// <InstallButton> (top bar) and <InstallCard> (Inicio) open the sheet that fits:
//   installed → nothing · Android / desktop Chrome+Edge → native prompt · iPhone → 3 Safari steps ·
//   Instagram / Facebook / WhatsApp / TikTok browser → "open it in your browser" · desktop → QR code.
// /app?instalar=1 (evaluation results, welcome emails) opens the sheet on arrival.
import { DISMISS_DAYS, DISMISS_KEY } from "./keys";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import qrcode from "qrcode-generator";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["install"];
type Env = "installed" | "android" | "ios-safari" | "ios-other" | "inapp" | "desktop";
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __celsuInstall?: PromptEvent | null;
  }
}

/** Inline script for the root layout: `beforeinstallprompt` can fire before React hydrates. */
export const captureInstallPrompt = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__celsuInstall=e;window.dispatchEvent(new Event("celsu-install"))});`;


function detect(): Env {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (/Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "inapp";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "ios-other" : "ios-safari";
  if (/Android|Mobile/i.test(ua)) return "android";
  return "desktop";
}

type Ctx = { env: Env | null; canPrompt: boolean; open: () => void; t: T };
const InstallContext = createContext<Ctx | null>(null);

export function InstallProvider({ t, children }: { t: T; children: React.ReactNode }) {
  const [env, setEnv] = useState<Env | null>(null);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    setEnv(detect());
    setPrompt(window.__celsuInstall ?? null);
    const onPrompt = () => setPrompt(window.__celsuInstall ?? null);
    const onInstalled = () => {
      window.__celsuInstall = null;
      setPrompt(null);
      setSheet(false);
      setEnv("installed");
      // For analytics: listen for "celsu:appinstalled" on window.
      window.dispatchEvent(new CustomEvent("celsu:appinstalled"));
    };
    window.addEventListener("celsu-install", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const url = new URL(window.location.href);
    if (url.searchParams.get("instalar") === "1") {
      setSheet(true);
      url.searchParams.delete("instalar");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    return () => {
      window.removeEventListener("celsu-install", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__celsuInstall = null;
    setPrompt(null);
    if (outcome === "accepted") setSheet(false);
  }, [prompt]);

  const value = useMemo<Ctx>(() => ({ env, canPrompt: !!prompt, open: () => setSheet(true), t }), [env, prompt, t]);
  return (
    <InstallContext.Provider value={value}>
      {children}
      {sheet && env && env !== "installed" && <InstallSheet t={t} env={env} canPrompt={!!prompt} onInstall={install} onClose={() => setSheet(false)} />}
    </InstallContext.Provider>
  );
}

function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error("InstallProvider missing");
  return ctx;
}

const DownloadIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </svg>
);

/** Top bar: pink pill, always visible until the app is installed. */
export function InstallButton() {
  const { env, open, t } = useInstall();
  if (!env || env === "installed") return null;
  return (
    <button type="button" onClick={open} className="inline-flex items-center gap-1.5 rounded-full bg-[#D6006A] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 sm:text-sm">
      <DownloadIcon />
      <span className="sm:hidden">{t.buttonShort}</span>
      <span className="hidden sm:inline">{t.button}</span>
    </button>
  );
}

/** Any other "Descargar app" button (evaluation results, welcome screen). */
export function InstallLink({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { env, open, t } = useInstall();
  if (!env || env === "installed") return null;
  return (
    <button type="button" onClick={open} className={className}>
      {children ?? t.button}
    </button>
  );
}

/**
 * Inicio: big gradient card under the greeting; "Ahora no" hides it for 7 days.
 * Rendered on the server (the dismissal is a cookie, see InstallCardSlot) so it never pushes the
 * page down after loading; the installed app hides it with CSS (display-mode: standalone).
 */
export function InstallCard({ dismissed = false }: { dismissed?: boolean }) {
  const { env, open, t } = useInstall();
  const [hidden, setHidden] = useState(dismissed);
  useEffect(() => {
    // Dismissals from before the cookie existed.
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (Date.now() - at < DISMISS_DAYS * 864e5) setHidden(true);
    } catch {
      /* private mode */
    }
  }, []);
  if (env === "installed" || hidden) return null;
  const dismiss = () => {
    document.cookie = `${DISMISS_KEY}=1; max-age=${DISMISS_DAYS * 86400}; path=/; samesite=lax`;
    setHidden(true);
  };
  return (
    <section className="relative overflow-hidden rounded-3xl p-5 sm:p-6 [@media(display-mode:standalone)]:hidden" style={{ background: "linear-gradient(135deg,#F20174 0%,#E0157F 45%,#8E2DE2 100%)" }}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FFC531]/40 blur-3xl" />
      <div className="relative flex items-start gap-3.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-md">
          <Image src="/icons/icon-96.png" alt="" width={44} height={44} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-white sm:text-xl">{t.cardTitle}</h2>
          <p className="mt-0.5 text-sm font-semibold text-white/85">{t.cardSub}</p>
        </div>
      </div>
      <div className="relative mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={open} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFEF05] px-5 py-3.5 text-base font-extrabold text-[#1B1830] transition hover:brightness-95">
          <DownloadIcon className="h-5 w-5" />
          {t.cardCta}
        </button>
        <button type="button" onClick={dismiss} className="rounded-2xl px-4 py-2 text-sm font-bold text-white/80 hover:text-white">
          {t.notNow}
        </button>
      </div>
      <p className="relative mt-2 text-center text-xs font-semibold text-white/75 sm:text-left">{t.cardNote}</p>
    </section>
  );
}

// ---------------------------------------------------------------- sheets

const AppIcon = () => (
  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#EFE6F2] bg-white shadow-sm">
    <Image src="/icons/icon-96.png" alt="" width={44} height={44} />
  </span>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const AddSquareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#1B1830" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

function Steps({ steps, trailing, animate }: { steps: { t: string; d: string }[]; trailing?: React.ReactNode[]; animate?: boolean }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {steps.map((s, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 rounded-2xl bg-[#F7F5FA] p-3 ${animate ? "install-step" : ""}`}
          style={animate ? { animationDelay: `${i * 1.2}s` } : undefined}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#D6006A] text-sm font-extrabold text-white">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <b className="block text-sm font-extrabold text-[#1B1830]">{s.t}</b>
            <span className="block text-xs font-semibold text-[#6B6680]">{s.d}</span>
          </span>
          {trailing?.[i] && <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-xl bg-white px-2 shadow-sm">{trailing[i]}</span>}
        </li>
      ))}
    </ol>
  );
}

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }, [text]);
  return <div className="mx-auto h-44 w-44 rounded-2xl border border-[#EFE6F2] bg-white p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function InstallSheet({ t, env, canPrompt, onInstall, onClose }: { t: T; env: Env; canPrompt: boolean; onInstall: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState("");
  useEffect(() => {
    setHref(window.location.href);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(href).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const androidInApp = env === "inapp" && /Android/i.test(navigator.userAgent);
  const intentUrl = href ? `intent://${href.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end` : "";
  const desktop = env === "desktop";
  const notNow = (
    <button type="button" onClick={onClose} className="mt-2 w-full py-2.5 text-sm font-bold text-[#6B6680] hover:text-[#1B1830]">
      {t.notNow}
    </button>
  );

  let body: React.ReactNode;
  if (env === "inapp") {
    body = (
      <>
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#FFF3D6] text-2xl font-extrabold text-[#B8860B]">!</span>
          <div>
            <h2 className="text-xl font-extrabold text-[#1B1830]">{t.inappTitle}</h2>
            <p className="text-sm font-semibold text-[#6B6680]">{t.inappSub}</p>
          </div>
        </div>
        <Steps steps={t.inappSteps} />
        {androidInApp && intentUrl && (
          <a href={intentUrl} className="mt-4 block w-full rounded-full bg-[#D6006A] py-3.5 text-center text-base font-extrabold text-white">
            {t.openChrome}
          </a>
        )}
        <button type="button" onClick={() => void copy()} className="mt-3 w-full rounded-full bg-[#1B1830] py-3.5 text-base font-extrabold text-white">
          {copied ? t.copied : t.copyLink}
        </button>
        {notNow}
      </>
    );
  } else if (env === "ios-safari" || env === "ios-other") {
    body = (
      <>
        <div className="flex items-start gap-3">
          <AppIcon />
          <div>
            <h2 className="text-xl font-extrabold text-[#1B1830]">{t.iosTitle}</h2>
            <p className="text-sm font-semibold text-[#6B6680]">{t.iosSub}</p>
          </div>
        </div>
        {env === "ios-other" && <p className="mt-3 rounded-2xl bg-[#FFF3D6] p-3 text-sm font-bold text-[#7A5600]">{t.iosNotSafari}</p>}
        <Steps steps={t.iosSteps} animate trailing={[<ShareIcon key="s" />, <AddSquareIcon key="a" />, <b key="g" className="text-sm font-extrabold text-[#0A84FF]">{t.iosAdd}</b>]} />
        {notNow}
      </>
    );
  } else if (desktop) {
    body = (
      <>
        <h2 className="text-lg font-extrabold text-[#1B1830]">{t.desktopTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">{t.desktopSub}</p>
        <div className="mt-4">{href && <Qr text={href} />}</div>
        {canPrompt && (
          <>
            <p className="mt-4 text-center text-xs font-semibold text-[#8A86A0]">{t.desktopOr}</p>
            <button type="button" onClick={onInstall} className="mt-2 w-full rounded-full bg-[#F1EDF5] py-3 text-sm font-extrabold text-[#1B1830] hover:bg-[#E9E3EF]">
              {t.desktopInstall}
            </button>
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-start gap-3">
          <AppIcon />
          <div>
            <h2 className="text-xl font-extrabold text-[#1B1830]">{t.androidTitle}</h2>
            <p className="text-sm font-semibold text-[#6B6680]">{t.androidSub}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {t.chips.map((c) => (
            <span key={c} className="rounded-full bg-[#FFE3F0] px-3 py-1.5 text-xs font-extrabold text-[#D10F75]">
              {c}
            </span>
          ))}
        </div>
        {canPrompt ? (
          <button type="button" onClick={onInstall} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D6006A] py-3.5 text-base font-extrabold text-white transition hover:brightness-110">
            <DownloadIcon className="h-5 w-5" />
            {t.installNow}
          </button>
        ) : (
          // Chrome hasn't offered the prompt (other browser, or not yet): the menu route.
          <Steps steps={t.androidManual} />
        )}
        {notNow}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.button}>
      <button type="button" aria-label={t.close} onClick={onClose} className={`absolute inset-0 h-full w-full cursor-default ${desktop ? "bg-black/20" : "bg-black/45"}`} />
      <div
        className={
          desktop
            ? "absolute right-4 top-16 w-[min(360px,calc(100vw-2rem))] rounded-3xl bg-white p-5 shadow-2xl"
            : "absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[28px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-2xl"
        }
      >
        {!desktop && <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#E4DEEA]" />}
        {body}
      </div>
    </div>
  );
}
