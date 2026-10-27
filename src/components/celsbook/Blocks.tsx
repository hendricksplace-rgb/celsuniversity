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

export type Local = { civics_senator: string; civics_representative: string };
type Ctx = {
  local: Local;
  setLocal: (k: keyof Local, v: string) => void;
  /** Jump to the first page of a section (intro map). */
  goSection: (k: SectionKey) => void;
  /** The course's final exam, for checklist links to it. */
  finalExamHref?: string | null;
};
export const BookCtx = createContext<Ctx>({ local: { civics_senator: "", civics_representative: "" }, setLocal: () => {}, goSection: () => {} });

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
  const { finalExamHref } = useContext(BookCtx);
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

export function BookBlock(p: Props) {
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
            <b>{block.title || "Consejo del instructor"}</b>
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
      if (block.type === "list" && section === "fun") return <Funics words={block.items.map((en) => ({ en, es: "" }))} title={block.title} {...p} />;
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
      if (section === "ptf") return <Chat lines={block.items.map((it, i) => ({ side: chatSide(block.title, i), en: it.en, es: it.es }))} />;
      if (section === "fun") return <Funics words={block.items} title={block.title} {...p} />;
      return <Words groups={[{ name: "", items: block.items }]} section={section} />;
    case "keys":
      if (section === "ptf")
        return (
          <Chat
            lines={block.items.flatMap((it) => [
              { side: "off" as const, en: it.title, es: "" },
              { side: "you" as const, en: it.body.replace(/^\s*A\s*:\s*/, ""), es: "" },
            ])}
          />
        );
      return <Keys block={block} />;
    case "myth":
      return <Myth block={block} value={p.value} onChange={p.onChange} />;
    case "practice":
      if (section === "rep") return <Review block={block} said={p.said} onSaid={p.onSaid} />;
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
  const { goSection } = useContext(BookCtx);
  const tiles =
    block.type === "list"
      ? block.items.map((it) => {
          const [name, ...rest] = it.split(":");
          return mapTile(name, rest.join(":"));
        })
      : block.items.map((it) => mapTile(it.title, it.body));
  return (
    <section>
      <h2 className="sub">En este episodio · toca para ir</h2>
      <div className="map">
        {tiles.map((t) => (
          <button key={t.key} type="button" style={{ ["--c" as string]: SECTIONS[t.key].c }} onClick={() => goSection(t.key)}>
            <b>{SECTIONS[t.key].name}</b>
            <span>{t.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Words / Verbs: tiles, "Ver todo" / "Pon a prueba tu memoria", quick quiz ---------- */
function Words({ groups, section }: { groups: { name: string; items: Spoken[] }[]; section: SectionKey }) {
  const [test, setTest] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const all = groups.flatMap((g) => g.items);
  return (
    <section>
      <div className="modes" role="group" aria-label="Modo">
        <button type="button" aria-pressed={!test} onClick={() => (setTest(false), setShown(new Set()))}>
          <span aria-hidden>👀</span> Ver todo
        </button>
        <button type="button" aria-pressed={test} onClick={() => (setTest(true), setShown(new Set()))}>
          <span aria-hidden>🙈</span> Pon a prueba tu memoria
        </button>
      </div>
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {groups.length > 1 && g.name && <h2 className="grp">{g.name}</h2>}
          <div className="words">
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
  const speak = useSpeak(it.audio);
  return (
    <button
      type="button"
      className={`wt${open ? " show" : ""}`}
      onClick={() => {
        speak(it.en);
        onTap();
      }}
    >
      <span className="ear" aria-hidden>
        🔊
      </span>
      <span className="en it">{it.en}</span>
      {hidden ? <span className="es hid" aria-hidden /> : <span className="es">{it.es}</span>}
      <span className="sr">{hidden ? " (toca para ver en español)" : " (escuchar)"}</span>
    </button>
  );
}

function QuickQuiz({ items, section }: { items: { en: string; es: string }[]; section: SectionKey }) {
  const qs = quickQuiz(items);
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  if (!qs.length) return null;
  const q = qs[n];
  const ok = pick === q.es;
  return (
    <div className="quiz" aria-live="polite">
      <div className="qh">
        PRUEBA RÁPIDA · {n + 1} DE {qs.length}
      </div>
      <p className="qq it">¿Qué significa “{q.en}”?</p>
      <div className="ops">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={pick !== null}
            className={pick === null ? "" : o === q.es ? "ok" : o === pick ? "bad" : ""}
            onClick={() => setPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="fb">
        {pick !== null && (
          <>
            {ok ? "✓ ¡Muy bien!" : `Casi. “${q.en}” significa “${q.es}”.`}{" "}
            {n < qs.length - 1 ? (
              <button type="button" className="nx" onClick={() => (setN(n + 1), setPick(null))}>
                Siguiente pregunta →
              </button>
            ) : (
              <>
                <b>¡Terminaste la prueba!</b>{" "}
                <button type="button" className="nx" onClick={() => (setN(0), setPick(null))}>
                  ↺ Otra vez
                </button>
              </>
            )}
          </>
        )}
      </div>
      <span className="sr">{section === "vtv" ? "Verbos" : "Palabras"}</span>
    </div>
  );
}

/* ---------- Phrases that Fit: the interview chat ---------- */
type Line = { side: "off" | "you"; en: string; es: string };
function Chat({ lines }: { lines: Line[] }) {
  const [count, setCount] = useState(Math.min(2, lines.length));
  const [tr, setTr] = useState<Set<number>>(new Set());
  const hasEs = lines.some((l) => l.es);
  const both = lines.some((l) => l.side === "off") && lines.some((l) => l.side === "you");
  return (
    <section>
      <p className="hint">
        {both && "Así empieza tu entrevista. "}Toca <b>“Siguiente frase”</b> para avanzar.{hasEs && " Toca cualquier frase para verla en español."}
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
            <small>{l.side === "off" ? "👮 EL OFICIAL DICE" : "🙋 TÚ RESPONDES"}</small>
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
            Siguiente frase ↓
          </button>
          <button type="button" className="btn b-sec" onClick={() => setCount(lines.length)}>
            Ver toda la conversación
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- practice: "🎤 Grabarme" (recorded and played back in the browser only; never uploaded or scored) ---------- */
function Practice({ block }: { block: Extract<Block, { type: "practice" }> }) {
  return (
    <section className="practice">
      <h2>
        <span aria-hidden>🎤</span> {block.title || "Practica en voz alta"}
      </h2>
      {block.hint && <p>{block.hint}</p>}
      {block.items.map((q, i) => (
        <RecordRow key={i} q={q} />
      ))}
    </section>
  );
}

function RecordRow({ q }: { q: string }) {
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
          {recording ? `■ Detener · ${clock(seconds)}` : url ? "🎤 Otra vez" : "🎤 Grabarme"}
        </button>
      </div>
      {url && !recording && <audio controls src={url} aria-label={`Tu grabación: ${q}`} />}
      {state === "denied" && <p className="note">Permite el micrófono en tu navegador para grabarte.</p>}
      {state === "unsupported" && <p className="note">Tu navegador no puede grabar aquí. Abre CelsU en Chrome o Safari.</p>}
    </div>
  );
}

/* ---------- Funics: the ending, word tiles that play and turn pink once said ---------- */
function Funics({ words, title, said, onSaid }: Props & { words: { en: string; es: string; audio?: string | null }[]; title?: string }) {
  const end = familyEnding(title);
  const marks = bools(said, words.length);
  return (
    <section>
      {end && (
        <div className="fam">
          <span className="lab">FAMILIA</span>
          <span className="end">-{end}</span>
        </div>
      )}
      <div className="fwords">
        {words.map((w, i) => (
          <FunicsTile key={i} w={w} end={end} said={marks[i]} onSay={() => !marks[i] && onSaid(marks.map((m, j) => m || j === i))} />
        ))}
      </div>
    </section>
  );
}

function FunicsTile({ w, end, said, onSay }: { w: { en: string; es: string; audio?: string | null }; end: string; said: boolean; onSay: () => void }) {
  const speak = useSpeak(w.audio);
  const cut = end && w.en.toLowerCase().endsWith(end) ? w.en.length - end.length : w.en.length;
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
      {w.en.slice(0, cut)}
      <b>{w.en.slice(cut)}</b>
      {w.es && <small>{w.es}</small>}
      <span className="sr"> (escuchar y marcar como dicha)</span>
    </button>
  );
}

/* ---------- Focus: the questions as an accordion ---------- */
function Keys({ block }: { block: Extract<Block, { type: "keys" }> }) {
  const { local } = useContext(BookCtx);
  const anyStar = block.items.some((it) => isStarred(it));
  return (
    <section>
      <p className="hint">
        Toca cada pregunta para ver las respuestas aceptadas.
        {anyStar && (
          <>
            {" "}
            <span className="star65">★ 65/20</span> = también está en las 20 preguntas.
          </>
        )}
      </p>
      <div className="qa" style={{ marginTop: 12 }}>
        {block.items.map((it, i) => {
          const mine = localAnswerFor(it.title);
          const value = mine === "senator" ? local.civics_senator : mine === "representative" ? local.civics_representative : "";
          return <Accordion key={i} n={i + 1} q={it.title} star={isStarred(it)} answers={acceptedAnswers(it.body)} mine={value} label="RESPUESTAS ACEPTADAS · DI UNA" />;
        })}
      </div>
    </section>
  );
}

function Accordion({ n, q, star, answers, mine, label }: { n: number; q: string; star?: boolean; answers: string[]; mine?: string; label: string }) {
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
            <span className="star65" aria-label="También está en las 20 preguntas (65/20)">
              ★ 65/20
            </span>
          )}
        </span>
        <span className="chev" aria-hidden>
          {open ? "Ocultar ▴" : "Ver respuesta ▾"}
        </span>
      </button>
      <div className="ans" id={id} hidden={!open}>
        {label && <small>{label}</small>}
        <ul className="chips">
          {mine && <li className="mine">Tu respuesta: {mine}</li>}
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
  const picks = Array.from({ length: block.items.length }, (_, i) => (Array.isArray(value) && typeof value[i] === "boolean" ? (value[i] as boolean) : null));
  const firstOpen = picks.findIndex((x) => x === null);
  const [k, setK] = useState(firstOpen >= 0 ? firstOpen : 0);
  const m = block.items[k];
  const pick = picks[k];
  return (
    <section className="myth" aria-live="polite">
      <h2>¿Mito o realidad?</h2>
      <p className="st">{m.q}</p>
      <div className="ops">
        <button type="button" className="m-r" aria-pressed={pick === true} onClick={() => onChange(picks.map((p, j) => (j === k ? true : p)))}>
          ✓ Realidad
        </button>
        <button type="button" className="m-m" aria-pressed={pick === false} onClick={() => onChange(picks.map((p, j) => (j === k ? false : p)))}>
          ✗ Mito
        </button>
      </div>
      {pick !== null && (
        <div className="fb">
          {pick === m.real ? "✓ ¡Correcto! " : "✗ No exactamente. "}
          <b>{m.real ? "Realidad" : "Mito"}.</b> {mythExplanation(m.a)}
          <div>
            {k < block.items.length - 1 ? (
              <button type="button" className="btn b-sec" onClick={() => setK(k + 1)}>
                Siguiente →
              </button>
            ) : (
              block.items.length > 1 && (
                <button type="button" className="btn b-sec" onClick={() => setK(0)}>
                  ↺ Volver a empezar
                </button>
              )
            )}
          </div>
        </div>
      )}
      <p className="cnt">
        {k + 1} de {block.items.length}
      </p>
    </section>
  );
}

/* ---------- Repaso final: "🗣️ Ya la dije" ---------- */
function Review({ block, said, onSaid }: { block: Extract<Block, { type: "practice" }>; said: unknown; onSaid: (v: unknown) => void }) {
  const marks = bools(said, block.items.length);
  const hint = (block.hint ?? "Responde en inglés con una de las respuestas aceptadas.").replace(/\s*Gr[aá]bate[^.]*\./i, "").trim();
  return (
    <section>
      <p className="hint">
        {hint} Toca <b>“Ya la dije”</b> cuando la practiques en voz alta.
      </p>
      <ul className="rv" style={{ marginTop: 12 }}>
        {block.items.map((q, i) => (
          <li key={i} className={`rq${marks[i] ? " ok" : ""}`}>
            <span>{q}</span>
            <button type="button" aria-pressed={marks[i]} onClick={() => onSaid(marks.map((m, j) => (j === i ? !m : m)))}>
              <span aria-hidden>🗣️</span> Ya la dije
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Checklist({ block, value, onChange }: { block: Extract<Block, { type: "checklist" }>; value: unknown; onChange: (v: unknown) => void }) {
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
              {marks[i] ? "✓ Hecho" : "Marcar ✓"}
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
  const { local, setLocal } = useContext(BookCtx);
  const texts = Array.from({ length: block.fields.length }, (_, i) => (Array.isArray(value) && typeof value[i] === "string" ? (value[i] as string) : ""));
  const onProfile = /respuestas locales/i.test(block.title ?? "") && block.fields.some((f) => profileField(f.label));
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
        <span aria-hidden>📝</span> {block.title || "Mis respuestas"}
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
              placeholder={input === "text" ? "Escribe aquí" : undefined}
              value={col ? local[col] : texts[i]}
              autoComplete="off"
              onChange={(e) => (col ? saveProfile(col, e.target.value) : onChange(texts.map((x, j) => (j === i ? e.target.value : x))))}
            />
          </label>
        );
      })}
      <p className="saved" aria-live="polite">
        {state === "saving" ? "Guardando…" : state === "saved" ? "✓ Guardado en tu perfil" : state === "error" ? "No se pudo guardar. Revisa tu conexión." : onProfile ? "Se guarda en tu perfil." : "✓ Se guarda solo."}
      </p>
    </section>
  );
}

function Notes({ block, value, onChange }: { block: Extract<Block, { type: "notes" }>; value: unknown; onChange: (v: unknown) => void }) {
  const max = block.max ?? 5;
  const lines = Array.isArray(value) && value.length ? (value as string[]) : Array(block.min ?? 1).fill("");
  return (
    <section className="fields">
      <h2>
        <span aria-hidden>✍️</span> {block.title || "Mis notas"}
      </h2>
      {lines.map((l, i) => (
        <label key={i}>
          <span className="sr">
            {block.title || "Nota"} {i + 1}
          </span>
          <input value={l} maxLength={200} placeholder={i === 0 ? block.placeholder : undefined} onChange={(e) => onChange(lines.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}
      {lines.length < max && (
        <button type="button" className="add" onClick={() => onChange([...lines, ""])}>
          + Otra línea
        </button>
      )}
    </section>
  );
}
