export const AMY = "OZxMHsGaBmV5pjMIDIn0", BRIAN = "nPczCjzI2devNBz1zQrb";
const toks = (s) => s.split(/\s+/).filter(Boolean);
// ---------- spec helpers (markers resolved after the audio exists) ----------
export const CLIPS = [];
export const resetClips = () => { CLIPS.length = 0; };
const reg = (key, text, voice = AMY, dir = "grammar-v2") => { CLIPS.push({ key, text, voice, dir }); return key; };
export const C = (key, text) => ({ _c: reg(key, text) });          // spreads {audio, wt}
export const R = (key, text) => ({ _r: reg(key, text) });          // -> "storage://..." string
export const F = (key, text) => ({ _f: reg(key, text) });          // -> raw path (hear_pick files)
export const para = (key, en, es) => ({ t: "para", en, es, ...C(key, en) });
export const examples = (prefix, list) => ({ t: "examples", items: list.map((en, i) => ({ en, ...C(`${prefix}-x${i + 1}`, en) })), label_en: "Examples", label_es: "Ejemplos" });
export const pairs = (prefix, list) => ({ t: "pairs", items: list.map(([a, b], i) => ({ a, b, ...C(`${prefix}-x${i + 1}`, `${a} ${b}`) })) });
export const build = (sentence, en = "Put the words in order.", es = "Ordena las palabras para formar la oración.") =>
  ({ en, es, type: "build", sentence, ...C("s1-build", sentence), audio_inst: R("s1-bi", en) });
export const choose = (key, q_en, q_es, options, correct, why_en, why_es) =>
  ({ type: "choose", q_en, q_es, q_audio: R(`${key}-q`, q_en), why_en, why_es, why_audio: R(`${key}-why`, why_en), options: options.map((text, i) => ({ text, correct: i === correct })) });
export const fill = (key, items) => ({ type: "fill", items: items.map(([before, correct, after, options], i) =>
  ({ before, correct, after, options, ...C(`${key}-f${i + 1}`, [before, correct, after].filter(Boolean).join(" ")) })) });
export const hearPick = (sentence, word, words, correct = 0) => ({
  type: "hear_pick", en: "Listen to each option and choose the word that completes the sentence.", es: "Escucha cada opción y elige la palabra que completa la oración.",
  sentence, word, files: words.map((w, i) => F(`s4-w${i + 1}`, w[0].toUpperCase() + w.slice(1) + ".")), correct,
  ...C("s4-sent", sentence), audio_inst: R("s4-hi", "Listen to each option and choose the word that completes the sentence."),
});
/** Reading: highlights found in order, each a whole token (trailing punctuation stays with it). */
export function reading(en, es, text, hls) {
  const T = toks(text); const segs = []; let i = 0;
  for (const h of hls) {
    const H = toks(h); let j = i;
    const bare = (w) => w.replace(/[.,!?:;]+$/, "");
    while (j < T.length && !(H.every((w, k) => (k === H.length - 1 ? bare(T[j + k] ?? "") : T[j + k]) === w))) j++;
    if (j >= T.length) throw new Error(`reading: "${h}" not found after token ${i}`);
    segs.push({ before: T.slice(i, j).join(" "), hl: T.slice(j, j + H.length).join(" "), after: "" });
    i = j + H.length;
  }
  if (segs.length) segs[segs.length - 1].after = T.slice(i).join(" ");
  if (segs.map((s) => [s.before, s.hl, s.after].filter(Boolean).join(" ")).join(" ") !== T.join(" ")) throw new Error("reading rebuild differs");
  return { t: "reading", en, es, text, sentences: segs, ...C("s5-read", text), audio_desc: R("s5-d", en) };
}
export const phonics = (en, es, families) => ({ t: "phonics", en, es, audio_desc: R("s6-d", en),
  families: families.map(([fen, fes, words], f) => ({ en: fen, es: fes, words: words.map(([w, ipa, say], k) => ({ w, ipa, say: null, ...C(`s6-f${f + 1}w${k + 1}`, say ?? (/[.!?]$/.test(w) ? w : w + ".")) })) })) });

