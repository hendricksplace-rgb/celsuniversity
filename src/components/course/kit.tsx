// Shared pieces of the course page and episode screen: the 6 part icons (kit SVGs, used as files,
// never redrawn), the episode tile or still, and the progress ring.
import Image from "next/image";
import type { Episode, Part, PartKey } from "@/lib/course-page";
import { PART_KEYS, PART_NAME, partIcon } from "@/lib/course-page";

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
export const pad = (n: number) => String(n).padStart(2, "0");

// Episode tiles rotate through 4 gradients: pink→purple, cyan→blue, yellow→orange, green→teal.
export const TILE = [
  "linear-gradient(135deg, #F20174 0%, #9B1FD1 100%)",
  "linear-gradient(135deg, #43D6FE 0%, #2563EB 100%)",
  "linear-gradient(135deg, #FFC531 0%, #F26A1B 100%)",
  "linear-gradient(135deg, #7BE07A 0%, #0E9F8E 100%)",
];
export const tileFor = (n: number) => TILE[(n - 1) % 4];

/** The part icon (the kit's SVG file). Not done → grayscale and faint. */
export function PartIcon({ k, size, off, label }: { k: PartKey; size: number; off?: boolean; label?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={partIcon(k)} width={size} height={size} alt={label ?? ""} className={off ? "kit-off" : undefined} style={{ width: size, height: size }} />
  );
}

/** The row of part icons: CelsTV parts in their fixed order, done ones in color. */
export function PartIcons({ parts, size, doneLabel }: { parts: Part[]; size: number; doneLabel: string }) {
  const byKey = new Map(parts.filter((p) => p.key).map((p) => [p.key!, p]));
  const keys = PART_KEYS.filter((k) => byKey.has(k));
  return (
    <ul className="flex items-center gap-1" aria-label={fill(doneLabel, { n: parts.filter((p) => p.done).length, total: parts.length })}>
      {keys.map((k) => (
        <li key={k} title={PART_NAME[k]}>
          <PartIcon k={k} size={size} off={!byKey.get(k)!.done} />
        </li>
      ))}
    </ul>
  );
}

/** The episode still, or a color tile with the big number and two soft circles. */
export function EpisodeArt({
  episode,
  className,
  number = true,
  numberClass = "text-5xl",
  sizes = "(max-width: 640px) 100vw, 360px",
  priority = false,
}: {
  episode: Pick<Episode, "n" | "artwork">;
  className?: string;
  number?: boolean;
  numberClass?: string;
  /** Rendered width, so the optimizer sends a small file (the originals are large PNGs). */
  sizes?: string;
  /** The page's main image: load it first (Lighthouse LCP). */
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ background: tileFor(episode.n) }}>
      {episode.artwork ? (
        <Image src={episode.artwork} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <>
          <span aria-hidden className="absolute -right-[12%] -top-[30%] aspect-square w-[70%] rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-[45%] right-[22%] aspect-square w-[55%] rounded-full bg-white/10" />
        </>
      )}
      {number && (
        <span
          aria-hidden
          className={`absolute bottom-[6%] left-[7%] font-extrabold leading-none tracking-tight text-white ${numberClass}`}
          style={{ textShadow: episode.artwork ? "0 2px 12px rgba(0,0,0,.45)" : "0 2px 0 rgba(0,0,0,.08)" }}
        >
          {pad(episode.n)}
        </span>
      )}
    </div>
  );
}

/** Circular progress ring. */
export function Ring({ value, size, stroke, color, track, children }: { value: number; size: number; stroke: number; color: string; track: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** 6-segment bar of the "Continúa" card: done segments yellow, the current one half yellow. */
export function Segments({ parts, current }: { parts: Part[]; current: string }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {parts.map((p) => (
        <span
          key={p.id}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: p.done ? "#FFEF05" : p.id === current ? "linear-gradient(90deg,#FFEF05 50%,rgba(255,255,255,.22) 50%)" : "rgba(255,255,255,.22)" }}
        />
      ))}
    </div>
  );
}
