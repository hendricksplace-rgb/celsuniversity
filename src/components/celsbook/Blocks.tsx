"use client";

// CelsUS CelsBook: one renderer per block type and section (the brief's tables). Answers the student gives are
// kept in ebook_answers.answers under "<screen id>:<block index>" (see CelsBookReader).
import { createContext, Fragment, useContext, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ebookLinkHref, type Block, type EbookLink, type Spoken } from "@/lib/ebook-format";
import { useSignedRef } from "@/components/reader/media";
import { useRecorder } from "@/components/ai/useRecorder";
import {
  SECTIONS,
  acceptedAnswers,
  chatSide,
  clock,
  familyEnding,
  isEpisodeMap,
  isStarred,
  localAnswerFor,
  mapTile,
  mythExplanation,
  profileField,
  quickQuiz,
  type SectionKey,
} from "@/lib/celsbook";
import { saveLocalCivics } from "@/app/app/libros/[slug]/actions";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

export type Local = { civics_senator: string; civics_representative: string };
type Ctx = {
  local: Local;
  setLocal: (k: keyof Local, v: string) => void;
  /** Jump to the first page of a section (intro map). */
  goSection: (k: SectionKey) => void;
  /** The course's final exam, for checklist links to it. */
  finalExamHref?: string | null;
  /**
   * English mode (C-003): the student already speaks English. No Spanish on screen, no per-item audio,
   * no recording or "said it" pronunciation practice.
   */
  en: boolean;
  t: Dictionary["cb"];
};
export const BookCtx = createContext<Ctx>({
  local: { civics_senator: "", civics_representative: "" },
  setLocal: () => {},
  goSection: () => {},
  en: false,
  t: dictionaries.es.cb,
});
const useBook = () => useContext(BookCtx);

type Props = {
  block: Block;
  section: SectionKey;
  value: unknown;
  onChange: (v: unknown) => void;
  /** A second value for the same block (said / done toggles), kept apart from the block's own answer format. */
  said: unknown;
  onSaid: (v: unknown) => void;
};

const bools = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => (Array.isArray(v) ? v[i] === true : false));

function BookLink({ link }: { link: EbookLink }) {
  const { finalExamHref } = useBook();
  return <Link href={ebookLinkHref(link, finalExamHref)}>{link.label} →</Link>;
}

