"use client";

// Entrar / Crear cuenta / Recuperar (C-032 design) with sign-in by email code (C-039) and the shared error map
// (C-038, src/lib/auth-errors.ts). Everything talks to Supabase through the one browser client (C-037), so the
// session cookies it writes are the ones the middleware keeps fresh. Views:
//   login   email first → "Enviarme un código" (or "Prefiero usar mi contraseña" → password + "Entrar")
//   code    6 boxes, paste/autofill fills all six, the 6th digit submits; resend after 60 s
//   signup  name, email, password with the live checklist and a confirm field
//   forgot  email → sent ("Revisa tu correo", resend after 30 s)
//   confirm sign-up needs the email confirmed first
//   ok      orb + confetti, then `next`
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, setRemember } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/actions";
import { AUTH_ERROR_LINK, WHATSAPP_URL, authError, type AuthErrorAction } from "@/lib/auth-errors";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { LoginCopy } from "@/lib/i18n/login-copy";
import { SITE_URL } from "@/lib/site";
import { AuthFrame, Field, GoogleG, MailIcon, PasswordGuide, confetti, fmt, passwordRules, validEmail, type SideKey } from "./AuthFrame";

export type AuthView = "login" | "code" | "signup" | "forgot" | "sent" | "confirm" | "ok";
type Alert = { text: string; action: AuthErrorAction; info?: boolean } | null;

const METHOD_KEY = "celsu-login-method";
// Digits in the email code: Supabase Auth → Email OTP length (6, C-039). Build-time override for a project set otherwise.
const CODE_LEN = Number(process.env.NEXT_PUBLIC_OTP_LENGTH) || 6;
const PATHS: Partial<Record<AuthView, string>> = { login: "/entrar", signup: "/registro", forgot: "/recuperar" };
const SIDE: Record<AuthView, SideKey> = { login: "login", code: "code", signup: "signup", forgot: "forgot", sent: "forgot", confirm: "signup", ok: "ok" };

type Props = {
  c: LoginCopy;
  lang: Lang;
  view: "login" | "signup" | "forgot";
  next: string;
  google: boolean;
  email?: string;
  /** /auth/callback or /auth/confirm sent the student back: the link didn't work. */
  linkFailed?: boolean;
  /** /registro?plan=…: the plan the person is reserving (shown on the card, saved in the sign-up metadata). */
  plan?: { code: string; name: string; label: string } | null;
};

