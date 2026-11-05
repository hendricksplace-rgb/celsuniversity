// C-045: one helper for database text in the student's language. Rows carry an `_en` column next to each
// student-facing text (title_en, body_en, label_en, description_en, subtitle_en) and a `language` track flag
// ('es' | 'en' | 'both'). In English mode a CelsUS screen shows the `_en` value; when it is missing it falls back
// to the original only if that already reads as English, otherwise it still shows the original (nothing goes
// blank) but warns in development, and the row appears in the public.i18n_missing view so Cowork can write it.
import type { Lang } from "./dictionaries";

type Row = Record<string, unknown> | null | undefined;

/** Accents, ¿ ¡ or a common Spanish word: this text is not English. */
const SPANISH = /[áéíóúñ¿¡]|\b(del|los|las|el|la|semana|preguntas|examen|episodio|tarjetas|descargar|recursos|evaluación|abogado|subtitulada|imprimibles)\b/i;
export const looksSpanish = (s: string) => SPANISH.test(s);

/** `row[field]` in `lang`: `row[field + "_en"]` in English mode, with the fallback rule above. */
export function tr(row: Row, field: string, lang: Lang): string | null {
  const base = row?.[field];
  const original = typeof base === "string" ? base : null;
  if (lang !== "en" || !row) return original;
  const en = row[`${field}_en`];
  if (typeof en === "string" && en.trim()) return en;
  if (original && looksSpanish(original) && process.env.NODE_ENV !== "production") {
    console.warn(`[i18n] missing English for ${field}: "${original.slice(0, 80)}" (see public.i18n_missing)`);
  }
  return original;
}

/** Whether a row on a language track shows in `lang`: English mode hides the Spanish track ('es'). */
export const inLanguage = (row: { language?: string | null } | null | undefined, lang: Lang) => lang !== "en" || row?.language !== "es";

/** "Pregunta en español / Question in English" → the side in `lang` (bilingual one-liners). */
export function bilingualHalf(s: string, lang: Lang) {
  const parts = s.split(/\s+\/\s+/);
  if (parts.length !== 2) return s;
  const [a, b] = parts;
  const aEs = looksSpanish(a);
  if (lang === "en") return aEs ? b : a;
  return aEs ? a : b;
}
