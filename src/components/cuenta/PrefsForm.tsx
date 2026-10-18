"use client";

// Preferencias (spec §3): every control saves on change (upsert of the student's own row) and shows
// a small "Guardado" next to it.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Prefs } from "@/lib/prefs";
import { card } from "./ui";

type T = Dictionary["cuenta"];
type Key = keyof Prefs;

export function PrefsForm({ t, userId, initial }: { t: T; userId: string; initial: Prefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState<{ key: Key; ok: boolean } | null>(null);

  const set = async <K extends Key>(key: K, value: Prefs[K]) => {
    const before = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    const row = { user_id: userId, [key]: value, updated_at: new Date().toISOString() } as { user_id: string } & Partial<Prefs>;
    const { error } = await createClient().from("user_preferences").upsert(row, { onConflict: "user_id" });
    if (error) setPrefs((p) => ({ ...p, [key]: before }));
    setSaved({ key, ok: !error });
    setTimeout(() => setSaved((s) => (s?.key === key ? null : s)), 2500);
    // The student area reads sounds, Spanish and text size from the shell.
    if (!error && ["sound_effects", "show_spanish", "autoplay_audio", "text_size"].includes(key)) router.refresh();
  };

  const mark = (key: Key) =>
    saved?.key === key ? (
      <span role="status" className={`text-xs font-bold ${saved.ok ? "text-[#1E7A3A]" : "text-[#C0262D]"}`}>
        {saved.ok ? `✓ ${t.savedSmall}` : t.saveError}
      </span>
    ) : null;

  const toggle = (key: Exclude<Key, "text_size" | "daily_goal_xp">, label: string) => (
    <li className="flex items-center gap-3 py-3">
      <span id={`l-${key}`} className="min-w-0 flex-1 text-[15px] font-semibold">
        {label}
      </span>
      {mark(key)}
      <button
        type="button"
        role="switch"
        aria-checked={prefs[key]}
        aria-labelledby={`l-${key}`}
        onClick={() => void set(key, !prefs[key])}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C] ${prefs[key] ? "bg-[#F5178C]" : "bg-[#D9D3E3]"}`}
      >
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </li>
  );

  const segmented = <K extends "text_size" | "daily_goal_xp">(key: K, label: string, options: { value: Prefs[K]; label: string }[]) => (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span id={`l-${key}`} className="flex-1 text-[15px] font-semibold">
          {label}
        </span>
        {mark(key)}
      </div>
      <div role="radiogroup" aria-labelledby={`l-${key}`} className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-[#F7F5FA] p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={prefs[key] === o.value}
            onClick={() => void set(key, o.value)}
            className={`rounded-full py-2 text-sm font-extrabold transition ${prefs[key] === o.value ? "bg-white text-[#1B1830] shadow" : "text-[#6B6680]"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B6680]">{t.emails}</h2>
        <ul className="divide-y divide-[#F3EFF7]">
          {toggle("email_followups", t.followups)}
          {toggle("email_promotions", t.promotions)}
        </ul>
        <p className="mt-1 text-sm text-[#6B6680]">{t.emailsNote}</p>
      </section>
      <section className={card}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B6680]">{t.learning}</h2>
        <ul className="divide-y divide-[#F3EFF7]">
          {toggle("sound_effects", t.sounds)}
          {toggle("autoplay_audio", t.autoplay)}
          {toggle("show_spanish", t.showEs)}
          {segmented("text_size", t.textSize, [
            { value: "small", label: t.sizes.small },
            { value: "normal", label: t.sizes.normal },
            { value: "large", label: t.sizes.large },
          ])}
          {segmented("daily_goal_xp", t.dailyGoal, [
            { value: 20, label: "20 XP" },
            { value: 50, label: "50 XP" },
            { value: 100, label: "100 XP" },
          ])}
        </ul>
      </section>
      <section className={card}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B6680]">{t.privacy}</h2>
        <ul>{toggle("usage_analytics", t.analytics)}</ul>
      </section>
    </div>
  );
}
