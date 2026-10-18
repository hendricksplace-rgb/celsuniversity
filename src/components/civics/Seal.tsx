/** The result seal: a gold stamp when the exam is passed, a quiet grey one otherwise. No confetti. */
export function Seal({ passed, label }: { passed: boolean; label: string }) {
  const color = passed ? "#b8860b" : "#6b7280";
  const stars = Array.from({ length: 13 }, (_, i) => (i / 13) * Math.PI * 2);
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44 sm:h-52 sm:w-52" role="img" aria-label={label}>
      <defs>
        <path id="seal-arc" d="M 100,100 m -68,0 a 68,68 0 1,1 136,0 a 68,68 0 1,1 -136,0" />
      </defs>
      <circle cx="100" cy="100" r="94" fill="none" stroke={color} strokeWidth="3" strokeDasharray="2 5" />
      <circle cx="100" cy="100" r="86" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="4" />
      <circle cx="100" cy="100" r="54" fill="none" stroke={color} strokeWidth="2" />
      <text fill={color} fontSize="13" fontWeight="700" letterSpacing="3" fontFamily="var(--t-heading), serif">
        <textPath href="#seal-arc" textLength="418" lengthAdjust="spacingAndGlyphs">
          CELSUS · CIVICS 2025 · CELSUS · CIVICS 2025 ·
        </textPath>
      </text>
      {stars.map((a, i) => (
        <circle key={i} cx={100 + Math.cos(a) * 78} cy={100 + Math.sin(a) * 78} r="1.6" fill={color} />
      ))}
      <text x="100" y={passed ? 96 : 92} textAnchor="middle" fontSize="34" fill={color} aria-hidden>
        {passed ? "★" : "↻"}
      </text>
      {label.split(" ").length > 1 && !passed ? (
        <>
          <text x="100" y="114" textAnchor="middle" fontSize="11" fontWeight="800" fill={color} letterSpacing="1">
            {label.split(" ")[0]}
          </text>
          <text x="100" y="128" textAnchor="middle" fontSize="11" fontWeight="800" fill={color} letterSpacing="1">
            {label.split(" ").slice(1).join(" ")}
          </text>
        </>
      ) : (
        <text x="100" y="122" textAnchor="middle" fontSize="15" fontWeight="800" fill={color} letterSpacing="2">
          {label}
        </text>
      )}
    </svg>
  );
}
