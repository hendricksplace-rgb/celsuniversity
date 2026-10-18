import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary } from "@/lib/i18n/server";

/** Public site: marketing, catalog, sign-in, the English evaluation and the sales pages. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-4 py-10">{children}</main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {t.footer.rights}
      </footer>
    </>
  );
}
