import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

// next/font self-hosts the font files at build time: no request to Google at runtime.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.meta.title, description: t.meta.description };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang, t } = await getDictionary();
  return (
    <html lang={lang}>
      <body className={`${poppins.variable} antialiased`}>
        <SiteHeader />
        <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-4 py-10">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {t.footer.rights}
        </footer>
      </body>
    </html>
  );
}
