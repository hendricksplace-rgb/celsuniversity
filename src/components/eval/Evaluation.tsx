"use client";

// C-031: the free English evaluation in the CelsU look (celsu-evaluacion-mockup_1.html): its own light canvas with
// the logo's ribbons, the real U, prism glass and the depth button. The bank, the adaptive engine, the AI grading
// and the recommendation are unchanged.
import "./eval.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  SECTIONS,
  answer as engineAnswer,
  enterSection,
  frLevelFor,
  initialEngine,
  isCorrect,
  pickSpeakingPrompt,
  type Answer,
  type AnswerLog,
  type EngineState,
  type Goal,
  type Item,
} from "@/lib/eval-engine";
import { callEvaluation } from "./api";
import type { Clips } from "./audio";
import { FreeResponse, QuestionView, SEC_HEX, SEC_ICON, Speaking, fill, type EvT, type EvalT, type SpeakingResult, type WritingResult } from "./Questions";
import { Locked, Results, confetti, type FinalResult, type LockedInfo, type OfferProducts } from "./Results";
import type { ProgramKey } from "@/lib/purchase-programs";
import type { EnrollT } from "@/lib/i18n/enroll-copy";
import { evalHref } from "@/lib/enroll";
import { setLanguage } from "@/lib/actions";

type Screen =
  | "welcome"
  | "goal"
  | "sectionIntro"
  | "question"
  | "freeResponse"
  | "speaking"
  | "sectionComplete"
  | "emailGate"
  | "results"
  | "locked"
  | "rateLimited";

const GOALS = [
  {
    k: "work",
    c: "#5B8DEF",
    ic: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="3" />
        <path d="M9 7V5h6v2" />
      </>
    ),
  },
  { k: "travel", c: "#1FA9D6", ic: <path d="M3 13l18-8-5 16-4-6z" /> },
  {
    k: "school",
    c: "#4FAE4A",
    ic: (
      <>
        <path d="M3 9l9-5 9 5-9 5z" />
        <path d="M7 11v5c3 2 7 2 10 0v-5" />
      </>
    ),
  },
  {
    k: "daily",
    c: "#E0A100",
    ic: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </>
    ),
  },
] as const;

/** Minutes per section, for the section list (about 30 s per question). */
const minutes = (n: number) => Math.max(2, Math.round(n * 0.5));

/**
 * The public English assessment, ported from Base44 (same items, adaptive engine and rules).
 * programa (from /inscribirme): the result offers that program's recommended plan; null = as before.
 * plan (an active product code the person clicked, &plan=): shown as "Elegiste" next to the recommendation.
 * clips: the recorded audio (eval_v2) with signed URLs; rate: USD→MXN for the price reference.
 */
