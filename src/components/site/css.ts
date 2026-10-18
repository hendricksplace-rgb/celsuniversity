// Inline style strings from the design boards ("color: red; --d: .4s;") as React style objects.
import type { CSSProperties } from "react";

export function css(s: string | null | undefined): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of (s ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    if (!k) continue;
    const key = k.startsWith("--") ? k : k.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}
