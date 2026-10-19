// CelsUS two-color icons (navy #0E2547 / #1E4E8C, gold #F2C230, red #C8102E), copied from the approved
// mockup (celsus-episodio-mockup.html, v2). Decorative: the label next to each icon carries the meaning.
type P = { className?: string };
const svg = { viewBox: "0 0 48 48", "aria-hidden": true, focusable: false } as const;
const label = { textAnchor: "middle", fontWeight: 800, fontFamily: "sans-serif" } as const;

/** Video: a TV with a gold play button and a red star. */
export function IconVideo({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <rect x="5" y="9" width="38" height="26" rx="6" fill="#0E2547" />
      <rect x="9" y="13" width="30" height="18" rx="3" fill="#1E4E8C" />
      <path d="M21 17v10l9-5z" fill="#F2C230" />
      <path d="M18 41h12" stroke="#C8102E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 35v6" stroke="#0E2547" strokeWidth="3" />
      <circle cx="38" cy="9" r="5" fill="#C8102E" />
      <path d="M38 6.3l.8 1.7 1.9.2-1.4 1.2.4 1.8-1.7-1-1.7 1 .4-1.8-1.4-1.2 1.9-.2z" fill="#fff" />
    </svg>
  );
}

/** Tarjetas: stacked cards with "A" and "¿?". */
export function IconCards({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <rect x="14" y="5" width="26" height="32" rx="5" transform="rotate(10 27 21)" fill="#F2C230" />
      <rect x="7" y="10" width="26" height="33" rx="5" fill="#fff" stroke="#0E2547" strokeWidth="3" />
      <text x="20" y="31" fontSize="15" fill="#0E2547" {...label}>
        A
      </text>
      <text x="27" y="22" fontSize="9" fill="#C8102E" {...label}>
        ¿?
      </text>
    </svg>
  );
}

/** CelsBook: an open book with sound waves (Amy's voice). */
export function IconBook({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 12c6-3 13-3 19 1v26c-6-4-13-4-19-1z" fill="#fff" stroke="#0E2547" strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 12c-6-3-13-3-19 1v26c6-4 13-4 19-1z" fill="#fff" stroke="#0E2547" strokeWidth="3" strokeLinejoin="round" />
      <path d="M23 13h2v26h-2z" fill="#F2C230" />
      <path d="M9 19h9M9 24h9M30 19h9M30 24h6" stroke="#1E4E8C" strokeWidth="2" strokeLinecap="round" />
      <path d="M33 31c2 1.5 2 4 0 5.5M36.5 29c3.5 3 3.5 8 0 11" stroke="#C8102E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** CelsAudio: headphones with gold ear cups and red sound bars. */
export function IconAudio({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <path d="M8 28v-4a16 16 0 0 1 32 0v4" fill="none" stroke="#0E2547" strokeWidth="4" strokeLinecap="round" />
      <rect x="5" y="25" width="10" height="15" rx="4" fill="#F2C230" stroke="#0E2547" strokeWidth="2.5" />
      <rect x="33" y="25" width="10" height="15" rx="4" fill="#F2C230" stroke="#0E2547" strokeWidth="2.5" />
      <path d="M20 30v6M24 27v12M28 30v6" stroke="#C8102E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Clase grabada del Abogado Miguel: a person with a gold tie, a red play badge and gold scales. */
export function IconLive({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <circle cx="20" cy="15" r="8" fill="#0E2547" />
      <path d="M5 42c0-9 7-15 15-15s15 6 15 15z" fill="#0E2547" />
      <path d="M20 27l-3 7 3 6 3-6z" fill="#F2C230" />
      <circle cx="37" cy="13" r="9" fill="#C8102E" />
      <path d="M34.5 9.5v7l6-3.5z" fill="#fff" />
      <path d="M33 42h12" stroke="#F2C230" strokeWidth="3" strokeLinecap="round" />
      <path d="M39 30v12M34 32h10" stroke="#F2C230" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 32l-2.5 5h5zM44 32l-2.5 5h5z" fill="#F2C230" />
    </svg>
  );
}

/** Quiz: a clipboard with gold checks and a red star badge. */
export function IconQuiz({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <rect x="8" y="7" width="30" height="37" rx="5" fill="#fff" stroke="#0E2547" strokeWidth="3" />
      <rect x="16" y="3" width="14" height="8" rx="3" fill="#0E2547" />
      <path d="M14 20l3 3 5-6M14 31l3 3 5-6" stroke="#F2C230" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 21h7M26 32h7" stroke="#1E4E8C" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="38" r="8" fill="#C8102E" />
      <path d="M38 33.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#fff" />
    </svg>
  );
}

/** Lectura y escritura: a page and a gold pencil. */
export function IconWriting({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <rect x="6" y="6" width="28" height="36" rx="4" fill="#fff" stroke="#0E2547" strokeWidth="3" />
      <path d="M12 15h16M12 21h16M12 27h10" stroke="#1E4E8C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 18L26 34l-6 2 2-6 16-16z" fill="#F2C230" stroke="#0E2547" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Repaso: a circular arrow around a gold check. */
export function IconReview({ className }: P) {
  return (
    <svg {...svg} className={className}>
      <path d="M40 24a16 16 0 1 1-5-11.6" fill="none" stroke="#0E2547" strokeWidth="4" strokeLinecap="round" />
      <path d="M36 4v10H26" fill="none" stroke="#0E2547" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="9" fill="#F2C230" />
      <path d="M19.5 24l3 3 6-6" stroke="#0E2547" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Tarjetas para imprimir: a printer with an "EN" or "ES" sheet. */
export function IconPrinter({ className, lang }: P & { lang: "EN" | "ES" }) {
  return (
    <svg {...svg} className={className}>
      <path d="M13 16V5h22v11" fill="#fff" stroke="#0E2547" strokeWidth="3" strokeLinejoin="round" />
      <rect x="4" y="16" width="40" height="18" rx="5" fill="#0E2547" />
      <rect x="12" y="28" width="24" height="16" rx="2" fill="#fff" stroke="#0E2547" strokeWidth="3" />
      <text x="24" y="40" fontSize="10" fill={lang === "EN" ? "#C8102E" : "#1F7A4D"} {...label}>
        {lang}
      </text>
      <circle cx="37" cy="22" r="2.5" fill="#F2C230" />
    </svg>
  );
}