/** Plain text with its web links clickable (tips carry official URLs). */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)»"]+[^\s)»".,])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer">
            {p.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** English pronunciation: the item's recording when it has one, else the device's voice (nothing leaves the browser). */
function useSpeak(audioRef?: string | null) {
  const src = useSignedRef(audioRef);
  return (text: string) => {
    if (src) {
      void new Audio(src).play().catch(() => {});
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };
}

export function BookBlock(props: Props) {
  const { en, t } = useBook();
  const p = { ...props, en, t };
  const { block, section } = p;
  switch (block.type) {
    case "para":
      return (
        <p className="t">
          <Linkify text={block.text} />
        </p>
      );
    case "quote":
      return <blockquote className="quote">“{block.text.replace(/^[“"]|[”"]$/g, "")}”</blockquote>;
    case "tip":
      return (
        <aside className="tip">
          <i aria-hidden>💡</i>
          <div>
            <b>{block.title || p.t.tip}</b>
            <p>
              <Linkify text={block.text} />
            </p>
          </div>
        </aside>
      );
    case "activity":
      return (
        <div className="act">
          <i aria-hidden>🗣️</i>
          <div>
            <Linkify text={block.text} />
            {block.link && (
              <>
                {" "}
                <BookLink link={block.link} />
              </>
            )}
          </div>
        </div>
      );
    case "list":
    case "expand":
      if (isEpisodeMap(block)) return <EpisodeMap block={block} />;
      if (block.type === "list" && section === "fun") return <Funics words={block.items.map((w) => ({ en: w, es: "" }))} title={block.title} {...props} />;
      if (block.type === "list")
        return (
          <section>
            {block.title && <h2 className="sub">{block.title}</h2>}
            <ul className="chips" style={{ marginTop: 10 }}>
              {block.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        );
      return (
        <section className="qa">
          {block.title && <h2 className="sub">{block.title}</h2>}
          {block.items.map((it, i) => (
            <Accordion key={i} n={i + 1} q={it.title} answers={[it.body]} label="" />
          ))}
        </section>
      );
    case "glossary":
      return <Words groups={block.groups} section={section} />;
    case "phrases":
      if (section === "ptf")
        return (
          <Chat
            lines={block.items.map((it, i) => ({
              side: chatSide(block.title, i),
              en: it.en,
              es: en ? "" : (it.es ?? ""),
            }))}
          />
        );
      if (section === "fun") return <Funics words={block.items} title={block.title} {...props} />;
      return <Words groups={[{ name: "", items: block.items }]} section={section} />;
    case "keys":
      if (section === "ptf")
        return (
          <Chat
            lines={block.items.flatMap((it) => [
              { side: "off" as const, en: it.title, es: "" },
              {
                side: "you" as const,
                en: it.body.replace(/^\s*A\s*:\s*/, ""),
                es: "",
              },
            ])}
          />
        );
      return <Keys block={block} />;
    case "myth":
      return <Myth block={block} value={p.value} onChange={p.onChange} />;
    case "practice":
      if (section === "rep") return <Review block={block} said={p.said} onSaid={p.onSaid} />;
      if (en) return <QuestionList block={block} />;
      return <Practice block={block} />;
    case "checklist":
      return <Checklist block={block} value={p.value} onChange={p.onChange} />;
    case "fields":
      return <Fields block={block} value={p.value} onChange={p.onChange} />;
    case "notes":
      return <Notes block={block} value={p.value} onChange={p.onChange} />;
    default:
      return null;
  }
}

/* ---------- intro: "En este episodio" as tappable section tiles ---------- */
function EpisodeMap({ block }: { block: Extract<Block, { type: "list" | "expand" }> }) {
  const { goSection, t } = useBook();
  const tiles =
    block.type === "list"
      ? block.items.map((it) => {
          const [name, ...rest] = it.split(":");
          return mapTile(name, rest.join(":"));
        })
      : block.items.map((it) => mapTile(it.title, it.body));
  return (
    <section>
      <h2 className="sub">{t.mapTitle}</h2>
      <div className="map">
        {tiles.map((tile) => (
          <button key={tile.key} type="button" style={{ ["--c" as string]: SECTIONS[tile.key].c }} onClick={() => goSection(tile.key)}>
            <b>{t.sections[tile.key].name}</b>
            <span>{tile.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Words / Verbs: tiles, "Ver todo" / "Pon a prueba tu memoria", quick quiz ---------- */
function Words({ groups, section }: { groups: { name: string; items: Spoken[] }[]; section: SectionKey }) {
  const { en, t } = useBook();
  const [test, setTest] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const all = groups.flatMap((g) => g.items);
  // English-mode verb lists have no second field: nothing to hide or reveal, so no modes.
  const hasMeaning = all.some((it) => it.es?.trim());
  return (
    <section>
      {hasMeaning && (
        <div className="modes" role="group" aria-label={t.mode}>
          <button type="button" aria-pressed={!test} onClick={() => (setTest(false), setShown(new Set()))}>
            <span aria-hidden>👀</span> {t.seeAll}
          </button>
          <button type="button" aria-pressed={test} onClick={() => (setTest(true), setShown(new Set()))}>
            <span aria-hidden>🙈</span> {t.testMe}
          </button>
        </div>
      )}
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {groups.length > 1 && g.name && <h2 className="grp">{g.name}</h2>}
          <div className={`words${en ? " wide" : ""}`}>
            {g.items.map((it, i) => (
              <WordTile
                key={i}
                it={it}
                hidden={test && !shown.has(`${gi}:${i}`)}
                open={test && shown.has(`${gi}:${i}`)}
                onTap={() => test && setShown((s) => new Set(s).add(`${gi}:${i}`))}
              />
            ))}
          </div>
        </Fragment>
      ))}
      <QuickQuiz items={all} section={section} />
    </section>
  );
}

function WordTile({ it, hidden, open, onTap }: { it: Spoken; hidden: boolean; open: boolean; onTap: () => void }) {
  const { en, t } = useBook();
  const speak = useSpeak(it.audio);
  // English mode, a word with no meaning to reveal: plain text, nothing to tap.
  if (en && !it.es?.trim())
    return (
      <span className="wt mean">
        <span className="en it">{it.en}</span>
      </span>
    );
  return (
    <button
      type="button"
      className={`wt${open ? " show" : ""}${en ? " mean" : ""}`}
      onClick={() => {
        if (!en) speak(it.en);
        onTap();
      }}
    >
      {!en && (
        <span className="ear" aria-hidden>
          🔊
        </span>
      )}
      <span className="en it">{it.en}</span>
      {/* English mode: the second field holds a short English meaning (C-003), never read aloud. */}
      {hidden ? (
        <span className="es hid" aria-hidden />
      ) : (
        <span className="es" lang={en ? "en" : "es"}>
          {it.es}
        </span>
      )}
      <span className="sr">{hidden ? t.tapToSee : t.listenSr}</span>
    </button>
  );
}

function QuickQuiz({ items, section }: { items: { en: string; es: string }[]; section: SectionKey }) {
  const { en, t } = useBook();
  const qs = quickQuiz(items);
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  if (!qs.length) return null;
  const q = qs[n];
  const ok = pick === q.es;
  return (
    <div className="quiz" aria-live="polite">
      <div className="qh">{fill(t.quizHead, { n: n + 1, m: qs.length })}</div>
      <p className="qq it">{fill(t.quizQ, { w: q.en })}</p>
      <div className="ops">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={pick !== null}
            className={pick === null ? "" : o === q.es ? "ok" : o === pick ? "bad" : ""}
            lang={en ? "en" : "es"}
            onClick={() => setPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="fb">
        {pick !== null && (
          <>
            {ok ? t.right : fill(t.almost, { w: q.en, m: q.es })}{" "}
            {n < qs.length - 1 ? (
              <button type="button" className="nx" onClick={() => (setN(n + 1), setPick(null))}>
                {t.nextQ}
              </button>
            ) : (
              <>
                <b>{t.quizDone}</b>{" "}
                <button type="button" className="nx" onClick={() => (setN(0), setPick(null))}>
                  {t.again}
                </button>
              </>
            )}
          </>
        )}
      </div>
      <span className="sr">{section === "vtv" ? t.verbs : t.words}</span>
    </div>
  );
}

/* ---------- Phrases that Fit: the interview chat ---------- */
type Line = { side: "off" | "you"; en: string; es: string };
function Chat({ lines }: { lines: Line[] }) {
  const { t } = useBook();
  const [count, setCount] = useState(Math.min(2, lines.length));
  const [tr, setTr] = useState<Set<number>>(new Set());
  const hasEs = lines.some((l) => l.es);
  const both = lines.some((l) => l.side === "off") && lines.some((l) => l.side === "you");
  return (
    <section>
      <p className="hint">
        {both && t.chatStart}
        {t.tapA}
        <b>{t.nextLineQ}</b>
        {t.tapB}
        {hasEs && t.chatEs}
      </p>
      <div className="chat" aria-live="polite" style={{ marginTop: 12 }}>
        {lines.slice(0, count).map((l, i) => (
          <button
            key={i}
            type="button"
            className={`msg ${l.side}`}
            aria-expanded={l.es ? tr.has(i) : undefined}
            onClick={() =>
              l.es &&
              setTr((s) => {
                const n = new Set(s);
                if (n.has(i)) n.delete(i);
                else n.add(i);
                return n;
              })
            }
          >
            <small>{l.side === "off" ? t.officer : t.you}</small>
            {l.en}
            {l.es && tr.has(i) && (
              <span className="tr" lang="es">
                {l.es}
              </span>
            )}
          </button>
        ))}
      </div>
      {count < lines.length && (
        <div className="chatact">
          <button type="button" className="btn b-pri" onClick={() => setCount((c) => c + 1)}>
            {t.nextLine}
          </button>
          <button type="button" className="btn b-sec" onClick={() => setCount(lines.length)}>
            {t.wholeChat}
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- practice: "🎤 Grabarme" (recorded and played back in the browser only; never uploaded or scored) ---------- */
function Practice({ block }: { block: Extract<Block, { type: "practice" }> }) {
  const { t } = useBook();
  return (
    <section className="practice">
      <h2>
        <span aria-hidden>🎤</span> {block.title || t.practice}
      </h2>
      {block.hint && <p>{block.hint}</p>}
      {block.items.map((q, i) => (
        <RecordRow key={i} q={q} />
      ))}
    </section>
  );
}

/** English mode: the practice questions to answer, with no recording control (C-003). */
function QuestionList({ block }: { block: Extract<Block, { type: "practice" }> }) {
  const { t } = useBook();
  const hint = noRecording(block.hint ?? "");
  return (
    <section className="practice">
      <h2>{block.title || t.practice}</h2>
      {hint && <p>{hint}</p>}
      <ol className="plist">
        {block.items.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ol>
    </section>
  );
}

/** A practice hint without its "record yourself" sentence (Spanish or English). */
const noRecording = (hint: string) => hint.replace(/\s*(Gr[aá]bate|Record yourself)[^.]*\./i, "").trim();

function RecordRow({ q }: { q: string }) {
  const { t } = useBook();
  const [url, setUrl] = useState<string | null>(null);
  const { state, seconds, start, stop } = useRecorder((blob) => {
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
  });
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const recording = state === "recording";
  return (
    <div className="pq">
      <div className="row">
        <span>{q}</span>
        <button type="button" className={recording ? "rec" : ""} onClick={() => (recording ? stop() : void start())}>
          {recording ? fill(t.stop, { t: clock(seconds) }) : url ? t.recordAgain : t.record}
        </button>
      </div>
      {url && !recording && <audio controls src={url} aria-label={fill(t.recording, { q })} />}
      {state === "denied" && <p className="note">{t.micDenied}</p>}
      {state === "unsupported" && <p className="note">{t.micUnsupported}</p>}
    </div>
  );
}

/* ---------- Funics: the ending, word tiles that play and turn pink once said ---------- */
function Funics({
  words,
  title,
  said,
  onSaid,
}: Props & {
  words: { en: string; es?: string; audio?: string | null }[];
  title?: string;
}) {
  const { en, t } = useBook();
  const end = familyEnding(title);
  const marks = bools(said, words.length);
  return (
    <section>
      {end && (
        <div className="fam">
          <span className="lab">{t.family}</span>
          <span className="end">-{end}</span>
        </div>
      )}
      <div className="fwords">
        {words.map((w, i) =>
          // English mode: the family as plain words, no listen-and-say tiles.
          en ? (
            <span key={i} className="fw plain">
              {splitEnding(w.en, end)[0]}
              <b>{splitEnding(w.en, end)[1]}</b>
              {w.es && <small>{w.es}</small>}
            </span>
          ) : (
            <FunicsTile key={i} w={w} end={end} said={marks[i]} onSay={() => !marks[i] && onSaid(marks.map((m, j) => m || j === i))} />
          ),
        )}
      </div>
    </section>
  );
}

const splitEnding = (word: string, end: string) => {
  const cut = end && word.toLowerCase().endsWith(end) ? word.length - end.length : word.length;
  return [word.slice(0, cut), word.slice(cut)];
};

function FunicsTile({ w, end, said, onSay }: { w: { en: string; es?: string; audio?: string | null }; end: string; said: boolean; onSay: () => void }) {
  const { t } = useBook();
  const speak = useSpeak(w.audio);
  const [head, tail] = splitEnding(w.en, end);
  return (
    <button
      type="button"
      className={`fw${said ? " said" : ""}`}
      aria-pressed={said}
      onClick={() => {
        speak(w.en);
        onSay();
      }}
    >
      {head}
      <b>{tail}</b>
      {w.es && <small>{w.es}</small>}
      <span className="sr">{t.funicsSr}</span>
    </button>
  );
}

/* ---------- Focus: the questions as an accordion ---------- */
function Keys({ block }: { block: Extract<Block, { type: "keys" }> }) {
  const { local, t } = useBook();
  const anyStar = block.items.some((it) => isStarred(it));
  return (
    <section>
      <p className="hint">
        {t.keysHint}
        {anyStar && (
          <>
            {" "}
            <span className="star65">★ 65/20</span>
            {t.starNote}
          </>
        )}
      </p>
      <div className="qa" style={{ marginTop: 12 }}>
        {block.items.map((it, i) => {
          const mine = localAnswerFor(it.title);
          const value = mine === "senator" ? local.civics_senator : mine === "representative" ? local.civics_representative : "";
          return <Accordion key={i} n={i + 1} q={it.title} star={isStarred(it)} answers={acceptedAnswers(it.body)} mine={value} label={t.accepted} />;
        })}
      </div>
    </section>
  );
}

function Accordion({ n, q, star, answers, mine, label }: { n: number; q: string; star?: boolean; answers: string[]; mine?: string; label: string }) {
  const { t } = useBook();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`qi${open ? " open" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="n" aria-hidden>
          {n}
        </span>
        <span className="q">
          {q}
          {star && (
            <span className="star65" aria-label={t.starAria}>
              ★ 65/20
            </span>
          )}
        </span>
        <span className="chev" aria-hidden>
          {open ? t.hide : t.show}
        </span>
      </button>
      <div className="ans" id={id} hidden={!open}>
        {label && <small>{label}</small>}
        <ul className="chips">
          {mine && <li className="mine">{fill(t.yours, { a: mine })}</li>}
          {answers.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- ¿Mito o realidad? one statement at a time ---------- */
function Myth({ block, value, onChange }: { block: Extract<Block, { type: "myth" }>; value: unknown; onChange: (v: unknown) => void }) {
  const { t } = useBook();
  const picks = Array.from({ length: block.items.length }, (_, i) => (Array.isArray(value) && typeof value[i] === "boolean" ? (value[i] as boolean) : null));
  const firstOpen = picks.findIndex((x) => x === null);
  const [k, setK] = useState(firstOpen >= 0 ? firstOpen : 0);
  const m = block.items[k];
  const pick = picks[k];
  return (
    <section className="myth" aria-live="polite">
      <h2>{t.myth}</h2>
      <p className="st">{m.q}</p>
      <div className="ops">
        <button type="button" className="m-r" aria-pressed={pick === true} onClick={() => onChange(picks.map((p, j) => (j === k ? true : p)))}>
          {t.factBtn}
        </button>
        <button type="button" className="m-m" aria-pressed={pick === false} onClick={() => onChange(picks.map((p, j) => (j === k ? false : p)))}>
          {t.mythBtn}
        </button>
      </div>
      {pick !== null && (
        <div className="fb">
          {pick === m.real ? t.correct : t.notQuite}
          <b>{m.real ? t.fact : t.mythWord}.</b> {mythExplanation(m.a)}
          <div>
            {k < block.items.length - 1 ? (
              <button type="button" className="btn b-sec" onClick={() => setK(k + 1)}>
                {t.nextBtn}
              </button>
            ) : (
              block.items.length > 1 && (
                <button type="button" className="btn b-sec" onClick={() => setK(0)}>
                  {t.restart}
                </button>
              )
            )}
          </div>
        </div>
      )}
      <p className="cnt">{fill(t.of, { n: k + 1, m: block.items.length })}</p>
    </section>
  );
}

/* ---------- Repaso final: "🗣️ Ya la dije" ---------- */
function Review({ block, said, onSaid }: { block: Extract<Block, { type: "practice" }>; said: unknown; onSaid: (v: unknown) => void }) {
  const { t } = useBook();
  const marks = bools(said, block.items.length);
  const hint = noRecording(block.hint ?? t.reviewHint);
  return (
    <section>
      <p className="hint">
        {hint} {t.tapA}
        <b>{t.saidQ}</b>
        {t.saidB}
      </p>
      <ul className="rv" style={{ marginTop: 12 }}>
        {block.items.map((q, i) => (
          <li key={i} className={`rq${marks[i] ? " ok" : ""}`}>
            <span>{q}</span>
            <button type="button" aria-pressed={marks[i]} onClick={() => onSaid(marks.map((m, j) => (j === i ? !m : m)))}>
              <span aria-hidden>🗣️</span> {t.said}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Checklist({ block, value, onChange }: { block: Extract<Block, { type: "checklist" }>; value: unknown; onChange: (v: unknown) => void }) {
  const { t } = useBook();
  const marks = bools(value, block.items.length);
  return (
    <section>
      {block.title && <h2 className="sub">{block.title}</h2>}
      <ul className="rv" style={{ marginTop: 12 }}>
        {block.items.map((it, i) => (
          <li key={i} className={`rq plain${marks[i] ? " ok" : ""}`}>
            <span>
              {it.text}
              {it.link && (
                <>
                  {" "}
                  <BookLink link={it.link} />
                </>
              )}
            </span>
            <button type="button" aria-pressed={marks[i]} onClick={() => onChange(marks.map((m, j) => (j === i ? !m : m)))}>
              {marks[i] ? t.done : t.mark}
            </button>
          </li>
        ))}
      </ul>
      {block.done_text && marks.every(Boolean) && (
        <p className="donebadge" style={{ marginTop: 12 }}>
          🎉 {block.done_text}
        </p>
      )}
    </section>
  );
}

/* ---------- 📝 fields: the senator / representative go to the student's profile; the rest to the book's answers ---------- */
function Fields({ block, value, onChange }: { block: Extract<Block, { type: "fields" }>; value: unknown; onChange: (v: unknown) => void }) {
  const { local, setLocal, t } = useBook();
  const texts = Array.from({ length: block.fields.length }, (_, i) => (Array.isArray(value) && typeof value[i] === "string" ? (value[i] as string) : ""));
  const onProfile = /respuestas locales|local answers/i.test(block.title ?? "") && block.fields.some((f) => profileField(f.label));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Local>>({});
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const saveProfile = (k: keyof Local, v: string) => {
    setLocal(k, v);
    pending.current[k] = v;
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const row = pending.current;
      pending.current = {};
      const r = await saveLocalCivics(row).catch(() => ({ ok: false }));
      setState(r.ok ? "saved" : "error");
    }, 700);
  };
  return (
    <section className="fields">
      <h2>
        <span aria-hidden>📝</span> {block.title || t.fields}
      </h2>
      {block.fields.map((f, i) => {
        const col = onProfile ? profileField(f.label) : null;
        const input = (f as { input?: string }).input === "date" ? "date" : "text";
        return (
          <label key={i}>
            {f.label}
            <input
              type={input}
              maxLength={col ? 120 : 200}
              placeholder={input === "text" ? t.writeHere : undefined}
              value={col ? local[col] : texts[i]}
              autoComplete="off"
              onChange={(e) => (col ? saveProfile(col, e.target.value) : onChange(texts.map((x, j) => (j === i ? e.target.value : x))))}
            />
          </label>
        );
      })}
      <p className="saved" aria-live="polite">
        {state === "saving" ? t.saving : state === "saved" ? t.savedProfile : state === "error" ? t.saveError : onProfile ? t.onProfile : t.autosaved}
      </p>
    </section>
  );
}

function Notes({ block, value, onChange }: { block: Extract<Block, { type: "notes" }>; value: unknown; onChange: (v: unknown) => void }) {
  const { t } = useBook();
  const max = block.max ?? 5;
  const lines = Array.isArray(value) && value.length ? (value as string[]) : Array(block.min ?? 1).fill("");
  return (
    <section className="fields">
      <h2>
        <span aria-hidden>✍️</span> {block.title || t.notes}
      </h2>
      {lines.map((l, i) => (
        <label key={i}>
          <span className="sr">
            {block.title || t.note} {i + 1}
          </span>
          <input
            value={l}
            maxLength={200}
            placeholder={i === 0 ? block.placeholder : undefined}
            onChange={(e) => onChange(lines.map((x, j) => (j === i ? e.target.value : x)))}
          />
        </label>
      ))}
      {lines.length < max && (
        <button type="button" className="add" onClick={() => onChange([...lines, ""])}>
          {t.addLine}
        </button>
      )}
    </section>
  );
}
