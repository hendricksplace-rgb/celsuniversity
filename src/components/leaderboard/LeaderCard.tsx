// C-026: "🏆 CELSTV · ESTA SEMANA · Vas #4 de 23 · A 50 XP de Sofía" with the top-3 faces; opens the full table.
import "./tabla.css";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/components/course/kit";
import type { LeaderCardData } from "@/lib/leaderboard";

const MEDAL = [
  ["#FFD21F", "#5A3500"],
  ["#CDD6EA", "#2A3350"],
  ["#E0955A", "#3A1C06"],
];

export function LeaderCard({ t, d }: { t: Dictionary["lb"]; d: LeaderCardData }) {
  const ahead = d.ahead ? fill(t.card.ahead, { xp: d.ahead.xp, name: d.ahead.name === "Estudiante" ? t.hiddenName : d.ahead.name.split(" ")[0] }) : null;
  return (
    <Link href={`/app/progreso/tabla?c=${d.slug}`} className="lb-card" aria-label={`${t.card.open}: ${fill(t.card.rank, { rank: d.rank, n: d.of })}`}>
      <span className="tro" aria-hidden>
        🏆
      </span>
      <span className="min-w-0">
        <span className="k block">{fill(t.card.k, { course: d.courseLabel })}</span>
        <b>{fill(t.card.rank, { rank: d.rank, n: d.of })}</b>
        <small>{d.first ? t.card.first : (ahead ?? t.card.none)}</small>
      </span>
      <span className="face" aria-hidden>
        {d.top.map((r, i) => (
          <span key={r.user_id} style={{ background: MEDAL[i][0], color: MEDAL[i][1] }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.avatar_url ? <img src={r.avatar_url} alt="" /> : r.initial}
          </span>
        ))}
      </span>
    </Link>
  );
}
