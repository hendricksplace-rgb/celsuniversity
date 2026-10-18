/**
 * End-of-exam stamp: a slightly rotated gold seal with the ring text, a star and the score.
 * Grey when the exam wasn't passed. No confetti.
 */
export function Seal({ passed, ring, score, label }: { passed: boolean; ring: string; score: string; label: string }) {
  const ink = passed ? "#B8901F" : "#7b8494";
  const fill = passed ? "#FFD24D" : "#e5e7eb";
  const dots = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-52 w-52 -rotate-[8deg] drop-shadow-md sm:h-60 sm:w-60" role="img" aria-label={`${label} · ${score}`}>
      <defs>
        <path id="cx-seal-ring" d="M 110,110 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0" />
      </defs>
      {/* scalloped edge */}
      {dots.map((a, i) => (
        <circle key={i} cx={110 + Math.cos(a) * 100} cy={110 + Math.sin(a) * 100} r="9" fill={fill} />
      ))}
      <circle cx="110" cy="110" r="100" fill={fill} />
      <circle cx="110" cy="110" r="94" fill="none" stroke={ink} strokeWidth="2" />
      <circle cx="110" cy="110" r="60" fill="none" stroke={ink} strokeWidth="1.5" />
      <text fill="#0E2A4F" fontSize="12.5" fontWeight="700" letterSpacing="1.5" fontFamily="var(--font-jakarta), sans-serif">
        <textPath href="#cx-seal-ring" textLength="470" lengthAdjust="spacing">
          {`${ring} · ${ring} ·`}
        </textPath>
      </text>
      <text x="110" y="104" textAnchor="middle" fontSize="34" fill="#0E2A4F" aria-hidden>
        ★
      </text>
      <text x="110" y="136" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0E2A4F" fontFamily="var(--font-serif), Georgia, serif">
        {score}
      </text>
      <text x="110" y="153" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="2" fill="#0E2A4F" fontFamily="var(--font-jakarta), sans-serif">
        {label}
      </text>
    </svg>
  );
}

/** The officer: a simple navy-and-gold portrait, no photo. */
export function OfficerAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#194876" stroke="#FFD24D" strokeWidth="2" />
      <path d="M14 58c2-11 9-16 18-16s16 5 18 16" fill="#0E2A4F" />
      <path d="M29 42l3 6 3-6" fill="#FFD24D" />
      <circle cx="32" cy="30" r="10" fill="#f1d6bf" />
      <path d="M20 22c3-7 21-7 24 0l-2 3H22z" fill="#0E2A4F" />
      <rect x="21" y="23" width="22" height="3" rx="1.5" fill="#0b2240" />
      <circle cx="32" cy="18.5" r="2.2" fill="#FFD24D" />
      <rect x="40" y="48" width="5" height="4" rx="1" fill="#FFD24D" />
    </svg>
  );
}
