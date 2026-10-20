// CelsUS teacher guide ("Guía del profesor"): turns a stored teacher_guide block (HTML converted from Gamma) into
// the designed page model (guia-profesor-mockup.html, its enhance() is the reference). The same rules hold for every
// episode; the content is never changed, only grouped. The HTML is sanitized with an allowlist first, then parsed
// into a small tree that React renders as elements (no innerHTML anywhere).
import sanitizeHtml from "sanitize-html";

export type GNode = string | { tag: string; href?: string; kids: GNode[] };
type El = Exclude<GNode, string>;

const ALLOWED = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "strong", "b", "em", "i", "u", "br", "blockquote", "aside", "a", "span", "sub", "sup"];
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED,
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  // Discarded wholesale, with their text.
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math", "template"],
};

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return ENT[e.toLowerCase()] ?? m;
  });

/** sanitize-html's output is well formed and limited to ALLOWED, so a small tokenizer builds the tree. */
export function parseGuideHtml(raw: string): GNode[] {
  const html = sanitizeHtml(raw, SANITIZE);
  const root: El = { tag: "#root", kids: [] };
  const stack: El[] = [root];
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  for (let m: RegExpExecArray | null; (m = re.exec(html)); ) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) {
      top.kids.push(decode(m[4]));
      continue;
    }
    const tag = m[2].toLowerCase();
    if (!ALLOWED.includes(tag)) continue;
    if (m[1]) {
      const at = stack.map((s) => s.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    const el: El = { tag, kids: [] };
    if (tag === "a") {
      const href = /href="([^"]*)"/i.exec(m[3])?.[1];
      if (href) el.href = decode(href);
    }
    top.kids.push(el);
    if (tag !== "br" && !/\/\s*$/.test(m[3])) stack.push(el);
  }
  return root.kids;
}

export const textOf = (n: GNode): string => (typeof n === "string" ? n : n.kids.map(textOf).join(""));

export type GuideCard = {
  kind: "card" | "group" | "no" | "yes";
  group?: "A" | "B" | "C";
  /** The h4's content (not for groups, whose tag replaces it). */
  head: GNode[] | null;
  /** Groups: "Full 128 Questions" (a <p> that holds only a <strong>, or the rest of "Group A — English Only"). */
  line: GNode[] | null;
  body: El[];
};
export type GuideItem =
  | { k: "intro" | "p" | "sub"; kids: GNode[] }
  | { k: "list"; el: El }
  | { k: "cards"; cards: GuideCard[] }
  | { k: "steps"; steps: GNode[][] }
  | { k: "call" | "say"; kids: GNode[] }
  | { k: "agenda"; rows: { from: number; to: number; label: GNode[] }[] };
export type GuideSection = { id: string; n: number; time: string | null; kicker: string | null; title: string; red: boolean; items: GuideItem[] };
export type GuideModel = { title: string | null; lead: GNode[][]; tags: string[]; sections: GuideSection[] };

