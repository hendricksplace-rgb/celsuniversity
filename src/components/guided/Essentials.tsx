"use client";

// "Lo esencial" of the guided template: one renderer per e-book block type (the same block format as the e-book
// reader, src/lib/ebook-format.ts), drawn in the CelsGLOBAL step look (port of content/celsglobal/guided-renderer).
// Answers to the interactive blocks (myth, checklist, whatif) are kept in guided_step_progress.state.ess.
import Link from "next/link";
import { useState } from "react";
import type { Block, EbookLink } from "@/lib/ebook-format";
import type { MoreVideo } from "@/lib/guided";
import { Ico, say } from "./ui";
import s from "./guided.module.css";

type V = unknown;
type Props = { block: Block; value: V; onChange: (v: V) => void; stepHref?: (n: number) => string };
type Link2 = { label: string; step?: number; tool?: string; course?: string; ebook?: string } | EbookLink;

const ICON: Record<string, string> = { briefcase: "brief", door: "doc", shield: "check", money: "doc", clock: "clock", book: "book", chat: "chat", user: "user", check: "check", spark: "spark", doc: "doc" };

function Card({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className={`${s.card} ${s.gcard}`}>
      {title && <h3>{title}</h3>}
      {sub && <p className={s.sub}>{sub}</p>}
      {children}
    </div>
  );
}

export function linkHref(l: Link2, stepHref?: (n: number) => string) {
  if ("step" in l && l.step && stepHref) return stepHref(l.step);
  if ("tool" in l && l.tool === "resume_review") return "/app/herramientas/resume";
  if ("tool" in l && l.tool === "interview_practice") return "/app/herramientas/entrevista";
  if ("course" in l && l.course) return `/app/cursos/${l.course}`;
  if ("ebook" in l && l.ebook) return `/app/libros/${l.ebook}`;
  return null;
}

