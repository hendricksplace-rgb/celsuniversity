"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
import { BigButton, C, FreeResponse, StickyBar, Pill, QuestionView, Speaking, fill, type EvalT, type SpeakingResult, type WritingResult } from "./Questions";
import { Locked, Results, type FinalResult, type LockedInfo } from "./Results";

const TOTAL = SECTIONS.reduce((a, s) => a + s.count, 0) + 2; // + writing + speaking

type Screen = "welcome" | "goal" | "sectionIntro" | "question" | "freeResponse" | "speaking" | "sectionComplete" | "emailGate" | "results" | "locked" | "rateLimited";

/** The public English assessment, ported from Base44 (same items, adaptive engine and rules). */
export function Evaluation({ t }: { t: EvalT }) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("general");
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState(false);
  const [eng, setEng] = useState<EngineState>(initialEngine);
  const [item, setItem] = useState<Item | null>(null);
  const [log, setLog] = useState<AnswerLog>([]);
  const [answered, setAnswered] = useState(0);
  const [frDone, setFrDone] = useState(false);
  const [spDone, setSpDone] = useState(false);
  const [writing, setWriting] = useState<{
    r: WritingResult | null;
    text: string;
  }>({ r: null, text: "" });
  const [spoken, setSpoken] = useState<SpeakingResult | null>(null);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [locked, setLocked] = useState<LockedInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const afterSection = (secIdx: number, fr = frDone, sp = spDone): Screen => (secIdx === 3 && !fr ? "freeResponse" : secIdx === 1 && !sp ? "speaking" : "sectionComplete");

  const start = async (n: string) => {
    setBusy(true);
    setError("");
    const res = await callEvaluation<{
      token?: string;
      student?: boolean;
      rate_limited?: boolean;
      locked?: LockedInfo;
    }>({ action: "start" }).catch(() => null);
    setBusy(false);
    setName(n);
    if (res?.data.rate_limited) return setScreen("rateLimited");
    if (res?.data.locked) {
      setLocked(res.data.locked);
      return setScreen("locked");
    }
    if (!res?.ok || !res.data.token) return setError(t.errGeneric);
    setToken(res.data.token);
    setStudent(!!res.data.student);
    setScreen("goal");
  };

  const enter = () => {
    const r = enterSection(eng);
    setEng(r.state);
    setItem(r.item);
    setScreen("question");
  };

  const onAnswer = (a: Answer) => {
    if (!item) return;
    const correct = isCorrect(item, a);
    const r = engineAnswer(eng, item, correct);
    setLog((l) => [...l, { id: item.id, answer: a }]);
    setAnswered((n) => n + 1);
    setEng(r.state);
    setItem(r.next);
    if (!r.next) setScreen(afterSection(r.state.secIdx));
    const msg = t.cheers[Math.floor(Math.random() * t.cheers.length)];
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1100);
  };

  const finish = async (email?: string) => {
    setBusy(true);
    setError("");
    const res = await callEvaluation<{
      result?: FinalResult;
      locked?: LockedInfo;
      error?: string;
    }>({
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
      return setScreen("locked");
    }
    if (!res?.ok || !res.data.result) {
      const e = res?.data.error;
      return setError(e === "email" ? t.errEmail : e === "disposable" ? t.errDisposable : t.errGeneric);
    }
    setResult({ ...res.data.result, speaking: spoken });
    setScreen("results");
    window.scrollTo({ top: 0 });
  };

  const sec = SECTIONS[eng.secIdx];
  const secName = t.sections[sec.key];
  const inTest = ["question", "freeResponse", "speaking", "sectionComplete", "emailGate"].includes(screen);
  const pct = Math.min(100, Math.round((answered / TOTAL) * 100));

  return (
    <div className="mx-auto w-full max-w-md">
      {inTest && (
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-lg">
            {SECTIONS.map((s, i) => (
              <span key={s.key} title={t.sections[s.key]} className={`transition ${i <= eng.secIdx ? "scale-110 opacity-100" : "opacity-30"}`}>
                {s.icon}
              </span>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${C.pink}, ${C.cyan})`,
              }}
            />
          </div>
          <p className="mt-1 text-right text-xs font-extrabold text-[#A9A4C0]">{pct}%</p>
        </div>
      )}

      {screen === "welcome" && <Welcome t={t} busy={busy} error={error} onStart={(n) => void start(n)} />}

      {screen === "goal" && (
        <div>
          <h2 className="text-2xl font-extrabold text-white">{fill(t.hello, { name })}</h2>
          <p className="mt-1 text-sm text-[#A9A4C0]">{t.goalQ}</p>
          <div className="mt-4">
            {(
              [
                ["work", "💼"],
                ["conv", "🗣️"],
                ["zero", "🌱"],
                ["usa", "🇺🇸"],
              ] as const
            ).map(([k, em]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setGoal(k === "work" ? "work" : "general");
                  setScreen("sectionIntro");
                }}
                className="mt-2.5 flex w-full items-center gap-3 rounded-2xl border-2 border-transparent bg-white/5 px-4 py-3.5 text-left text-base font-bold text-white transition hover:border-[#F5178C]/60 hover:bg-white/10"
              >
                <span className="text-xl">{em}</span> {t.goals[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "sectionIntro" && (
        <div className="pt-6 text-center">
          <div className="text-6xl">{sec.icon}</div>
          <div className="mt-3">
            <Pill>{fill(t.sectionOf, { n: eng.secIdx + 1 })}</Pill>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold" style={{ color: sec.hex }}>
            {secName}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#A9A4C0]">{sec.key === "L" ? t.introListening : sec.key === "W" ? t.introWriting : t.introDefault}</p>
          <StickyBar>
            <BigButton color={sec.hex} onClick={enter}>
              {t.startSection}
            </BigButton>
          </StickyBar>
        </div>
      )}

      {screen === "question" && item && <QuestionView key={item.id} item={item} t={t} onAnswer={onAnswer} />}

      {screen === "freeResponse" && (
        <FreeResponse
          level={frLevelFor(eng.lvl)}
          token={token}
          t={t}
          onDone={(r, text) => {
            setWriting({ r, text });
            setFrDone(true);
            setAnswered((n) => n + 1);
            setScreen(afterSection(eng.secIdx, true, spDone));
          }}
        />
      )}

      {screen === "speaking" && (
        <Speaking
          prompt={pickSpeakingPrompt(eng.lvl)}
          token={token}
          t={t}
          onDone={(r) => {
            setSpoken(r);
            setSpDone(true);
            setAnswered((n) => n + 1);
            setScreen(afterSection(eng.secIdx, frDone, true));
          }}
        />
      )}

      {screen === "sectionComplete" && (
        <div className="pt-10 text-center">
          <div className="text-6xl">{sec.icon}</div>
          <h2 className="mt-3 text-2xl font-extrabold" style={{ color: sec.hex }}>
            {fill(t.sectionDone, { name: secName })}
          </h2>
          <StickyBar>
            <BigButton
              color={sec.hex}
              onClick={() => {
                if (eng.secIdx >= SECTIONS.length - 1) return setScreen("emailGate");
                setEng({ ...eng, secIdx: eng.secIdx + 1 });
                setScreen("sectionIntro");
              }}
            >
              {t.continue}
            </BigButton>
          </StickyBar>
        </div>
      )}

      {screen === "emailGate" && <EmailGate t={t} name={name} student={student} busy={busy} error={error} onSubmit={(e) => void finish(e)} />}

      {screen === "results" && result && <Results t={t} name={name} goal={goal} result={result} writingText={writing.text} student={student} />}

      {screen === "locked" && locked && <Locked t={t} info={locked} />}

      {screen === "rateLimited" && (
        <div className="pt-16 text-center">
          <div className="text-5xl">⏳</div>
          <h2 className="mt-3 text-xl font-extrabold text-white">{t.rateTitle}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#A9A4C0]">{t.rateSub}</p>
        </div>
      )}

      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-extrabold text-[#0d2210] transition-all duration-300 ${toast ? "opacity-100" : "translate-y-5 opacity-0"}`}
        style={{ background: C.green }}
      >
        {toast}
      </div>
    </div>
  );
}

function Welcome({ t, busy, error, onStart }: { t: EvalT; busy: boolean; error: string; onStart: (name: string) => void }) {
  const [name, setName] = useState("");
  const ok = name.trim().length > 0;
  return (
    <div>
      <div className="mt-4 text-center">
        <div className="text-6xl">🎯</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">{t.title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#A9A4C0]">{t.sub}</p>
      </div>
      <form
        className="card mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onStart(name.trim());
        }}
      >
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#A9A4C0]" htmlFor="eval-name">
          {t.nameLabel}
        </label>
        <input
          id="eval-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="given-name"
          placeholder={t.namePlaceholder}
          className="field !rounded-2xl !py-3.5 text-base font-bold"
        />
        <BigButton type="submit" disabled={busy || !ok}>
          {busy ? t.starting : t.start}
        </BigButton>
        {error && <p className="text-center text-sm text-[#FFC531]">{error}</p>}
        <p className="text-center text-xs text-[#A9A4C0]/80">{t.free}</p>
      </form>
      <p className="mt-4 text-center text-xs">
        <Link href="/entrar?next=/evaluacion" className="font-semibold text-[#A9A4C0] hover:text-white">
          {t.haveAccount}
        </Link>
      </p>
    </div>
  );
}

function EmailGate({ t, name, student, busy, error, onSubmit }: { t: EvalT; name: string; student: boolean; busy: boolean; error: string; onSubmit: (email?: string) => void }) {
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <div className="pt-4">
      <div className="text-center">
        <div className="text-6xl">🏆</div>
        <h2 className="mt-2 text-2xl font-extrabold text-white">{fill(t.ready, { name })}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[#A9A4C0]">{student ? t.studentWhy : t.emailWhy}</p>
      </div>
      <form
        className="card mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (student) onSubmit();
          else if (valid) onSubmit(email.trim().toLowerCase());
        }}
      >
        {!student && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            aria-label={t.emailPlaceholder}
            className="field !rounded-2xl !py-3.5 text-base font-bold"
          />
        )}
        <BigButton type="submit" disabled={busy || (!student && !valid)}>
          {busy ? t.saving : t.seeResults}
        </BigButton>
        {error && <p className="text-center text-sm text-[#FFC531]">{error}</p>}
        {!student && (
          <>
            <p className="text-center text-xs text-[#A9A4C0]/80">{t.noSpam}</p>
            <p className="text-center text-[11px] leading-snug text-[#A9A4C0]/70">{t.privacy}</p>
          </>
        )}
      </form>
    </div>
  );
}