const RANGE = String.raw`(\d+)\s*[–-]\s*(\d+)`;
const H2_TIME = new RegExp(String.raw`^${RANGE}\s*Min(?:ute)?s?\b\s*(?:[—–:-]\s*)?(.*)$`, "i");
const ONLY_TIME = new RegExp(String.raw`^${RANGE}\s*Min(?:ute)?s?\.?$`, "i");
const P_TIME = new RegExp(String.raw`^${RANGE}\s*min\b\.?\s*(.*)$`, "i");
const GROUP = /^Group\s+([ABC])\b\s*(?:[—–:-]\s*(.+))?$/i;
const isHeading = (t: string) => /^h[1-6]$/.test(t);
const isList = (t: string) => t === "ul" || t === "ol";
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/** A short label with no sentence punctuation ("Segmentation Rules", "0–12 Minutes", "Group A Only"). */
const isLabel = (s: string, max: number) => s.length > 0 && s.length <= max && !/[.!?:;"“”]$/.test(s);
const strongOnly = (el: El) => {
  const kids = el.kids.filter((k) => typeof k !== "string" || k.trim());
  return kids.length === 1 && typeof kids[0] !== "string" && (kids[0].tag === "strong" || kids[0].tag === "b");
};

export function buildGuide(raw: string): GuideModel {
  // Top-level elements; stray text becomes a paragraph.
  const nodes: El[] = parseGuideHtml(raw)
    .map((n) => (typeof n === "string" ? (n.trim() ? { tag: "p", kids: [n] } : null) : n))
    .filter((n): n is El => !!n && n.tag !== "br");
  const txt = (i: number) => (nodes[i] ? clean(textOf(nodes[i])) : "");
  const tag = (i: number) => nodes[i]?.tag ?? "";

  const model: GuideModel = { title: null, lead: [], tags: [], sections: [] };
  let i = 0;
  // Intro: an optional "CelsUS Teacher's Guide" label, the title (h3/h4, or an h2 "Week N – …") and the lead.
  if (tag(0) === "p" && /teacher[’']?s guide/i.test(txt(0)) && txt(0).length < 40) i++;
  if (tag(i) === "h3" || tag(i) === "h4" || (tag(i) === "h2" && /^(week|semana)\s*\d/i.test(txt(i)))) {
    model.title = txt(i);
    i++;
  }

  let sec: GuideSection | null = null;
  let kicker: string | null = null;
  const push = (item: GuideItem) => sec!.items.push(item);
  const lastCards = () => {
    const last = sec!.items[sec!.items.length - 1];
    return last?.k === "cards" ? last : null;
  };
  const kickerAt = (j: number) => (tag(j) === "p" || tag(j) === "h3" || tag(j) === "h5" || tag(j) === "h6") && tag(j + 1) === "h2" && isLabel(txt(j), 48);
  const bare = (j: number) => (tag(j) === "h4" || tag(j) === "h3") && !kickerAt(j) && tag(j + 1) !== "p" && !isList(tag(j + 1)) && !ONLY_TIME.test(txt(j));

  for (; i < nodes.length; i++) {
    const el = nodes[i];
    const t = el.tag;
    const text = txt(i);

    if (kickerAt(i)) {
      kicker = text;
      continue;
    }
    if (t === "h1" || t === "h2") {
      const n = model.sections.length + 1;
      const m = H2_TIME.exec(text);
      const k = kicker ? ONLY_TIME.exec(kicker) : null;
      const time = m ? `${m[1]}–${m[2]} min` : k ? `${k[1]}–${k[2]} min` : null;
      sec = { id: `s${n}`, n, time, kicker: k ? null : kicker, title: (m && m[3]) || text, red: /safeguard/i.test(text), items: [] };
      model.sections.push(sec);
      kicker = null;
      continue;
    }
    if (!sec) {
      // Before the first section: the lead, then any tags ("Facilitator Resource · Week 3 of 12").
      if (isList(t)) model.tags.push(...el.kids.filter((k): k is El => typeof k !== "string" && k.tag === "li").map((li) => clean(textOf(li))));
      else model.lead.push(el.kids);
      continue;
    }

    if (isHeading(t)) {
      const next = nodes[i + 1];
      // Agenda rows: "0–5 Min" + "Welcome & Positioning", or "Spiral Recall" + "0–10 min rapid Q1–100 review".
      const am = ONLY_TIME.exec(text);
      const pm = next?.tag === "p" && !am ? P_TIME.exec(txt(i + 1)) : null;
      if ((am && next?.tag === "p") || pm) {
        const last = sec.items[sec.items.length - 1];
        const agenda = last?.k === "agenda" ? last : ({ k: "agenda", rows: [] } as Extract<GuideItem, { k: "agenda" }>);
        if (agenda !== last) push(agenda);
        if (am) agenda.rows.push({ from: +am[1], to: +am[2], label: next!.kids });
        else agenda.rows.push({ from: +pm![1], to: +pm![2], label: [text, ...(pm![3] ? [` · ${pm![3]}`] : [])] });
        i++;
        continue;
      }
      // A run of headings with nothing under them: numbered steps ("Spiral Review", "New Civics", …). When the run is
      // closed by the section's last heading, that one joins it and its text stays a paragraph.
      if (bare(i) && bare(i + 1)) {
        const steps: GNode[][] = [];
        while (bare(i)) steps.push(nodes[i++].kids);
        const after = tag(i + 2);
        const closes = (tag(i) === "h4" || tag(i) === "h3") && tag(i + 1) === "p" && (!after || after === "h2" || after === "h1");
        if (closes) steps.push(nodes[i++].kids);
        push({ k: "steps", steps });
        i--;
        continue;
      }
      // A heading with no text under it: a small sub-heading.
      if (next?.tag !== "p") {
        push({ k: "sub", kids: el.kids });
        continue;
      }
      const g = GROUP.exec(text);
      const card: GuideCard = g
        ? { kind: "group", group: g[1].toUpperCase() as "A" | "B" | "C", head: null, line: g[2] ? [g[2]] : null, body: [] }
        : { kind: /^❌/.test(text) ? "no" : /^✅/.test(text) ? "yes" : "card", head: el.kids, line: null, body: [] };
      // The card takes its paragraph; a group also takes a second one after a title line ("Full 128 Questions");
      // a paragraph ending in ":" takes the list after it.
      i++;
      if (g && !card.line && strongOnly(nodes[i])) {
        card.line = nodes[i].kids;
        if (tag(i + 1) === "p") card.body.push(nodes[++i]);
      } else card.body.push(nodes[i]);
      if (/:$/.test(txt(i)) && isList(tag(i + 1))) card.body.push(nodes[++i]);
      const grid = lastCards();
      if (grid) grid.cards.push(card);
      else push({ k: "cards", cards: [card] });
      continue;
    }
    if (t === "aside") {
      push({ k: "call", kids: el.kids });
      continue;
    }
    if (t === "blockquote") {
      push({ k: "say", kids: el.kids });
      continue;
    }
    if (isList(t)) {
      push({ k: "list", el });
      continue;
    }
    // Paragraphs: the first one in a section is its intro; a short label right before it ("Group A Only") is a sub-heading.
    const first = sec.items.every((x) => x.k === "sub");
    if (first && sec.items.length === 0 && isLabel(text, 30) && tag(i + 1) === "p") push({ k: "sub", kids: el.kids });
    else push({ k: first ? "intro" : "p", kids: el.kids });
  }
  return model;
}
