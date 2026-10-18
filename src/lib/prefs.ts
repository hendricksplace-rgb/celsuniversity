// Cuenta → Preferencias (public.user_preferences). No row means every default below.
export type Prefs = {
  email_followups: boolean;
  email_promotions: boolean;
  usage_analytics: boolean;
  sound_effects: boolean;
  autoplay_audio: boolean;
  show_spanish: boolean;
  text_size: "small" | "normal" | "large";
  daily_goal_xp: number;
};

export const DEFAULT_PREFS: Prefs = {
  email_followups: true,
  email_promotions: true,
  usage_analytics: true,
  sound_effects: true,
  autoplay_audio: true,
  show_spanish: true,
  text_size: "normal",
  daily_goal_xp: 50,
};

/** A user_preferences row (or part of one) with the defaults filled in. */
export function withDefaults(row: Partial<Record<keyof Prefs, unknown>> | null | undefined): Prefs {
  const out = { ...DEFAULT_PREFS, ...(row ?? {}) } as Prefs;
  if (!["small", "normal", "large"].includes(out.text_size)) out.text_size = "normal";
  return out;
}

/**
 * The learning preferences as the student area's root carries them (data-sound, data-es, data-autoplay,
 * set by AppShell). Client-only; outside the app (or before hydration) the defaults apply.
 */
export function clientPref(name: "sound" | "es" | "autoplay"): boolean {
  if (typeof document === "undefined") return true;
  const v = (document.querySelector("[data-prefs]") as HTMLElement | null)?.dataset[name];
  return v !== "off";
}