export function AuthScreen({ c, lang, view: initial, next, google, email: initialEmail = "", linkFailed, plan }: Props) {
  const [view, setView] = useState<AuthView>(initial);
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [name, setName] = useState("");
  const [remember, setRememberBox] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string | null>>({});
  const [alert, setAlert] = useState<Alert>(linkFailed ? { text: c.errors.linkFailed, action: null } : null);
  const [hello, setHello] = useState("");
  const card = useRef<HTMLDivElement>(null);

  // The last method this device used (C-039), so password people don't have to tap "Prefiero…" every time.
  useEffect(() => {
    try {
      if (localStorage.getItem(METHOD_KEY) === "password") setUsePassword(true);
    } catch {}
  }, []);
  const rememberMethod = (m: "code" | "password") => {
    try {
      localStorage.setItem(METHOD_KEY, m);
    } catch {}
  };

  const go = useCallback(
    (v: AuthView) => {
      setView(v);
      setErrs({});
      setAlert(null);
      setBusy(false);
      const path = PATHS[v];
      if (path) {
        const q = new URLSearchParams();
        if (next !== "/app") q.set("next", next);
        if (v === "signup" && plan) q.set("plan", plan.code);
        window.history.replaceState(null, "", q.size ? `${path}?${q}` : path);
      }
    },
    [next, plan],
  );

  const shake = () => {
    const el = card.current;
    if (!el) return;
    el.classList.remove("au-shake");
    void el.offsetWidth;
    el.classList.add("au-shake");
  };
  const fail = (e: Record<string, string | null>) => {
    setErrs(e);
    shake();
    return true;
  };
  const showError = (error: Parameters<typeof authError>[0], context?: Parameters<typeof authError>[2]) => {
    const r = authError(error, lang, context);
    setAlert({ text: r.text, action: r.action });
    setBusy(false);
    shake();
    return r;
  };
  const checkEmail = () => (!email.trim() ? c.errors.emailEmpty : validEmail(email) ? null : c.errors.emailBad);

  /** Signed in: language back from the profile, then the success screen and `next`. */
  const signedIn = async (user: { user_metadata?: Record<string, unknown> } | null, fresh = false) => {
    await fetch("/auth/after", { method: "POST" }).catch(() => undefined);
    const meta = user?.user_metadata ?? {};
    const full = String(meta.display_name ?? meta.full_name ?? meta.name ?? "").trim();
    const first = full.split(/\s+/)[0] ?? "";
    setHello(first ? fmt(fresh ? c.welcomeNew : c.welcomeBack, { name: first }) : c.welcomeAnon);
    setView("ok");
    setBusy(false);
    setTimeout(() => confetti(card.current), 120);
    setTimeout(() => window.location.assign(next), 2000);
  };

  // ---- login: code or password ----
  const sendCode = async (resend = false) => {
    const e = checkEmail();
    if (e) return fail({ email: e });
    setBusy(true);
    setAlert(null);
    setRemember(remember);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    if (error) return showError(error, "code");
    rememberMethod("code");
    setBusy(false);
    if (resend) setAlert({ text: c.codeResent, action: null, info: true });
    else go("code");
  };

  const passwordLogin = async () => {
    const e = { email: checkEmail(), password: password ? null : c.errors.passwordEmpty };
    if (e.email || e.password) return fail(e);
    setBusy(true);
    setAlert(null);
    setRemember(remember);
    const { data, error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return showError(error, "password");
    rememberMethod("password");
    await signedIn(data.user);
  };

  // ---- sign-up ----
  const signUp = async () => {
    const r = passwordRules(password);
    const e = {
      name: name.trim() ? null : c.errors.name,
      email: checkEmail(),
      password: !password ? c.errors.passwordEmpty : r.length && r.mix ? null : c.errors.passwordRules,
      again: password && again !== password ? c.errors.mismatch : null,
    };
    if (Object.values(e).some(Boolean)) return fail(e);
    setBusy(true);
    setAlert(null);
    setRemember(true);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim(), requested_plan: plan?.code || undefined },
        emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(plan ? `/registro?reservado=1&plan=${plan.code}` : next)}`,
      },
    });
    if (error) return showError(error);
    rememberMethod("password");
    // With email confirmation on there is no session yet.
    if (!data.session) return go("confirm");
    if (plan) return window.location.assign(`/registro?reservado=1&plan=${plan.code}`);
    await signedIn(data.user, true);
  };

  // ---- forgot ----
  const sendReset = async () => {
    const e = checkEmail();
    if (e) return fail({ email: e });
    setBusy(true);
    setAlert(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${SITE_URL}/nueva-contrasena` });
    // Never says whether the email has an account: only rate limits and network errors show.
    if (error && error.status !== 400 && error.status !== 404) return showError(error);
    setBusy(false);
    go("sent");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (view === "login") void (usePassword ? passwordLogin() : sendCode());
    else if (view === "signup") void signUp();
    else if (view === "forgot") void sendReset();
  };

  const alertBox = alert && (
    <div className={`au-alert${alert.info ? " info" : ""}`} role={alert.info ? "status" : "alert"}>
      {alert.text}{" "}
      {alert.action === "reset" && (
        <button type="button" className="au-link" onClick={() => go("forgot")}>
          {AUTH_ERROR_LINK[lang].reset}
        </button>
      )}
      {alert.action === "signup" && (
        <button type="button" className="au-link" onClick={() => go("signup")}>
          {AUTH_ERROR_LINK[lang].signup}
        </button>
      )}
      {alert.action === "resend" && (
        <button type="button" className="au-link" onClick={() => void sendCode(true)}>
          {AUTH_ERROR_LINK[lang].resend}
        </button>
      )}
      {alert.action === "help" && (
        <a className="au-link" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          {AUTH_ERROR_LINK[lang].help}
        </a>
      )}
    </div>
  );

  const button = (label: string) => (
    <button type="submit" className="ev-btn" disabled={busy} aria-busy={busy} data-testid="auth-submit">
      {busy ? <span className="au-sp" aria-label="…" /> : label}
    </button>
  );

  const googleButton = (label: string) =>
    google && (
      <>
        <div className="au-or">{c.or}</div>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="au-gbtn">
            <GoogleG />
            {label}
          </button>
        </form>
      </>
    );

  const tabs = view === "login" || view === "signup";

  return (
    <AuthFrame c={c} lang={lang} side={SIDE[view]}>
      <div className="au-card ev-pg" ref={card}>
        {tabs && (
          <div className={`au-tabs${view === "signup" ? " r" : ""}`} role="tablist">
            <span className="au-pill" aria-hidden />
            <button type="button" role="tab" aria-selected={view === "login"} onClick={() => go("login")}>
              {c.tabLogin}
            </button>
            <button type="button" role="tab" aria-selected={view === "signup"} onClick={() => go("signup")}>
              {c.tabSignup}
            </button>
          </div>
        )}

        <div className="au-pane" key={view === "login" ? `login-${usePassword}` : view}>
          {view === "login" && (
            <form onSubmit={submit} noValidate>
              <h2>{c.loginTitle}</h2>
              <p className="au-lede">{usePassword ? c.loginLede : c.loginLedeCode}</p>
              {alertBox}
              <Field
                id="email"
                label={c.email}
                icon="mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(v) => (setEmail(v), setErrs({}))}
                error={errs.email}
                valid={validEmail(email)}
                c={c}
              />
              {usePassword && (
                <Field
                  id="password"
                  label={c.password}
                  icon="lock"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(v) => (setPassword(v), setErrs({}))}
                  error={errs.password}
                  c={c}
                />
              )}
              <div className="au-row">
                <label className="au-chk">
                  <input type="checkbox" checked={remember} onChange={(e) => setRememberBox(e.target.checked)} />
                  <span />
                  {c.remember}
                </label>
                {usePassword && (
                  <button type="button" className="au-link" onClick={() => go("forgot")}>
                    {c.forgot}
                  </button>
                )}
              </div>
              {button(usePassword ? c.signIn : c.sendCode)}
              <button
                type="button"
                className="au-link au-alt"
                onClick={() => {
                  setUsePassword((p) => !p);
                  setErrs({});
                  setAlert(null);
                }}
              >
                {usePassword ? c.useCode : c.usePassword}
              </button>
              {googleButton(c.google)}
              <p className="au-foot">
                {c.noAccount}{" "}
                <button type="button" className="au-link" onClick={() => go("signup")}>
                  {c.createFree}
                </button>
              </p>
            </form>
          )}

          {view === "signup" && (
            <form onSubmit={submit} noValidate>
              <h2>{c.signupTitle}</h2>
              <p className="au-lede">{c.signupLede}</p>
              {plan && (
                <div className="au-plan" data-testid="plan-chosen">
                  {plan.label}
                  <b>{plan.name}</b>
                </div>
              )}
              {alertBox}
              <Field
                id="name"
                label={c.name}
                icon="user"
                autoComplete="name"
                value={name}
                onChange={(v) => (setName(v), setErrs({}))}
                error={errs.name}
                c={c}
              />
              <Field
                id="email"
                label={c.email}
                icon="mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(v) => (setEmail(v), setErrs({}))}
                error={errs.email}
                valid={validEmail(email)}
                c={c}
              />
              <Field
                id="password"
                label={c.newPassword}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(v) => (setPassword(v), setErrs({}))}
                error={errs.password}
                c={c}
              />
              <Field
                id="again"
                label={c.confirm}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={again}
                onChange={(v) => (setAgain(v), setErrs({}))}
                error={errs.again}
                c={c}
              />
              <PasswordGuide c={c} pw={password} again={again} />
              {button(c.createAccount)}
              {googleButton(c.googleSignup)}
              <p className="au-foot">
                <small>
                  {c.legal[0]}
                  <a className="au-link" href="/terminos">
                    {c.legal[1]}
                  </a>
                  {c.legal[2]}
                  <a className="au-link" href="/privacidad">
                    {c.legal[3]}
                  </a>
                  {c.legal[4]}
                </small>
              </p>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={submit} noValidate>
              <button type="button" className="au-link au-back" onClick={() => go("login")}>
                {c.back}
              </button>
              <h2>{c.forgotTitle}</h2>
              <p className="au-lede">{c.forgotLede}</p>
              {alertBox}
              <Field
                id="email"
                label={c.email}
                icon="mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(v) => (setEmail(v), setErrs({}))}
                error={errs.email}
                valid={validEmail(email)}
                c={c}
              />
              {button(c.sendLink)}
              <button
                type="button"
                className="au-link au-alt"
                onClick={() => {
                  setUsePassword(false);
                  go("login");
                }}
              >
                {c.tryCode}
              </button>
            </form>
          )}

          {view === "sent" && (
            <div className="au-done" role="status">
              <div className="au-mail">
                <MailIcon />
              </div>
              <h2>{c.sentTitle}</h2>
              <p className="au-lede">
                {fmt(c.sentLede, { email: "\u0000" })
                  .split("\u0000")
                  .flatMap((part, i) => (i ? [<b key={i}>{email.trim()}</b>, part] : [part]))}
              </p>
              <button type="button" className="ev-btn" onClick={() => go("login")}>
                {c.backToLogin}
              </button>
              <p className="au-foot">
                {c.notArrived}{" "}
                <Countdown
                  seconds={30}
                  idle={c.resend}
                  running={c.resendIn}
                  onClick={() => void createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${SITE_URL}/nueva-contrasena` })}
                />
                <br />
                <small>{c.spamTip}</small>
              </p>
            </div>
          )}

          {view === "code" && (
            <CodeStep
              c={c}
              lang={lang}
              email={email.trim()}
              alert={alertBox}
              onBack={() => go("login")}
              onResend={() => sendCode(true)}
              onDone={(user) => void signedIn(user)}
              onError={() => {
                setAlert(null);
                shake();
              }}
            />
          )}

          {view === "confirm" && (
            <div className="au-done" role="status">
              <div className="au-mail">
                <MailIcon />
              </div>
              <h2>{c.confirmTitle}</h2>
              <p className="au-lede">
                {fmt(c.confirmLede, { email: "\u0000" })
                  .split("\u0000")
                  .flatMap((part, i) => (i ? [<b key={i}>{email.trim()}</b>, part] : [part]))}
              </p>
              <p className="au-foot">
                <small>{c.spamTip}</small>
              </p>
            </div>
          )}

          {view === "ok" && (
            <div className="au-done" role="status" data-testid="auth-ok">
              <div className="au-orb">
                <span>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </div>
              <h2>{hello}</h2>
              <p className="au-lede">{c.taking}</p>
              <div className="au-bar">
                <i />
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthFrame>
  );
}

/** A text button that waits `seconds` before it can be pressed again ("Reenviar en 23 s"). */
function Countdown({
  seconds,
  idle,
  running,
  onClick,
  startRunning = false,
}: {
  seconds: number;
  idle: string;
  running: string;
  onClick: () => void;
  startRunning?: boolean;
}) {
  const [left, setLeft] = useState(startRunning ? seconds : 0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return (
    <button
      type="button"
      className="au-link"
      disabled={left > 0}
      onClick={() => {
        onClick();
        setLeft(seconds);
      }}
    >
      {left > 0 ? fmt(running, { n: left }) : idle}
    </button>
  );
}

/**
 * The 6 code boxes (C-039). Typing moves to the next box, Backspace to the previous; a paste or iOS/Android
 * one-time-code autofill (all six digits into one box) fills them all; the 6th digit submits. A wrong or expired
 * code clears the boxes and shakes them.
 */
function CodeStep({
  c,
  lang,
  email,
  alert,
  onBack,
  onResend,
  onDone,
  onError,
}: {
  c: LoginCopy;
  lang: Lang;
  email: string;
  alert: React.ReactNode;
  onBack: () => void;
  onResend: () => Promise<unknown>;
  onDone: (user: { user_metadata?: Record<string, unknown> } | null) => void;
  onError: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const tried = useRef("");

  useEffect(() => boxes.current[0]?.focus(), []);

  const verify = useCallback(
    async (token: string) => {
      if (busy || tried.current === token) return;
      tried.current = token;
      setBusy(true);
      setError(null);
      const { data, error: e } = await createClient().auth.verifyOtp({ email, token, type: "email" });
      setBusy(false);
      if (e) {
        setError(authError(e, lang, "verify").text);
        setDigits(Array(CODE_LEN).fill(""));
        tried.current = "";
        onError();
        boxes.current[0]?.focus();
        return;
      }
      setOk(true);
      onDone(data.user);
    },
    [busy, email, lang, onDone, onError],
  );

  useEffect(() => {
    const token = digits.join("");
    if (token.length === CODE_LEN && /^\d+$/.test(token)) void verify(token);
  }, [digits, verify]);

  const fill = (from: number, text: string) => {
    const only = text.replace(/\D/g, "").slice(0, CODE_LEN);
    if (!only) return;
    // A whole code (paste or autofill) always starts at the first box.
    const start = only.length === CODE_LEN ? 0 : from;
    setDigits((d) => {
      const n = [...d];
      for (let k = 0; k < only.length && start + k < CODE_LEN; k++) n[start + k] = only[k];
      return n;
    });
    setError(null);
    boxes.current[Math.min(start + only.length, CODE_LEN - 1)]?.focus();
  };

  return (
    <div className="au-done">
      <button type="button" className="au-link au-back" onClick={onBack} style={{ display: "block", textAlign: "left" }}>
        {c.changeEmail}
      </button>
      <div className="au-mail">
        <MailIcon />
      </div>
      <h2>{c.codeTitle}</h2>
      <p className="au-lede">
        {fmt(c.codeLede, { email: "\u0000", n: CODE_LEN })
          .split("\u0000")
          .flatMap((part, i) => (i ? [<b key={i}>{email}</b>, part] : [part]))}{" "}
        {c.codeExpires}
      </p>
      {alert}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const token = digits.join("");
          if (token.length === CODE_LEN) {
            tried.current = "";
            void verify(token);
          }
        }}
      >
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} aria-describedby="code-msg">
          <legend className="sr-only">{fmt(c.codeLabel, { n: CODE_LEN })}</legend>
          <div
            className={`au-code${error ? " err" : ""}${ok ? " ok" : ""}`}
            data-testid="code-boxes"
            style={{ gridTemplateColumns: `repeat(${CODE_LEN}, minmax(0, 1fr))` }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                className={d ? "has" : ""}
                value={d}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={CODE_LEN}
                aria-label={fmt(c.codeDigit, { i: i + 1, n: CODE_LEN })}
                disabled={busy || ok}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length > 1) return fill(i, v);
                  if (v && !/\d/.test(v)) return;
                  setDigits((p) => p.map((x, k) => (k === i ? v : x)));
                  setError(null);
                  if (v && i < CODE_LEN - 1) boxes.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) {
                    boxes.current[i - 1]?.focus();
                    setDigits((p) => p.map((x, k) => (k === i - 1 ? "" : x)));
                    e.preventDefault();
                  } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
                  else if (e.key === "ArrowRight" && i < CODE_LEN - 1) boxes.current[i + 1]?.focus();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  fill(i, e.clipboardData.getData("text"));
                }}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
        </fieldset>
        <p className="au-msg" id="code-msg" role="alert">
          {error ?? ""}
        </p>
        <button type="submit" className="ev-btn" disabled={busy || ok || digits.join("").length < CODE_LEN} data-testid="auth-submit">
          {busy || ok ? <span className="au-sp" aria-label="…" /> : c.verify}
        </button>
      </form>
      <p className="au-foot">
        {c.notArrived} <Countdown seconds={60} startRunning idle={c.resendCode} running={c.resendCodeIn} onClick={() => void onResend()} />
        <br />
        <small>{c.spamTip}</small>
      </p>
    </div>
  );
}