export function Evaluation({
  t: et,
  ev: t,
  lang,
  clips,
  rate,
  programa = null,
  plan = null,
  products,
  enrollT,
}: {
  t: EvalT;
  ev: EvT;
  lang: "es" | "en";
  clips: Clips;
  rate: number | null;
  programa?: ProgramKey | null;
  plan?: string | null;
  products: OfferProducts;
  enrollT: EnrollT;
}) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [name, setName] = useState("");
  const [goalKey, setGoalKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState(false);
  const [eng, setEng] = useState<EngineState>(initialEngine);
  const [item, setItem] = useState<Item | null>(null);
  const [log, setLog] = useState<AnswerLog>([]);
  const [frDone, setFrDone] = useState(false);
  const [spDone, setSpDone] = useState(false);
  const [writing, setWriting] = useState<{ r: WritingResult | null; text: string }>({ r: null, text: "" });
  const [spoken, setSpoken] = useState<SpeakingResult | null>(null);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [locked, setLocked] = useState<LockedInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goal: Goal = goalKey === "work" ? "work" : "general";

  const afterSection = (secIdx: number, fr = frDone, sp = spDone): Screen =>
    secIdx === 3 && !fr ? "freeResponse" : secIdx === 1 && !sp ? "speaking" : "sectionComplete";
  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0 });
  };

  const start = async (n: string) => {
    setBusy(true);
    setError("");
    const res = await callEvaluation<{ token?: string; student?: boolean; rate_limited?: boolean; locked?: LockedInfo }>({ action: "start" }).catch(() => null);
    setBusy(false);
    setName(n);
    if (res?.data.rate_limited) return go("rateLimited");
    if (res?.data.locked) {
      setLocked(res.data.locked);
      return go("locked");
    }
    if (!res?.ok || !res.data.token) return setError(et.errGeneric);
    setToken(res.data.token);
    setStudent(!!res.data.student);
    go("goal");
  };

  const enter = () => {
    const r = enterSection(eng);
    setEng(r.state);
    setItem(r.item);
    go("question");
  };

  const onAnswer = (a: Answer) => {
    if (!item) return;
    const correct = isCorrect(item, a);
    const r = engineAnswer(eng, item, correct);
    setLog((l) => [...l, { id: item.id, answer: a }]);
    setEng(r.state);
    setItem(r.next);
    if (!r.next) go(afterSection(r.state.secIdx));
    else window.scrollTo({ top: 0 });
    setToast(et.cheers[Math.floor(Math.random() * et.cheers.length)]);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1100);
  };

  const finish = async (email?: string) => {
    setBusy(true);
    setError("");
    const res = await callEvaluation<{ result?: FinalResult; locked?: LockedInfo; error?: string }>({
      action: "finish",
      token,
      name,
      goal,
      email,
      answers: log,
    }).catch(() => null);
    setBusy(false);
    if (res?.data.locked) {
      setLocked({ ...res.data.locked, lead: !student });
      return go("locked");
    }
    if (!res?.ok || !res.data.result) {
      const e = res?.data.error;
      return setError(e === "email" ? et.errEmail : e === "disposable" ? et.errDisposable : et.errGeneric);
    }
    setResult({ ...res.data.result, speaking: spoken });
    go("results");
  };

  const sec = SECTIONS[eng.secIdx];
  // The speaking part comes after Escucha, in Hablar's own color; the header counts it within section 2.
  const key = screen === "speaking" ? "P" : sec.key;
  const color = SEC_HEX[key];
  const inTest = screen === "question" || screen === "freeResponse" || screen === "speaking";
  const qn = sec.count + (sec.key === "W" || sec.key === "L" ? 1 : 0);
  const qi = screen === "question" ? eng.asked + 1 : qn;

  return (
    <div className="ev" style={{ ["--c" as string]: inTest || screen === "sectionComplete" ? color : "#5B8DEF" }}>
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
        {screen === "welcome" && (
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={lang === "es" ? "en" : "es"} />
            <button type="submit" className="ev-lang ev-pg" aria-label={t.switchLangLabel}>
              {t.switchLang}
            </button>
          </form>
        )}
      </header>

      <main className="ev-screen" key={screen === "question" ? `q-${item?.id}` : screen}>
        {inTest && (
          <>
            <div className="ev-qh">
              <span className="ev-kick">
                <i />
                {fill(t.sectionHead, { n: eng.secIdx + 1, name: t.secNames[key].toUpperCase() })}
              </span>
              <span>
                {qi}/{qn}
              </span>
            </div>
            <div className="ev-track" role="progressbar" aria-label={t.secNames[key]} aria-valuenow={eng.secIdx + 1} aria-valuemin={1} aria-valuemax={5}>
              {SECTIONS.map((s, i) => (
                <span
                  key={s.key}
                  className={i < eng.secIdx ? "done" : i === eng.secIdx ? "now" : ""}
                  style={{ ["--sc" as string]: SEC_HEX[s.key], ["--p" as string]: `${(Math.min(qi, qn) / qn) * 100}%` }}
                >
                  <i />
                </span>
              ))}
            </div>
          </>
        )}

        {screen === "welcome" && <Welcome t={t} et={et} programa={programa} plan={plan} busy={busy} error={error} onStart={(n) => void start(n)} />}

        {screen === "goal" && (
          <div>
            <span className="ev-kick">
              <i />
              {t.kickBefore}
            </span>
            <h1 className="ev-h">{fill(t.goalTitle, { name })}</h1>
            <p className="ev-lead">{t.goalSub}</p>
            <div className="ev-goals" role="radiogroup" aria-label={t.goalTitle}>
              {GOALS.map((g, i) => (
                <button
                  key={g.k}
                  type="button"
                  role="radio"
                  aria-checked={goalKey === g.k}
                  className={`ev-goal ${goalKey === g.k ? "sel" : ""}`}
                  style={{ ["--sc" as string]: g.c, ["--d" as string]: `${0.2 + i * 0.08}s` }}
                  onClick={() => setGoalKey(g.k)}
                  data-testid="ev-goal"
                >
                  <span className="gi">
                    <svg viewBox="0 0 24 24" aria-hidden>
                      {g.ic}
                    </svg>
                  </span>
                  <b>{t.goals[g.k][0]}</b>
                  <small>{t.goals[g.k][1]}</small>
                </button>
              ))}
            </div>
            <button type="button" className="ev-btn" disabled={!goalKey} onClick={() => go("sectionIntro")} data-testid="ev-continue">
              {t.continue} →
            </button>
          </div>
        )}

        {screen === "sectionIntro" && (
          <div style={{ ["--c" as string]: SEC_HEX[sec.key] }}>
            <span className="ev-kick">
              <i />
              {fill(t.sectionKick, { n: eng.secIdx + 1 })}
            </span>
            <h1 className="ev-h">{t.secNames[sec.key]}</h1>
            <p className="ev-lead">{t.secIntro[sec.key]}</p>
            <div className="ev-steps">
              {SECTIONS.map((s, i) => {
                const n = s.count + (s.key === "W" || s.key === "L" ? 1 : 0);
                const st = i < eng.secIdx ? "done" : i === eng.secIdx ? "now" : "";
                return (
                  <div key={s.key} className={`ev-st ${st}`} style={{ ["--sc" as string]: SEC_HEX[s.key], ["--d" as string]: `${0.15 + i * 0.08}s` }}>
                    <span className="ic">
                      <svg viewBox="0 0 24 24" aria-hidden>
                        {SEC_ICON[s.key]}
                      </svg>
                    </span>
                    <div>
                      <b>{t.secNames[s.key]}</b>
                      <small>{fill(t.secMeta, { n, m: minutes(n) })}</small>
                    </div>
                    {st && <span className="tag">{st === "done" ? t.secReady : t.secNow}</span>}
                  </div>
                );
              })}
            </div>
            <button type="button" className="ev-btn" onClick={enter} autoFocus data-testid="ev-start-section">
              {t.startSection} →
            </button>
          </div>
        )}

        {screen === "question" && item && <QuestionView key={item.id} item={item} sec={sec.key} t={t} clips={clips} onAnswer={onAnswer} />}

        {screen === "freeResponse" && (
          <FreeResponse
            level={frLevelFor(eng.lvl)}
            token={token}
            t={t}
            et={et}
            onDone={(r, text) => {
              setWriting({ r, text });
              setFrDone(true);
              go(afterSection(eng.secIdx, true, spDone));
            }}
          />
        )}

        {screen === "speaking" && (
          <Speaking
            prompt={pickSpeakingPrompt(eng.lvl)}
            token={token}
            t={t}
            clips={clips}
            onDone={(r) => {
              setSpoken(r);
              setSpDone(true);
              go(afterSection(eng.secIdx, frDone, true));
            }}
          />
        )}

        {screen === "sectionComplete" && (
          <div style={{ textAlign: "center", paddingTop: 24 }}>
            <div className="ev-orb mini">
              <div className="in" style={{ ["--sc" as string]: color }}>
                <svg
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {SEC_ICON[sec.key]}
                </svg>
              </div>
            </div>
            <h1 className="ev-h">{fill(t.doneSec, { name: t.secNames[sec.key] })}</h1>
            <p className="ev-lead">{t.doneSecSub}</p>
            <button
              type="button"
              className="ev-btn"
              autoFocus
              data-testid="ev-continue"
              onClick={() => {
                if (eng.secIdx >= SECTIONS.length - 1) return go("emailGate");
                setEng({ ...eng, secIdx: eng.secIdx + 1 });
                go("sectionIntro");
              }}
            >
              {t.continue} →
            </button>
          </div>
        )}

        {screen === "emailGate" && <EmailGate t={t} et={et} name={name} student={student} busy={busy} error={error} onSubmit={(e) => void finish(e)} />}

        {screen === "results" && result && (
          <Results
            t={t}
            et={et}
            name={name}
            goal={goal}
            result={result}
            writingText={writing.text}
            student={student}
            programa={programa}
            plan={plan}
            products={products}
            rate={rate}
            enrollT={enrollT}
          />
        )}

        {screen === "locked" && locked && (
          <Locked t={t} et={et} info={locked} programa={programa} plan={plan} products={products} rate={rate} enrollT={enrollT} />
        )}

        {screen === "rateLimited" && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div className="ev-orb mini">
              <div className="in">⏳</div>
            </div>
            <h1 className="ev-h">{et.rateTitle}</h1>
            <p className="ev-lead">{et.rateSub}</p>
          </div>
        )}

        {(screen === "question" || screen === "goal") && <p className="ev-keys">{t.keys}</p>}
      </main>

      <div aria-live="polite" className={`ev-toast ${toast ? "on" : ""}`}>
        {toast}
      </div>
    </div>
  );
}

