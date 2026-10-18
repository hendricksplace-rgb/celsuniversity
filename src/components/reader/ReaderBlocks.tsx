"use client";

import { useState } from "react";
import Link from "next/link";
import type { Block, EbookLink, Spoken } from "@/lib/ebook-format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useSignedRef } from "./media";

type T = Dictionary["reader"];
type Props = { block: Block; value: unknown; onChange: (v: unknown) => void; t: T };

const ICONS: Record<string, string> = {
  book: "📘", briefcase: "💼", chat: "💬", check: "✅", clock: "⏰", doc: "📄",
  door: "🚪", money: "💵", shield: "🛡️", spark: "✨", user: "👤",
};

const arr = <V,>(v: unknown, n: number, fill: V): V[] =>
  Array.from({ length: n }, (_, i) => (Array.isArray(v) && v[i] !== undefined ? (v[i] as V) : fill));

export function ReaderBlock({ block, value, onChange, t }: Props) {
  switch (block.type) {
    case "para":
      return <p className="leading-relaxed">{block.text}</p>;

    case "quote":
      return (
        <blockquote className="border-l-4 border-[var(--t-accent)] pl-4 text-lg italic">
          “{block.text}”{block.by && <footer className="t-muted mt-1 text-sm not-italic">— {block.by}</footer>}
        </blockquote>
      );

    case "tip":
      return (
        <aside className="t-card border-l-4 !border-l-[var(--t-accent)]">
          <p className="t-heading mb-1 text-sm">💡 {block.title ?? "Tip"}</p>
          <p className="text-sm leading-relaxed">{block.text}</p>
        </aside>
      );

    case "list":
      return (
        <Section title={block.title}>
          <ul className="list-disc space-y-1 pl-5">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        </Section>
      );

    case "keys":
      return (
        <Section title={block.title}>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.items.map((it, i) => (
              <div key={i} className="t-card t-card-accent">
                <p className="t-heading">{it.title}</p>
                <p className="t-muted mt-1 text-sm">{it.body}</p>
              </div>
            ))}
          </div>
        </Section>
      );

    case "steps":
      return (
        <Section title={block.title}>
          <ol className="space-y-3">
            {block.items.map((it, i) => (
              <li key={i} className="flex gap-3">
                <span className="t-badge h-7 w-7 shrink-0 justify-center !px-0">{i + 1}</span>
                <div>
                  <p className="font-semibold">{it.title}</p>
                  {it.body && <p className="t-muted text-sm">{it.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      );

    case "expand":
    case "whatif": {
      const items =
        block.type === "expand"
          ? block.items.map((it) => ({ head: `${ICONS[it.icon ?? ""] ?? "•"} ${it.title}`, body: it.body }))
          : block.items.map((it) => ({ head: it.q, body: it.a }));
      return (
        <Section title={block.title}>
          <div className="space-y-2">
            {items.map((it, i) => (
              <details key={i} className="t-card group !py-3">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
                  {it.head}
                </summary>
                <p className="t-muted mt-2 text-sm leading-relaxed">{it.body}</p>
              </details>
            ))}
          </div>
        </Section>
      );
    }

    case "myth": {
      const picks = arr<boolean | null>(value, block.items.length, null);
      return (
        <Section title={block.title ?? `${t.myth} / ${t.real}`}>
          <div className="space-y-3">
            {block.items.map((it, i) => {
              const pick = picks[i];
              const set = (v: boolean) => onChange(picks.map((p, j) => (j === i ? v : p)));
              return (
                <div key={i} className="t-card">
                  <p className="font-medium">{it.q}</p>
                  <div className="mt-2 flex gap-2">
                    {[false, true].map((v) => (
                      <button
                        key={String(v)}
                        onClick={() => set(v)}
                        aria-pressed={pick === v}
                        className={pick === v ? "t-btn" : "t-btn-ghost"}
                      >
                        {v ? t.real : t.myth}
                      </button>
                    ))}
                  </div>
                  {pick !== null && (
                    <p className="mt-2 text-sm">
                      <strong>{pick === it.real ? "✅ " : "❌ "}{it.real ? t.itsReal : t.itsMyth}.</strong>{" "}
                      <span className="t-muted">{it.a}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      );
    }

    case "glossary":
      return <Glossary groups={block.groups} t={t} />;

    case "compare":
      return (
        <Section title={block.title}>
          <div className="space-y-3">
            {block.items.map((it, i) => (
              <Compare key={i} bad={it.bad} good={it.good} t={t} />
            ))}
          </div>
        </Section>
      );

    case "phrases":
      return (
        <Section title={block.title}>
          <ul className="divide-y divide-[var(--t-border)]">
            {block.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{it.en}</p>
                  <p className="t-muted text-sm">{it.es}</p>
                </div>
                <Speak text={it.en} lang="en-US" audioRef={it.audio} t={t} />
              </li>
            ))}
          </ul>
        </Section>
      );

    case "say":
      return (
        <Section title={block.title}>
          <ul className="space-y-2">
            {block.items.map((it, i) => (
              <li key={i} className="t-card flex items-start justify-between gap-3 !py-3">
                <span>“{it}”</span>
                <Speak text={it} lang="es-MX" t={t} />
              </li>
            ))}
          </ul>
        </Section>
      );

    case "activity":
      return (
        <div className="t-card t-card-accent">
          <p className="t-heading mb-1 text-sm">✍️ Actividad</p>
          <p className="leading-relaxed">{block.text}</p>
          {block.link && <EbookLinkButton link={block.link} />}
        </div>
      );

    case "checklist": {
      const checked = arr<boolean>(value, block.items.length, false);
      const all = checked.every(Boolean);
      return (
        <Section title={block.title}>
          <ul className="space-y-2">
            {block.items.map((it, i) => (
              <li key={i} className="flex items-start gap-3">
                <input
                  id={`chk-${i}-${it.text.length}`}
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => onChange(checked.map((c, j) => (j === i ? e.target.checked : c)))}
                  className="mt-1 h-5 w-5 accent-[var(--t-accent)]"
                />
                <label htmlFor={`chk-${i}-${it.text.length}`} className="flex-1">
                  {it.text}
                  {it.link && (
                    <>
                      {" "}
                      <Link href={`/app/libros/${it.link.ebook}`} className="t-link text-sm">
                        {it.link.label} →
                      </Link>
                    </>
                  )}
                </label>
              </li>
            ))}
          </ul>
          {all && block.done_text && <p className="t-badge mt-3">🎉 {block.done_text}</p>}
        </Section>
      );
    }

    case "notes": {
      const max = block.max ?? 5;
      const lines = Array.isArray(value) && value.length ? (value as string[]) : Array(block.min ?? 3).fill("");
      return (
        <Section title={block.title} privateNote={t.private}>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <input
                key={i}
                value={line}
                placeholder={i === 0 ? block.placeholder : undefined}
                onChange={(e) => onChange(lines.map((l, j) => (j === i ? e.target.value : l)))}
                className="w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2"
              />
            ))}
            {lines.length < max && (
              <button onClick={() => onChange([...lines, ""])} className="t-btn-ghost text-xs">
                + {t.addLine}
              </button>
            )}
          </div>
        </Section>
      );
    }

    case "reflect":
    case "practice": {
      const prompts = block.type === "reflect" ? block.prompts : block.items;
      const texts = arr<string>(value, prompts.length, "");
      return (
        <Section title={block.title} privateNote={t.private}>
          {block.type === "practice" && block.hint && <p className="t-muted mb-3 text-sm">{block.hint}</p>}
          <div className="space-y-4">
            {prompts.map((p, i) => (
              <label key={i} className="block space-y-1">
                <span className="flex items-start justify-between gap-2 font-medium">
                  {p}
                  {block.type === "practice" && <Speak text={p} lang="es-MX" t={t} />}
                </span>
                <textarea
                  value={texts[i]}
                  rows={3}
                  onChange={(e) => onChange(texts.map((x, j) => (j === i ? e.target.value : x)))}
                  className="w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2"
                />
              </label>
            ))}
          </div>
        </Section>
      );
    }

    case "fields": {
      const texts = arr<string>(value, block.fields.length, "");
      return (
        <Section title={block.title} privateNote={t.private}>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.fields.map((f, i) => (
              <label key={i} className="block space-y-1 text-sm">
                <span className="font-medium">{f.label}</span>
                <input
                  value={texts[i]}
                  onChange={(e) => onChange(texts.map((x, j) => (j === i ? e.target.value : x)))}
                  className="w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2"
                />
              </label>
            ))}
          </div>
        </Section>
      );
    }

    case "plan":
      return <Plan block={block} value={value} onChange={onChange} t={t} />;

    default:
      return null;
  }
}

function Section({ title, privateNote, children }: { title?: string; privateNote?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      {title && <h3 className="t-heading text-lg">{title}</h3>}
      {children}
      {privateNote && <p className="t-muted text-xs">🔒 {privateNote}</p>}
    </section>
  );
}

function EbookLinkButton({ link }: { link: EbookLink }) {
  return (
    <Link href={`/app/libros/${link.ebook}`} className="t-btn-ghost mt-3 text-xs">
      📘 {link.label} →
    </Link>
  );
}

/**
 * Pronunciation: the recorded ElevenLabs file when the item has one (offline cache first),
 * otherwise the device's own voices (Web Speech API), so nothing leaves the browser.
 */
function Speak({ text, lang, audioRef, t }: { text: string; lang: string; audioRef?: string | null; t: T }) {
  const src = useSignedRef(audioRef);
  return (
    <button
      type="button"
      aria-label={t.speak}
      title={t.speak}
      onClick={() => {
        if (src) {
          void new Audio(src).play();
          return;
        }
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }}
      className="t-btn-ghost shrink-0 !px-2 !py-1 text-sm"
    >
      🔊
    </button>
  );
}

/** "Así no" first; the student taps to reveal "Mejor así". */
function Compare({ bad, good, t }: { bad: string; good: string; t: T }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="t-card space-y-3">
      <div className="t-opt-wrong rounded-[var(--t-radius)] border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide">✗ {t.notLikeThis}</p>
        <p className="mt-1">{bad}</p>
      </div>
      {open ? (
        <div className="t-opt-correct rounded-[var(--t-radius)] border p-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide">✓ {t.betterLikeThis}</p>
          <p className="mt-1">{good}</p>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-expanded={open} className="t-btn-ghost w-full">
          👉 {t.tapToSee}
        </button>
      )}
    </div>
  );
}

function Glossary({ groups, t }: { groups: { name: string; items: Spoken[] }[]; t: T }) {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const match = (it: Spoken) => !q || norm(it.en + " " + it.es).includes(norm(q));
  return (
    <section className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search}
        className="w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2"
      />
      {groups.map((g) => {
        const items = g.items.filter(match);
        if (!items.length) return null;
        return (
          <div key={g.name}>
            <h3 className="t-heading mb-2">{g.name}</h3>
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b border-[var(--t-border)] py-1.5 text-sm">
                  <span>
                    <strong>{it.en}</strong> <span className="t-muted">· {it.es}</span>
                  </span>
                  <Speak text={it.en} lang="en-US" audioRef={it.audio} t={t} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function Plan({ block, value, onChange, t }: { block: Extract<Block, { type: "plan" }>; value: unknown; onChange: (v: unknown) => void; t: T }) {
  const [tab, setTab] = useState(0);
  const chosen = (value && typeof value === "object" ? value : {}) as Record<string, number[]>;
  const current = block.tabs[tab];
  const picked = new Set(chosen[current.label] ?? []);
  return (
    <Section title={block.title} privateNote={t.private}>
      <div role="tablist" className="flex flex-wrap gap-2">
        {block.tabs.map((tb, i) => (
          <button key={tb.label} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={tab === i ? "t-btn" : "t-btn-ghost"}>
            {tb.label}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {current.goals.map((g, i) => (
          <li key={i} className="flex items-start gap-3">
            <input
              id={`plan-${tab}-${i}`}
              type="checkbox"
              checked={picked.has(i)}
              onChange={(e) => {
                const next = new Set(picked);
                if (e.target.checked) next.add(i);
                else next.delete(i);
                onChange({ ...chosen, [current.label]: [...next].sort() });
              }}
              className="mt-1 h-5 w-5 accent-[var(--t-accent)]"
            />
            <label htmlFor={`plan-${tab}-${i}`}>{g}</label>
          </li>
        ))}
      </ul>
    </Section>
  );
}
