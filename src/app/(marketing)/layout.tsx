import type { Metadata } from "next";

// Public website (celsu-website-spec.md): each page brings its own navigation and footer from its board.
// Canonical URLs point at celstv.com; other hosts get noindex (next.config.ts, robots.ts).
export const metadata: Metadata = { metadataBase: new URL("https://celstv.com") };

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative overflow-x-clip font-[family-name:var(--font-jakarta)]">{children}</div>;
}