function Welcome({
  t,
  et,
  programa,
  plan,
  busy,
  error,
  onStart,
}: {
  t: EvT;
  et: EvalT;
  programa: ProgramKey | null;
  plan: string | null;
  busy: boolean;
  error: string;
  onStart: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const ok = name.trim().length > 0;
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <div className="ev-hero-u">
          {/* eslint-disable-next-line @next/next/no-img-element -- the real U, a small local PNG */}
          <img src="/brand/celsu-u.png" alt="" width={150} height={106} />
        </div>
        <span className="ev-kick" style={{ justifyContent: "center" }}>
          <i />
          {t.kickFree}
        </span>
        <h1 className="ev-h">{t.title}</h1>
        <p className="ev-lead">{t.sub}</p>
        <div className="ev-skills">
          {Object.keys(SEC_HEX).map((k) => (
            <span key={k}>
              <i style={{ background: SEC_HEX[k] }} />
              {t.secNames[k]}
            </span>
          ))}
        </div>
      </div>
      <form
        className="ev-pg"
        style={{ padding: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onStart(name.trim());
        }}
      >
        <label className="ev-lab" htmlFor="eval-name">
          {t.nameLab}
        </label>
        <input
          id="eval-name"
          className="ev-inp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="given-name"
          placeholder={et.namePlaceholder}
        />
        <button type="submit" className="ev-btn" disabled={busy || !ok}>
          {busy ? et.starting : et.start}
        </button>
        {error && (
          <p className="ev-err" role="alert">
            {error}
          </p>
        )}
        <p className="ev-note">{t.note}</p>
      </form>
      <Link href={`/entrar?next=${encodeURIComponent(programa ? evalHref(programa, plan) : "/evaluacion")}`} className="ev-link">
        {et.haveAccount}
      </Link>
    </div>
  );
}

