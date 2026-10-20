// CelsUS teacher guide page (guia-profesor-mockup.html): "Modo profesor" bar, navy hero with the gold badge, a
// sticky "En esta guía" table of contents (chips on phones) and the guide's sections as cards. Built from the
// model in lib/teacher-guide.ts; the stored HTML is never injected.
import "./teacher-guide.css";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { GNode, GuideCard, GuideItem, GuideModel } from "@/lib/teacher-guide";
import { GuideToc } from "./GuideToc";

type T = Dictionary["guide"];
const AGENDA = ["#1E4E8C", "#F2C230", "#C8102E", "#21C7A8", "#7B61FF", "#E8A21A", "#0E2547"];

/** Renders the sanitized tree as React elements (allowlisted tags only; text is escaped by React). */
function Rich({ nodes }: { nodes: GNode[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <Node key={i} n={n} />
      ))}
    </>
  );
}
function Node({ n }: { n: GNode }) {
  if (typeof n === "string") return n;
  const kids = <Rich nodes={n.kids} />;
  switch (n.tag) {
    case "p":
      return <p>{kids}</p>;
    case "strong":
    case "b":
      return <strong>{kids}</strong>;
    case "em":
    case "i":
      return <em>{kids}</em>;
    case "u":
      return <u>{kids}</u>;
    case "sub":
      return <sub>{kids}</sub>;
    case "sup":
      return <sup>{kids}</sup>;
    case "br":
      return <br />;
    case "ul":
      return <ul>{kids}</ul>;
    case "ol":
      return <ol>{kids}</ol>;
    case "li":
      return <li>{kids}</li>;
    case "a":
      return n.href ? (
        <a href={n.href} target="_blank" rel="noopener noreferrer">
          {kids}
        </a>
      ) : (
        kids
      );
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return (
        <p>
          <strong>{kids}</strong>
        </p>
      );
    case "blockquote":
    case "aside":
      return <div>{kids}</div>;
    default:
      return kids;
  }
}

function Card({ card, t }: { card: GuideCard; t: T }) {
  if (card.kind === "group") {
    const g = card.group!;
    return (
      <div className={`c g g${g}`}>
        <span className="gl">
          <b aria-hidden>{g}</b>
          {t.group.replace("{g}", g)}
        </span>
        {card.line && (
          <p className="gt">
            <Rich nodes={card.line} />
          </p>
        )}
        <Rich nodes={card.body} />
      </div>
    );
  }
  return (
    <div className={`c${card.kind === "card" ? "" : ` ${card.kind}`}`}>
      {card.head && (
        <h4>
          <Rich nodes={card.head} />
        </h4>
      )}
      <Rich nodes={card.body} />
    </div>
  );
}

function Item({ item, t }: { item: GuideItem; t: T }) {
  switch (item.k) {
    case "intro":
      return (
        <p className="intro">
          <Rich nodes={item.kids} />
        </p>
      );
    case "p":
      return (
        <p className="tx">
          <Rich nodes={item.kids} />
        </p>
      );
    case "sub":
      return (
        <h3 className="sub">
          <Rich nodes={item.kids} />
        </h3>
      );
    case "list":
      return <Node n={item.el} />;
    case "cards":
      return (
        <div className="cards">
          {item.cards.map((c, i) => (
            <Card key={i} card={c} t={t} />
          ))}
        </div>
      );
    case "steps":
      return (
        <ol className="steps">
          {item.steps.map((s, i) => (
            <li key={i}>
              <span aria-hidden>{i + 1}</span>
              <div>
                <Rich nodes={s} />
              </div>
            </li>
          ))}
        </ol>
      );
    case "call":
      return (
        <div className="call">
          <span className="ic" aria-hidden>
            💡
          </span>
          <div>
            <small>{t.call}</small>
            <Rich nodes={item.kids} />
          </div>
        </div>
      );
    case "say":
      return (
        <div className="say">
          <small>{t.say}</small>
          <Rich nodes={item.kids} />
        </div>
      );
    case "agenda": {
      const total = item.rows.reduce((s, r) => s + Math.max(0, r.to - r.from), 0) || 60;
      return (
        <div className="agenda">
          <div className="abar" aria-hidden>
            {item.rows.map((r, i) => (
              <i key={i} style={{ width: `${(Math.max(0, r.to - r.from) / Math.max(60, total)) * 100}%`, background: AGENDA[i % AGENDA.length] }} />
            ))}
          </div>
          <ol className="alist">
            {item.rows.map((r, i) => (
              <li className="ai" key={i}>
                <span style={{ background: AGENDA[i % AGENDA.length], color: AGENDA[i % AGENDA.length] === "#F2C230" ? "#0E2547" : "#fff" }}>
                  {r.from}–{r.to} min
                </span>
                <div>
                  <Rich nodes={r.label} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }
  }
}

export function TeacherGuide({ model, t, backHref, backLabel, crumb, fallbackTitle }: { model: GuideModel; t: T; backHref: string; backLabel: string; crumb: string; fallbackTitle: string }) {
  return (
    <div className="tg">
      <div className="tg-bar">
        <span>CelsUS · {t.title}</span>
        <span className="role">{t.mode}</span>
      </div>
      <header className="hero">
        <svg className="mark" viewBox="0 0 48 48" aria-hidden>
          <rect x="8" y="7" width="30" height="37" rx="5" fill="none" stroke="#FFE27A" strokeWidth="3" />
          <rect x="16" y="3" width="14" height="8" rx="3" fill="#FFE27A" />
          <path d="M14 20l3 3 5-6M14 31l3 3 5-6" stroke="#FFE27A" strokeWidth="3" fill="none" />
        </svg>
        <div className="wrap">
          <div className="crumbs">
            <Link href={backHref}>
              <i aria-hidden>‹</i>
              {backLabel}
            </Link>
            <span>{crumb}</span>
          </div>
          <p className="badge">{t.badge}</p>
          <h1>{model.title ?? fallbackTitle}</h1>
          {model.lead.map((l, i) => (
            <p className="lead" key={i}>
              <Rich nodes={l} />
            </p>
          ))}
          <div className="meta">
            {t.chips.map((c) => (
              <span key={c}>{c}</span>
            ))}
            {model.tags.map((c) => (
              <span key={c} lang="en">
                {c}
              </span>
            ))}
          </div>
        </div>
      </header>
      <div className="main">
        <GuideToc sections={model.sections.map((s) => ({ id: s.id, title: s.title, time: s.time }))} t={{ toc: t.toc, print: t.print, top: t.top }} />
        <article className="doc" lang="en">
          {model.sections.map((s) => (
            <section key={s.id} id={s.id} className={`sec${s.red ? " red" : ""}`} aria-labelledby={`${s.id}-h`}>
              {s.kicker && <p className="kick">{s.kicker}</p>}
              <div className="sh">
                <span className="num" aria-hidden>
                  {s.n}
                </span>
                {s.time && <span className="time">⏱ {s.time}</span>}
                <h2 id={`${s.id}-h`}>{s.title}</h2>
              </div>
              {s.items.map((it, i) => (
                <Item key={i} item={it} t={t} />
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

/** "No access" for a guide (students, or anyone outside the teacher and admin roles). */
export function LockedCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-[#ECE8DC] bg-white p-8 text-center shadow-[0_14px_34px_rgba(10,29,61,.07)]">
      <p className="text-4xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-3 font-serif text-2xl font-bold text-[#0E2547]">{title}</h1>
      <p className="mt-2 text-base text-[#2E3A52]">{text}</p>
      <Link href={href} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[#0E2547] px-5 font-extrabold text-white">
        {cta}
      </Link>
    </div>
  );
}
