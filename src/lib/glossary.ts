// CelsBSNS Course Dictionary (celsu-celsbsns-dictionary-brief.md): the entries are parsed at runtime from the
// "Course Dictionary" lesson text (content_blocks.body); nothing is hard-coded here.

/** The lesson whose text is the dictionary, and the old Kajabi "attachment" note that the page replaces. */
export const DICTIONARY_LESSON_ID = "19d120eb-04c7-4ae8-b596-ab40f3f18ec4";
export const DICTIONARY_OLD_LESSON_ID = "f3971028-9a99-4abc-9161-c53dfb9a4595";
export const isDictionaryLesson = (id: string) => id === DICTIONARY_LESSON_ID || id === DICTIONARY_OLD_LESSON_ID;
/** Lessons students never see in lists (the old note redirects to the Dictionary if opened by link). */
export const HIDDEN_FROM_STUDENTS = new Set([DICTIONARY_OLD_LESSON_ID]);
export const dictionaryPath = (slug: string) => `/app/cursos/${slug}/diccionario`;

export type Term = { en: string; es: string; def: string; L: string; star: boolean };
export type Parsed = { title: string; sub: string; items: Term[] };

/** Accents and capitals ignored ("etica" finds "Ética"). */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Term – Spanish: definition"; line 1 is the title, line 2 the subtitle, single capital letters are headings. */
export function parse(raw: string): Parsed {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Term[] = [];
  for (const ln of lines.slice(2)) {
    if (/^[A-Z]$/.test(ln)) continue;
    const m = ln.match(/^(.+?)\s+[–—-]\s+(.+?):\s*(.+)$/);
    if (!m) continue;
    out.push({ en: m[1], es: m[2], def: m[3], L: norm(m[1])[0]!.toUpperCase(), star: /\(STAR\)/.test(m[1]) });
  }
  return { title: lines[0] ?? "", sub: lines[1] ?? "", items: out };
}
