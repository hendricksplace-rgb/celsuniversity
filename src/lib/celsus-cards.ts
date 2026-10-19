// CelsUS "Tarjetas del examen": the episode's English and Spanish decks (content_blocks.data.settings of the
// "CelsUS Episode N: Flashcards" lesson) turned into one deck per exam track, and the "Practicar mis 20
// preguntas" deck from the "Examen 65/20 (2025)" evaluation. Content stays as Cowork wrote it.
import type { createClient } from "@/lib/supabase/server";
import type { CivicsQuestion } from "@/lib/civics";
import type { DeckCard, Track } from "@/components/celsus/Tarjetas";

type Client = Awaited<ReturnType<typeof createClient>>;

/** The 65/20 evaluation ("Examen 65/20 (2025)"): all 20 starred questions with their Spanish audio. */
export const EXAM_6520_ID = "e2bc69b4-99bd-42da-88f7-106ede00f9da";

export type RawCard = { front: string; back: string; front_audio: string | null; back_audio: string | null; no: number | null; starred: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");
function rawCards(v: unknown): RawCard[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof (c as { front?: unknown }).front === "string")
    .map((c) => {
      const no = Number(c.uscis_2025_no);
      return {
        front: str(c.front).trim(),
        back: str(c.back).trim(),
        front_audio: str(c.front_audio) || null,
        back_audio: str(c.back_audio) || null,
        no: Number.isInteger(no) && no > 0 ? no : null,
        starred: c.starred === true || c.starred === "true",
      };
    })
    .filter((c) => c.front);
}

/** The two decks of a flashcards lesson: English (title "… (English)") and Spanish ("… (Español)"). */
export async function loadEpisodeDecks(supabase: Client, lessonId: string) {
  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("title, data, sort_order")
    .eq("lesson_id", lessonId)
    .eq("block_type", "flashcard")
    .eq("teacher_only", false)
    .order("sort_order");
  const list = blocks ?? [];
  const en = list.find((b) => /english|ingl/i.test(b.title ?? "")) ?? list[0];
  const es = list.find((b) => b !== en && /español|espanol|spanish/i.test(b.title ?? "")) ?? list.find((b) => b !== en);
  const settings = (b: (typeof list)[number] | undefined) => (b?.data as { settings?: unknown } | null)?.settings;
  return { en: rawCards(settings(en)), es: rawCards(settings(es)) };
}

const answers = (back: string) =>
  back
    .split(/\s*;\s*/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);

/** The Spanish card for an English one: same 2025 number when both have one, else the same position. */
function pair(en: RawCard[], es: RawCard[]) {
  return en.map((c, i) => (c.no ? (es.find((x) => x.no === c.no) ?? es[i]) : es[i]) ?? null);
}

/** One deck per track. A: English with the Spanish line; B: Spanish; C: the starred cards, in Spanish. */
export function tracksFromDecks(en: RawCard[], es: RawCard[]): Record<Track, DeckCard[]> {
  const esFor = pair(en, es);
  const key = (c: RawCard, i: number) => (c.no ? String(c.no) : `p${i + 1}`);
  const A: DeckCard[] = en.map((c, i) => ({
    key: key(c, i),
    no: c.no,
    starred: c.starred || !!esFor[i]?.starred,
    q: c.front,
    a: answers(c.back),
    qAudio: c.front_audio,
    aAudio: c.back_audio,
    es: esFor[i] ? { q: esFor[i]!.front, a: esFor[i]!.back } : null,
  }));
  const spanish = es.length ? es : en;
  const B: DeckCard[] = spanish.map((c, i) => ({
    key: key(c, i),
    no: c.no,
    starred: c.starred,
    q: c.front,
    a: answers(c.back),
    qAudio: c.front_audio,
    aAudio: c.back_audio,
  }));
  // Starred in either deck, once per 2025 number.
  const starredNos = new Set([...en, ...es].filter((c) => c.starred && c.no).map((c) => c.no!));
  const seen = new Set<string>();
  const C = B.filter((c, i) => {
    const on = c.starred || (c.no !== null && starredNos.has(c.no)) || (!c.no && en[i]?.starred);
    if (!on || seen.has(c.key)) return false;
    seen.add(c.key);
    return true;
  }).map((c) => ({ ...c, starred: true }));
  return { A, B, C };
}

/** Starred cards in the episode, deduped across English and Spanish by uscis_2025_no. */
export function starredCount(en: RawCard[], es: RawCard[]) {
  const nos = new Set<string>();
  [...en, ...es].forEach((c, i) => c.starred && nos.add(c.no ? String(c.no) : `p${i % Math.max(1, en.length)}`));
  return nos.size;
}

/** Every audio ref in the decks. */
export const deckAudioRefs = (decks: Record<Track, DeckCard[]>) =>
  new Set(
    Object.values(decks)
      .flat()
      .flatMap((c) => [c.qAudio, c.aAudio])
      .filter((r): r is string => !!r),
  );

/** "Practicar mis 20 preguntas": the 65/20 evaluation's questions, in Spanish, with the Spanish question audio. */
export function twentyDeck(questions: CivicsQuestion[]): DeckCard[] {
  return questions
    .filter((q) => q.star)
    .sort((a, b) => a.n - b.n)
    .map((q) => ({
      key: String(q.n),
      no: q.n,
      starred: true,
      q: q.q_es || q.q_en,
      a: q.type === "check_online" ? [] : q.answers_es.length ? q.answers_es : q.answers_en,
      note: q.type === "check_online" ? { text: q.note_es, link: q.link } : undefined,
      qAudio: q.audio.q_es ?? q.audio.q ?? null,
      // Answers are recorded in English only (audio.a_en): the Spanish deck has no answer audio yet.
      aAudio: null,
    }));
}