/** Yes/no rows (myth as an e-book block and as practice), with the course's labels. */
export function Binary({ items, value, onChange, labels }: { items: { q: string; real: boolean; a: string }[]; value: V; onChange: (v: V) => void; labels: { true: string; false: string } }) {
  const picks = Array.isArray(value) ? (value as (boolean | null)[]) : [];
  return (
    <div className={s.gm}>
      {items.map((x, i) => {
        const a = picks[i];
        const done = a === true || a === false;
        return (
          <div className={s.dq} key={i}>
            <div className={s.gmQ}>{x.q}</div>
            <div className={s.bin}>
              {[true, false].map((t) => {
                const c = !done ? "" : t === x.real ? s.right : t === a ? s.wrong : "";
                return (
                  <button
                    key={String(t)}
                    type="button"
                    className={c}
                    disabled={done}
                    aria-pressed={a === t}
                    onClick={() => onChange(items.map((_, j) => (j === i ? t : (picks[j] ?? null))))}
                  >
                    {t ? labels.true : labels.false}
                  </button>
                );
              })}
            </div>
            {done && (
              <div className={s.dfb}>
                {a === x.real ? <b>¡Correcto! </b> : <b className={s.no}>No exactamente. </b>}
                {x.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WhatIf({ items, value, onChange }: { items: { q: string; a: string }[]; value: V; onChange: (v: V) => void }) {
  const open = Array.isArray(value) ? (value as boolean[]) : [];
  return (
    <div className={s.gw}>
      {items.map((x, i) => (
        <button key={i} type="button" aria-expanded={!!open[i]} onClick={() => onChange(items.map((_, j) => (j === i ? !open[j] : !!open[j])))}>
          <b>
            <Ico n="alert" />
            {x.q}
          </b>
          {open[i] ? <span>{x.a}</span> : <em>Toca para ver la respuesta</em>}
        </button>
      ))}
    </div>
  );
}

/** Tap-to-check list (e-book checklist and the build checklist), with a result or a done message. */
export function TapCheck({
  items,
  value,
  onChange,
  doneText,
  result,
  stepHref,
}: {
  items: { text: string; link?: Link2 }[];
  value: V;
  onChange: (v: V) => void;
  doneText?: string;
  result?: { high: string; mid: string; low: string };
  stepHref?: (n: number) => string;
}) {
  const on = items.map((_, i) => Array.isArray(value) && value[i] === true);
  const n = on.filter(Boolean).length;
  const all = n === items.length && n > 0;
  const r = n / Math.max(items.length, 1);
  return (
    <>
      <ul className={s.tck}>
        {items.map((x, i) => {
          const href = x.link ? linkHref(x.link, stepHref) : null;
          return (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <button type="button" aria-pressed={on[i]} onClick={() => onChange(on.map((v, j) => (j === i ? !v : v)))} data-check-item={i}>
                <i>
                  <Ico n="check" />
                </i>
                <div>{x.text}</div>
              </button>
              {x.link && href && (
                <Link href={href} className={s.lnk}>
                  {x.link.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {result && n > 0 ? (
        <div className={`${s.gres} ${r >= 0.8 ? s.gresOk : ""}`} aria-live="polite">
          <b>
            {n}/{items.length}
          </b>
          <span>{r >= 0.8 ? result.high : r >= 0.45 ? result.mid : result.low}</span>
        </div>
      ) : !result && doneText && all ? (
        <div className={`${s.gres} ${s.gresOk}`}>
          <b>✓</b>
          <span>{doneText}</span>
        </div>
      ) : null}
    </>
  );
}

export function EssBlock({ block: b, value, onChange, stepHref }: Props) {
  switch (b.type) {
    case "para":
      return <p className={s.gpara}>{b.text}</p>;
    case "quote":
      return (
        <div className={s.gquote}>
          {b.text}
          {b.by && <small style={{ display: "block", fontSize: 14, marginTop: 6, color: "var(--mut)" }}>— {b.by}</small>}
        </div>
      );
    case "tip":
      return (
        <div className={s.gtip}>
          <span className={s.gi}>
            <Ico n="spark" />
          </span>
          <div>
            {b.title && <b>{b.title}</b>}
            <p>{b.text}</p>
          </div>
        </div>
      );
    case "activity": {
      const href = b.link ? linkHref(b.link) : null;
      return (
        <div className={`${s.gtip} ${s.gtipAct}`}>
          <span className={s.gi}>
            <Ico n="target" />
          </span>
          <div>
            <b>Tu reto</b>
            <p>{b.text}</p>
            {b.link && href && (
              <Link href={href} className={s.lnk} style={{ marginTop: 8 }}>
                {b.link.label} →
              </Link>
            )}
          </div>
        </div>
      );
    }
    case "keys":
      return (
        <Card title={b.title}>
          <div className={`${s.keys} ${b.items.length % 2 === 0 ? s.k2 : ""}`} style={{ marginTop: 6 }}>
            {b.items.map((x, i) => (
              <div key={i}>
                <span className={s.keyN}>{i + 1}</span>
                <b>{x.title}</b>
                <p>{x.body}</p>
              </div>
            ))}
          </div>
        </Card>
      );
    case "expand":
      return <Expand title={b.title} items={b.items.map((x) => ({ head: x.title, body: x.body, icon: x.icon }))} />;
    case "steps":
      return (
        <Card title={b.title}>
          <ol className={s.gst}>
            {b.items.map((x, i) => (
              <li key={i}>
                <div>
                  <b>{x.title}</b>
                  {x.body && <p>{x.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      );
    case "list":
      return (
        <Card title={b.title}>
          <ul className={s.gl}>
            {b.items.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>
      );
    case "say":
      return (
        <Card title={b.title}>
          <div className={s.gq}>
            {b.items.map((x, i) => (
              <div key={i}>
                <Ico n="chat" />
                <span>{x}</span>
              </div>
            ))}
          </div>
        </Card>
      );
    case "compare":
      return (
        <Card title={b.title}>
          {b.items.map((x, i) => (
            <div className={s.cmp} key={i}>
              <div className={s.cmpNo}>
                <small>✗ ASÍ NO</small>
                <p>{x.bad}</p>
              </div>
              <div className={s.cmpYes}>
                <small>✓ MEJOR ASÍ</small>
                <p>{x.good}</p>
              </div>
            </div>
          ))}
        </Card>
      );
    case "phrases":
      return (
        <Card title={b.title} sub="Toca para escucharla en inglés.">
          <div className={s.verbs}>
            {b.items.map((x, i) => (
              <button key={i} type="button" onClick={() => say(x.en)} aria-label={`Escuchar: ${x.en}`}>
                <b lang="en">{x.en}</b>
                <span>{x.es}</span>
                <Ico n="vol" />
              </button>
            ))}
          </div>
        </Card>
      );
    case "glossary":
      return (
        <Card title="Glosario" sub="Palabras que vas a escuchar. Toca para oírlas en inglés.">
          <div className={s.gg}>
            {b.groups.map((g) => (
              <div key={g.name}>
                <h4>{g.name.toUpperCase()}</h4>
                <div className={s.ggr}>
                  {g.items.map((x, i) => (
                    <button key={i} type="button" onClick={() => say(x.en)}>
                      <div>
                        <b lang="en">{x.en}</b>
                        <span>{x.es}</span>
                      </div>
                      <Ico n="vol" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    case "myth":
      return (
        <Card title={b.title ?? "¿Mito o realidad?"}>
          <Binary items={b.items} value={value} onChange={onChange} labels={{ true: "Sí", false: "No" }} />
        </Card>
      );
    case "whatif":
      return (
        <Card title={b.title ?? "¿Y si…?"}>
          <WhatIf items={b.items} value={value} onChange={onChange} />
        </Card>
      );
    case "checklist":
      return (
        <Card title={b.title}>
          <TapCheck items={b.items} value={value} onChange={onChange} doneText={b.done_text} stepHref={stepHref} />
        </Card>
      );
    case "titles":
      return <Titles block={b} />;
    default:
      return null;
  }
}

function Expand({ title, items }: { title?: string; items: { head: string; body: string; icon?: string }[] }) {
  const [op, setOp] = useState(0);
  return (
    <Card title={title}>
      <div className={s.gx}>
        {items.map((x, i) => (
          <div key={i} className={op === i ? s.gxOn : ""}>
            <button type="button" aria-expanded={op === i} onClick={() => setOp(op === i ? -1 : i)}>
              <span className={s.gi}>
                <Ico n={ICON[x.icon ?? ""] ?? "spark"} />
              </span>
              {x.head}
              <span className={s.chev}>
                <Ico n="right" />
              </span>
            </button>
            {op === i && <p>{x.body}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Titles({ block }: { block: Extract<Block, { type: "titles" }> }) {
  const [sel, setSel] = useState(0);
  const t = block.items[sel];
  if (!t) return null;
  return (
    <Card title={block.title} sub={block.intro}>
      <div className={s.ttl}>
        <div className={s.tlist} role="listbox" aria-label={block.title ?? "Títulos"}>
          {block.items.map((x, i) => (
            <button key={i} type="button" role="option" aria-selected={i === sel} onClick={() => setSel(i)}>
              {x.es}
              <Ico n="right" />
            </button>
          ))}
        </div>
        <div className={s.tout} aria-live="polite">
          <small>EN EE.UU. SE DICE</small>
          <div className={s.toutEs}>{t.es}</div>
          {t.options.map(([en, note]) => (
            <div className={s.topt} key={en}>
              <div style={{ minWidth: 0 }}>
                <b lang="en">{en}</b>
                <br />
                <span>{note}</span>
              </div>
              <button type="button" className={s.say2} aria-label={`Escuchar ${en}`} onClick={() => say(en)}>
                <Ico n="vol" />
              </button>
            </div>
          ))}
          {t.note && <div className={s.tctx}>{t.note}</div>}
        </div>
      </div>
    </Card>
  );
}

/** "Para ver más": YouTube thumbnails that play inline (youtube-nocookie) when tapped. */
export function MoreVideos({ list }: { list: MoreVideo[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  // YouTube by id (youtube-nocookie); Wistia by its delivery file, played in place.
  const ok = list.flatMap((m) =>
    m.provider === "wistia"
      ? m.media_url && /^https:\/\/embed-ssl\.wistia\.com\/deliveries\//.test(m.media_url)
        ? [{ ...m, key: m.media_url, wistia: true }]
        : []
      : m.id && /^[A-Za-z0-9_-]{6,}$/.test(m.id)
        ? [{ ...m, key: m.id, wistia: false }]
        : [],
  );
  if (!ok.length) return null;
  const anyWistia = ok.some((m) => m.wistia);
  return (
    <Card title={anyWistia ? "Más videos del paso" : "Para ver más"} sub={anyWistia ? "Los videos de este módulo." : "Videos de YouTube para reforzar el tema. Son opcionales."}>
      <div className={s.mvl}>
        {ok.map((m) =>
          playing === m.key ? (
            <div className={`${s.mv} ${s.mvPlay}`} key={m.key} data-block="more_video">
              <div className={s.th}>
                {m.wistia ? (
                  <video src={m.media_url} controls autoPlay playsInline aria-label={m.title} />
                ) : (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1`} title={m.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                )}
              </div>
              <div>
                <b>{m.title}</b>
                {m.channel && m.channel !== "—" && <span>{m.channel}</span>}
              </div>
            </div>
          ) : (
            <button type="button" className={s.mv} key={m.key} onClick={() => setPlaying(m.key)} data-block="more_video">
              <div className={s.th}>
                {!m.wistia && (
                  /* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail, loaded only here */
                  <img src={`https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
                )}
                <i>
                  <Ico n="play" />
                </i>
              </div>
              <div style={{ minWidth: 0 }}>
                <b>{m.title}</b>
                <span>
                  {m.channel && m.channel !== "—" ? m.channel : m.wistia ? "CelsGLOBAL" : "YouTube"}
                  <em className={s.lg}>{m.lang === "en" ? "EN INGLÉS" : "EN ESPAÑOL"}</em>
                </span>
                {m.about && <p>{m.about}</p>}
              </div>
            </button>
          ),
        )}
      </div>
    </Card>
  );
}
