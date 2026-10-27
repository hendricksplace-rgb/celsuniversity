import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, dictionaries, isLang, type Lang } from "./dictionaries";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export async function getDictionary() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}

/** The language the student picked with the ES/EN toggle, or null if they never picked one. */
export async function getLangChoice(): Promise<Lang | null> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : null;
}
