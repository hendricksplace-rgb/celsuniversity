import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { PlanHighlight } from "@/components/site/PlanHighlight";

// Public website (celsu-website-spec.md): each page brings its own navigation and footer from its board.
// Canonical URLs point at SITE_URL; indexing is controlled by SITE_INDEXABLE (src/lib/site.ts).
export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-clip font-[family-name:var(--font-jakarta)]">
      {children}
      <PlanHighlight />
    </div>
  );
}
