// Shared by Inicio and Progreso: the A1–C2 gauge emblem and the medal icons (no styles of their own).

/** Emoji per medal code (public.badges.code). */
export const MEDAL_ICON: Record<string, string> = {
  first_episode: "🎬",
  streak_3: "🔥",
  streak_7: "🔥",
  streak_30: "🔥",
  evaluation_done: "🎯",
  polyglot: "🗣️",
  reader: "📘",
  first_celscast: "🎧",
  unit_1: "🏁",
  level_up: "📈",
  citizen_ready: "🇺🇸",
  unstoppable: "🏆",
};

export function Gauge({ className, small }: { className?: string; small?: boolean }) {
  const id = small ? "gauge-s" : "gauge-b";
  return small ? (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#FFE600" />
          <stop offset=".55" stopColor="#FFB020" />
          <stop offset="1" stopColor="#00CCFE" />
        </linearGradient>
      </defs>
      <path d="M12 42 A20 20 0 0 1 52 42" fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <line x1="32" y1="42" x2="44" y2="28" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="42" r="4.5" fill="#fff" />
      <text x="32" y="56" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" letterSpacing="1">
        A1–C2
      </text>
    </svg>
  ) : (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#FFE600" />
          <stop offset=".5" stopColor="#FFB020" />
          <stop offset="1" stopColor="#00CCFE" />
        </linearGradient>
      </defs>
      <path d="M30 130 A70 70 0 0 1 170 130" fill="none" stroke={`url(#${id})`} strokeWidth="18" strokeLinecap="round" />
      <line x1="100" y1="130" x2="146" y2="82" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      <circle cx="100" cy="130" r="12" fill="#fff" />
    </svg>
  );
}
