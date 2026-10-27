// CelsTV quiz: the episode's questions (celstv_quiz) in 5 formats. Image and listening questions come
// as they are; two sentence answers become "build the sentence" and "remove the extra word", and four
// of the episode's CelsCards become "match the pairs". Same order for everyone on the same episode.

/** Amy's recording of the question, with the start time (s) of each word for the highlight. */
export type Voice = { url: string; ref?: string; wt: number[] } | null;

export type QuizQ =
  | { kind: "picture"; prompt: string; voice?: Voice; options: { img: string | null; ref: string | null; alt: string }[]; answer: number }
  | { kind: "listen"; prompt: string; voice?: Voice; audio: string | null; audioRef?: string; options: string[]; answer: number }
  | { kind: "choose"; prompt: string; voice?: Voice; options: string[]; answer: number }
  | { kind: "build"; prompt: string; voice?: Voice; tiles: string[]; answer: string[] }
  | { kind: "extra"; prompt: string; tiles: string[]; extra: number }
  | { kind: "match"; pairs: { es: string; en: string }[]; right: string[] };

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const sentenceWords = (s: string) => s.trim().split(/\s+/);
const isSentence = (s: string) => /[.!?]$/.test(s.trim()) && sentenceWords(s).length >= 3 && sentenceWords(s).length <= 9;
const bare = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

export function buildQuiz(settings: unknown, cards: { front: string; back: string; category?: string }[], resolve: (ref: unknown) => string | null, seed: string): QuizQ[] {
  const raw = arr((settings as Raw | null)?.questions) as Raw[];
  const out: QuizQ[] = [];
  let built = false;
  let extra = false;
  raw.forEach((q, i) => {
    const prompt = str(q.question);
    const answer = Number(q.correctAnswer ?? 0);
    const options = arr(q.options).map(str);
    const url = q.question_audio ? resolve(q.question_audio) : null;
    const voice: Voice = url ? { url, ref: str(q.question_audio) || undefined, wt: arr(q.question_wt).map(Number) } : null;
    if (q.type === "select-image") {
      const imgs = arr(q.images) as Raw[];
      if (imgs.length) out.push({ kind: "picture", prompt, voice, options: imgs.map((m) => ({ img: resolve(m.url), ref: str(m.url) || null, alt: str(m.alt) })), answer });
      return;
    }
    if (q.type === "listen-and-select") {
      out.push({ kind: "listen", prompt: prompt || "What did you hear?", voice: prompt ? voice : null, audio: resolve(q.audioUrl), audioRef: str(q.audioUrl) || undefined, options, answer });
      return;
    }
    if (q.type !== "select-text" || !options.length) return;
    const right = options[answer] ?? "";
    if (!built && isSentence(right)) {
      built = true;
      const words = sentenceWords(right);
      out.push({ kind: "build", prompt, voice, tiles: shuffle(words, `${seed}:b${i}`), answer: words });
      return;
    }
    if (built && !extra && isSentence(right)) {
      // A word from a wrong option that isn't in the answer, slipped in after the first word.
      const have = new Set(sentenceWords(right).map(bare));
      const intruder = options
        .filter((_, k) => k !== answer)
        .flatMap(sentenceWords)
        .find((w) => bare(w) && !have.has(bare(w)));
      if (intruder) {
        extra = true;
        const words = sentenceWords(right);
        const at = 1 + (Math.abs([...seed].reduce((h, c) => h * 31 + c.charCodeAt(0), i)) % (words.length - 1));
        const tiles = [...words.slice(0, at), intruder.replace(/[.!?,]$/, ""), ...words.slice(at)];
        out.push({ kind: "extra", prompt: "", tiles, extra: at });
        return;
      }
    }
    out.push({ kind: "choose", prompt, voice, options, answer });
  });

  const pool = cards.filter((c) => c.front && c.back && c.front.toLowerCase() !== c.back.toLowerCase());
  const words = pool.filter((c) => c.category === "words");
  const pick = shuffle(words.length >= 4 ? words : pool, `${seed}:m`).slice(0, 4);
  if (pick.length >= 3) {
    const pairs = pick.map((c) => ({ es: c.front, en: c.back }));
    out.splice(Math.min(3, out.length), 0, {
      kind: "match",
      pairs,
      right: shuffle(
        pairs.map((p) => p.en),
        `${seed}:r`,
      ),
    });
  }
  return out;
}
