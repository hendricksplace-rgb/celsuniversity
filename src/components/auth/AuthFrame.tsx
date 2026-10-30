"use client";

// The sign-in canvas (C-032): flowing gradient, the logo's ribbons and a top bar; on desktop a welcome side
// (the U, a title per screen, the 4 programs and a "Frase del día" that lights up word by word) beside the card.
// Phones (container ≤ 860px) show only the card, with the U on top.
import Link from "next/link";
import { useEffect, useState } from "react";
import { setLanguage } from "@/lib/actions";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { LoginCopy } from "@/lib/i18n/login-copy";
import "@/components/eval/eval.css";
import "./auth.css";

export type SideKey = keyof LoginCopy["side"];

export function AuthFrame({ c, lang, side, children }: { c: LoginCopy; lang: Lang; side: SideKey; children: React.ReactNode }) {
  const [title, sub] = c.side[side];
  return (
    <div className="ev au">
      <div className="ev-ribbons" aria-hidden>
        <i className="r1" />
        <i className="r2" />
        <i className="r3" />
        <i className="r4" />
      </div>
      <header className="ev-top">
        <Link href="/" className="ev-brand" aria-label="CelsU">
          {/* eslint-disable-next-line @next/next/no-img-element -- the real U, a small local PNG */}
          <img src="/brand/celsu-u.png" alt="" width={38} height={27} />
          <b>
            Cels<span>U</span>
          </b>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/cursos" className="ev-lang ev-pg">
            {c.courses}
          </Link>
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={lang === "es" ? "en" : "es"} />
            <button type="submit" className="ev-lang ev-pg" aria-label={c.switchLangLabel}>
              {c.switchLang}
            </button>
          </form>
        </div>
      </header>
      <div className="au-split">
        <aside className="au-side" aria-label={c.kicker}>
          <div className="au-u">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/celsu-u.png" alt="" width={130} height={92} />
          </div>
          <span className="ev-kick">
            <i />
            {c.kicker}
          </span>
          <h1 key={title}>{title}</h1>
          <p className="au-sub">{sub}</p>
          <ul className="au-progs">
            {c.programs.map(([name, what, color], i) => (
              <li key={name} className="au-pr" style={{ ["--pc" as string]: color, ["--d" as string]: `${0.3 + i * 0.1}s` }}>
                <i />
                <div>
                  <b>{name}</b>
                  <small>{what}</small>
                </div>
              </li>
            ))}
          </ul>
          <Quote c={c} />
        </aside>
        <main>
          <div className="au-mhead" aria-hidden>
            <div className="au-u" style={{ width: 120, margin: "0 auto" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/celsu-u.png" alt="" width={120} height={85} />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

/** "Frase del día": a new phrase every 6 s, its words lighting up one by one. */
function Quote({ c }: { c: LoginCopy }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 6000);
    return () => clearInterval(id);
  }, []);
  const [en, es] = c.quotes[i % c.quotes.length];
  return (
    <div className="au-quote ev-pg" aria-live="off">
      <div className="k">{c.quoteKicker}</div>
      <p key={i} lang="en">
        {en.split(" ").map((w, k) => (
          <span key={k} style={{ ["--d" as string]: `${0.4 + k * 0.32}s` }}>
            {w}{" "}
          </span>
        ))}
      </p>
      <small>{es}</small>
    </div>
  );
}

const ICONS = {
  mail: (
    <>
      <path d="M3 6h18v12H3z" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

export const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    {ICONS.mail}
  </svg>
);

export const Check = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

type FieldProps = {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  value: string;
  onChange: (v: string) => void;
  type?: "email" | "text" | "password";
  autoComplete?: string;
  error?: string | null;
  valid?: boolean;
  c: LoginCopy;
  autoFocus?: boolean;
  name?: string;
};

/** A floating-label field with its icon; email shows a green check once valid, passwords an eye and a Caps Lock warning. */
export function Field({ id, label, icon, value, onChange, type = "text", autoComplete, error, valid, c, autoFocus, name }: FieldProps) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const pw = type === "password";
  const capsCheck = (e: React.KeyboardEvent) => pw && setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <>
      <div className={`au-fld${error ? " err" : ""}${valid ? " valid" : ""}`}>
        <input
          id={id}
          name={name ?? id}
          type={pw && show ? "text" : type}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={capsCheck}
          onKeyUp={capsCheck}
          onBlur={() => setCaps(false)}
          autoComplete={autoComplete}
          autoCapitalize={type === "text" ? "words" : "none"}
          autoCorrect="off"
          spellCheck={false}
          inputMode={type === "email" ? "email" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-msg`}
          autoFocus={autoFocus}
        />
        <label htmlFor={id}>{label}</label>
        <svg className="au-ic" viewBox="0 0 24 24" aria-hidden>
          {ICONS[icon]}
        </svg>
        {pw ? (
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? c.hidePassword : c.showPassword} aria-pressed={show}>
            <svg viewBox="0 0 24 24" aria-hidden style={{ opacity: show ? 0.5 : 1 }}>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M4 4l16 16" />}
            </svg>
          </button>
        ) : (
          <span className="au-ok" aria-hidden>
            <Check />
          </span>
        )}
      </div>
      <p className="au-msg" id={`${id}-msg`} aria-live="polite">
        {error ?? ""}
      </p>
      {pw && caps && <p className="au-caps">{c.caps}</p>}
    </>
  );
}

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** C-038 password rules: 8+ characters with letters and numbers (leaked-password protection still applies). */
export const passwordRules = (pw: string) => ({ length: pw.length >= 8, mix: /[A-Za-z]/.test(pw) && /\d/.test(pw) });

/** The live checklist and 4-step meter shown while choosing a password (sign-up and /nueva-contrasena). */
export function PasswordGuide({ c, pw, again }: { c: LoginCopy; pw: string; again?: string }) {
  const r = passwordRules(pw);
  const n = (pw.length >= 8 ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0);
  const colors = ["#F20174", "#F6AC00", "#5B8DEF", "#4FAE4A"];
  const items: [string, boolean][] = [
    [c.rules.length, r.length],
    [c.rules.mix, r.mix],
  ];
  if (again !== undefined) items.push([c.rules.match, !!pw && pw === again]);
  return (
    <>
      <div className="au-strength" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} style={{ background: i < n ? colors[n - 1] : undefined }} />
        ))}
      </div>
      <p className="au-shint">{c.strength[n]}</p>
      <ul className="au-rules" aria-label={c.rules.length}>
        {items.map(([label, on]) => (
          <li key={label} className={on ? "on" : ""}>
            <i>{on && <Check size={10} />}</i>
            {label}
            <span className="sr-only">{on ? " ✓" : ""}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A short burst of confetti in the logo colors from the card (the success screen). */
export function confetti(from: HTMLElement | null) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "au-conf";
  document.body.appendChild(cv);
  const w = (cv.width = innerWidth);
  const h = (cv.height = innerHeight);
  const x = cv.getContext("2d");
  if (!x) return cv.remove();
  const box = from?.getBoundingClientRect();
  const cx = box ? box.left + box.width / 2 : w / 2;
  const cy = box ? box.top + 120 : h / 3;
  const cols = ["#43D6FE", "#5B8DEF", "#B3EC79", "#FFC531", "#F20174"];
  const P = Array.from({ length: 80 }, () => ({
    x: cx + (Math.random() - 0.5) * 60,
    y: cy,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 5,
    a: Math.random() * 6,
    c: cols[Math.floor(Math.random() * 5)],
  }));
  let t = 0;
  const frame = () => {
    x.clearRect(0, 0, w, h);
    for (const p of P) {
      p.vy += 0.2;
      p.x += p.vx;
      p.y += p.vy;
      p.a += 0.1;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.a);
      x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      x.restore();
    }
    if (++t < 170) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

export const GoogleG = () => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Fills "{name}"-style slots. */
export const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