function EmailGate({
  t,
  et,
  name,
  student,
  busy,
  error,
  onSubmit,
}: {
  t: EvT;
  et: EvalT;
  name: string;
  student: boolean;
  busy: boolean;
  error: string;
  onSubmit: (email?: string) => void;
}) {
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  useEffect(() => confetti(), []);
  return (
    <div style={{ ["--c" as string]: "#F6AC00" }}>
      <div style={{ textAlign: "center", paddingTop: 12 }}>
        <div className="ev-orb mini">
          <div className="in">🎉</div>
        </div>
        <h1 className="ev-h">{fill(et.ready, { name })}</h1>
        <p className="ev-lead">{student ? et.studentWhy : et.emailWhy}</p>
      </div>
      <form
        className="ev-pg"
        style={{ padding: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (student) onSubmit();
          else if (valid) onSubmit(email.trim().toLowerCase());
        }}
      >
        {!student && (
          <>
            <label className="ev-lab" htmlFor="eval-email">
              {t.emailLab}
            </label>
            <input
              id="eval-email"
              type="email"
              className="ev-inp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={et.emailPlaceholder}
              autoComplete="email"
            />
          </>
        )}
        <button type="submit" className="ev-btn" disabled={busy || (!student && !valid)}>
          {busy ? et.saving : et.seeResults}
        </button>
        {error && (
          <p className="ev-err" role="alert">
            {error}
          </p>
        )}
        {!student && (
          <>
            <p className="ev-note">{et.noSpam}</p>
            <p className="ev-note" style={{ fontSize: 11.5, marginTop: 4 }}>
              {et.privacy}
            </p>
          </>
        )}
      </form>
    </div>
  );
}
