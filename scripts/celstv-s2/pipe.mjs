// CelsTV Section 2 pipeline (eps 10-15): spec -> audio_jobs -> blocks. Same shapes as ep 7 / ep 9.
//   node pipe.mjs jobs  <ep>   list the clips (dry run, prints chars)
//   node pipe.mjs queue <ep>   insert the clips into audio_jobs
//   node pipe.mjs build <ep>   build the 4 blocks from the finished jobs (writes ep<N>.out.json)
//   node pipe.mjs write <ep>   write them to content_blocks
import fs from "fs";
import { get, post, patch } from "./db.mjs";
import { cleanLine } from "./clean.mjs";

export const COURSE = "0928ee68-d20b-4cdf-8e4b-5489ce16b4a3";
const AMY = "OZxMHsGaBmV5pjMIDIn0", BRIAN = "nPczCjzI2devNBz1zQrb";
const pad = (n) => String(n).padStart(2, "0");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const toks = (s) => s.split(/\s+/).filter(Boolean);

import { CLIPS, resetClips } from "./pipe-helpers.mjs";

// ---------- load spec ----------
async function load(ep) {
  resetClips();
  const spec = (await import(`./spec-${ep}.mjs?x=${Date.now()}`)).default;
  const grammar = spec.grammar(); // registers grammar clips
  const g = CLIPS.map((c) => ({ ...c, path: `${COURSE}/grammar-v2/ep-${pad(ep)}/${c.key}.mp3`, kind: "gram_v2" }));
  const ex = spec.verbs.filter((v) => !v[3]).map(([verb, en]) => ({ key: "ex-" + slug(verb), text: en, voice: AMY, kind: "celsbook_example", path: `${COURSE}/celsbook/ep-${pad(ep)}/ex-${slug(verb)}.mp3` }));
  const cc = []; let n = 0;
  spec.cast.forEach(([title, lines], ch) => lines.forEach(([sp, text]) => { n++; cc.push({ key: `cc-${pad(n)}`, n, ch: ch + 1, sp, text, voice: sp === "amy" ? AMY : BRIAN, kind: "celscast", path: `${COURSE}/celscast/ep-${pad(ep)}/${pad(n)}.mp3` }); }));
  const qz = [];
  spec.quiz.forEach((q, i) => {
    const id = i + 1;
    qz.push({ key: `q-${id}`, text: (q.say ?? q.question).replace(/_{2,}/g, "blank").replace(/["“”«»]/g, ""), voice: AMY, kind: "quiz_q", qid: String(id), path: `${COURSE}/quiz/ep-${pad(ep)}/q-${id}.mp3` });
    if (q.listen) qz.push({ key: `listen-${id}`, text: q.listen, voice: BRIAN, kind: "quiz_listen", qid: String(id), path: `${COURSE}/quiz/ep-${pad(ep)}/listen-${id}.mp3` });
  });
  return { spec, grammar, jobs: [...ex, ...g, ...cc, ...qz] };
}

function refOf(ep, j) {
  if (j.kind === "celscast") return { ep, n: j.n, ch: j.ch, sp: j.sp };
  if (j.kind === "gram_v2") return { ep, key: j.key };
  if (j.kind === "quiz_q") return { ep, qid: j.qid };
  if (j.kind === "quiz_listen") return { ep, q: j.qid };
  return { ep };
}

async function cardsOf(ep) {
  const idx = JSON.parse(fs.readFileSync("index.json") /* written by: node dump (see README) */)[ep];
  const l = idx.lessons.find((x) => x.lesson_type === "flashcard");
  const [b] = await get(`content_blocks?lesson_id=eq.${l.id}&block_type=eq.flashcard&select=data`);
  return b.data.settings;
}

const [cmd, epArg] = process.argv.slice(2);
const ep = Number(epArg);
const { spec, grammar, jobs } = await load(ep);
const dup = jobs.map((j) => j.path).filter((p, i, a) => a.indexOf(p) !== i);
if (dup.length) throw new Error("duplicate paths " + dup.join(","));

if (cmd === "jobs") {
  const by = {}; for (const j of jobs) by[j.kind] = (by[j.kind] ?? 0) + 1;
  console.log(`ep ${ep}: ${jobs.length} clips, ${jobs.reduce((a, j) => a + j.text.length, 0)} chars`, by);
  // sanity: verbs and groups exist on the cards
  const cards = await cardsOf(ep); const backs = new Set(cards.map((c) => c.back));
  const miss = [...spec.verbs.map((v) => v[0]), ...spec.groups.flatMap((g) => g[4])].filter((w) => !backs.has(w));
  const words = cards.filter((c) => c.category === "words").length, grouped = spec.groups.flatMap((g) => g[4]).length;
  console.log("missing on cards:", miss.join(", ") || "none", `| words ${words} grouped ${grouped}`);
  for (const q of spec.quiz) if (q.card && !backs.has(q.card)) console.log("quiz card missing:", q.card);
}

if (cmd === "queue") {
  const rows = jobs.map((j) => ({ kind: j.kind, ref: refOf(ep, j), text: j.text, voice_id: j.voice, path: j.path }));
  const have = await get(`audio_jobs?path=in.(${rows.map((r) => `"${r.path}"`).join(",")})&select=path`);
  const fresh = rows.filter((r) => !have.some((h) => h.path === r.path));
  if (fresh.length) await post("audio_jobs", fresh);
  console.log(`queued ${fresh.length} (already there ${have.length})`);
}

if (cmd === "build" || cmd === "write") {
  const done = await get(`audio_jobs?path=in.(${jobs.map((j) => `"${j.path}"`).join(",")})&select=path,status,wt,duration,text`);
  const D = Object.fromEntries(done.map((d) => [d.path, d]));
  const notDone = jobs.filter((j) => D[j.path]?.status !== "done");
  if (notDone.length) throw new Error(`${notDone.length} clips not done: ` + notDone.slice(0, 5).map((j) => j.path.split("/").slice(-2).join("/")).join(","));
  const J = Object.fromEntries(jobs.map((j) => [j.key, { ...j, ...D[j.path] }]));
  const S = (p) => "storage://course-media/" + p;
  const warn = [];
  const resolve = (o) => {
    if (Array.isArray(o)) return o.map(resolve);
    if (!o || typeof o !== "object") return o;
    if (o._r) return S(J[o._r].path);
    if (o._f) return J[o._f].path;
    const out = {};
    for (const [k, v] of Object.entries(o)) { if (k === "_c") { out.audio = S(J[v].path); out.wt = J[v].wt; if (J[v].wt.length !== toks(J[v].text).length) warn.push(`wt ${v}: ${J[v].wt.length} vs ${toks(J[v].text).length}`); } else out[k] = resolve(v); }
    return out;
  };
  const cards = await cardsOf(ep);
  const card = (en) => { const c = cards.find((x) => x.back === en); if (!c) throw new Error("no card " + en); return c; };
  // CelsBook
  const words = []; const groups = spec.groups.map(([key, color, name_en, name_es, list]) => ({ key, color, name_en, name_es,
    items: list.map((w) => { const c = card(w); words.push({ en: c.back, es: c.front, audio: c.back_audio }); return words.length - 1; }) }));
  const reuse = {};
  for (const e of [...new Set(spec.verbs.map((v) => v[3]).filter(Boolean))]) {
    const [b] = await get(`content_blocks?block_type=eq.celsbook&data->cover->>title_en=like.Episode%20${e}:*&select=data`);
    for (const it of b.data.sections.find((s) => s.key === "verbs").items) reuse[`${e}|${it.en}`] = it;
  }
  const verbs = spec.verbs.map(([v, en, es, from]) => { const c = card(v);
    if (from) { const it = reuse[`${from}|${v}`]; if (!it) throw new Error(`no ep ${from} verb ${v}`); return { ...it, en: c.back, es: c.front, audio: c.back_audio }; }
    const j = J["ex-" + slug(v)]; if (j.wt.length !== toks(en).length) warn.push("wt ex " + v);
    return { en: c.back, es: c.front, audio: c.back_audio, example_en: en, example_es: es, example_wt: j.wt, example_audio: S(j.path) }; });
  const phrases = cards.filter((c) => c.category === "phrases").map((c) => ({ en: c.back, es: c.front, ...(c.back_audio ? { audio: c.back_audio } : {}) }));
  const celsbook = { cover: { title_en: `Episode ${ep}: ${spec.title}`, subtitle_en: spec.cover[0], subtitle_es: spec.cover[1] }, groups,
    review: spec.review.map(([q_es, options, answer]) => ({ xp: 10, q_es, answer, options })), version: 2,
    sections: [{ key: "words", items: words, title: "Words That Work", title_es: "Palabras que funcionan" }, { key: "verbs", items: verbs, title: "Verbs That Vibe", title_es: "Verbos con ritmo" }, { key: "phrases", items: phrases, title: "Phrases That Fit", title_es: "Frases a tu medida" }] };
  // Grammar
  const g2 = resolve({ ep, version: 2, ...grammar });
  // CelsCast: join with concat-audio (0.5 s between lines, 1.15 s between chapters)
  let celscast = null;
  const castJobs = jobs.filter((j) => j.kind === "celscast").map((j) => J[j.key]);
  const out = `${COURSE}/celscast/celscast-ep-${pad(ep)}.mp3`;
  if (cmd === "write" || process.env.CONCAT) {
    const ANON = process.env.SUPABASE_ANON_JWT; // legacy anon JWT (public); the edge function needs a JWT
    const tok = (await get("job_tokens?name=eq.audio&select=token"))[0].token;
    const r = await fetch(`https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/concat-audio`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON, "x-job-token": tok },
      body: JSON.stringify({ paths: castJobs.map((j) => j.path), out, gaps_ms: castJobs.map((j, k) => (castJobs[k + 1] && castJobs[k + 1].ch !== j.ch ? 1150 : 500)) }) });
    const res = await r.json(); if (!res.ok) throw new Error("concat " + JSON.stringify(res));
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const chapters = []; castJobs.forEach((j, k) => { if (!k || castJobs[k - 1].ch !== j.ch) chapters.push({ start: res.starts[k], title: spec.cast[chapters.length][0] }); });
    celscast = { audio: S(out), lines: castJobs.map((j, k) => { const c = cleanLine(j.text, j.wt); return { wt: c.wt.map((w) => r3(w + res.starts[k])), text: c.text, start: res.starts[k], speaker: j.sp }; }), title: `CelsCast · Episodio ${ep}`, version: 2, chapters, duration: res.duration, speakers: { amy: "Amy", brian: "Brian" } };
  }
  // Quiz
  const P = (n) => `storage://course-media/${COURSE}/quiz-photos/${n}.jpg`;
  const questions = spec.quiz.map((q, i) => {
    const id = i + 1; const qa = J[`q-${id}`];
    const base = { id, type: q.type, question: q.question, instruction: q.instruction, question_audio: S(qa.path), question_wt: qa.wt };
    if (q.type === "select-image") return { ...base, images: q.images.map(([n, alt]) => ({ alt, url: P(n) })), correctAnswer: q.answer };
    if (q.type === "build") return { ...base, sentence: q.sentence };
    if (q.type === "listen-and-select") { const L = q.card ? { audioUrl: card(q.card).back_audio } : { audioUrl: S(J[`listen-${id}`].path), audio_wt: J[`listen-${id}`].wt }; return { ...base, options: q.options, ...L, correctAnswer: q.answer }; }
    return { ...base, options: q.options, correctAnswer: q.answer };
  });
  const result = { celsbook, grammar: g2, celscast, questions };
  fs.writeFileSync(`ep${ep}.out.json`, JSON.stringify(result));
  console.log(`built ep ${ep}: words ${words.length} verbs ${verbs.length} phrases ${phrases.length} | grammar ${g2.sections.length} sections | quiz ${questions.length}${celscast ? ` | cast ${celscast.duration}s ${celscast.chapters.length} ch` : ""}`);
  if (warn.length) console.log("WARN", warn.join(" ; "));

  if (cmd === "write") {
    const idx = JSON.parse(fs.readFileSync("index.json") /* written by: node dump (see README) */)[ep];
    const L = (t) => idx.lessons.find((x) => x.lesson_type === t || x.title === t);
    const blocksOf = async (l) => get(`content_blocks?lesson_id=eq.${l.id}&select=id,block_type,data`);
    const book = L("CelsBook"), aud = L("CelsAudio"), gram = L("Grammar"), quiz = L("Quiz");
    const B = { book: await blocksOf(book), aud: await blocksOf(aud), gram: await blocksOf(gram), quiz: await blocksOf(quiz) };
    fs.writeFileSync(`ep${ep}.before.json`, JSON.stringify(B)); // backup of what was there
    const base = { teacher_only: false, offline: true, language: "both", sort_order: -1 };
    const up = async (list, type, row) => { const ex = list.find((b) => b.block_type === type); return ex ? patch(`content_blocks?id=eq.${ex.id}`, { data: row.data }) : post("content_blocks", row); };
    await up(B.book, "celsbook", { lesson_id: book.id, block_type: "celsbook", title: "CelsBook interactivo", data: celsbook, ...base });
    await up(B.aud, "celscast", { lesson_id: aud.id, block_type: "celscast", title: "CelsCast", data: celscast, ...base });
    const gb = B.gram.find((b) => b.block_type === "grammar");
    await patch(`content_blocks?id=eq.${gb.id}`, { data: { ...gb.data, v2: g2 } });
    const qb = B.quiz.find((b) => b.block_type === "celstv_quiz");
    const settings = { ...(qb?.data.settings ?? { totalTime: 1200 }), episodeTitle: spec.title, episodeNumber: ep, questions };
    if (qb) await patch(`content_blocks?id=eq.${qb.id}`, { data: { ...qb.data, settings } });
    else await post("content_blocks", { lesson_id: quiz.id, block_type: "celstv_quiz", title: "Quiz", data: { settings }, teacher_only: false, offline: true, language: "both", sort_order: 0 });
    console.log("written ep", ep);
  }
}
