import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Poppins, Source_Serif_4 } from "next/font/google";
import { OfflineSync } from "@/components/OfflineSync";
import { ErrorReporter } from "@/components/errors/ErrorReporter";
import { InstallProvider, captureInstallPrompt } from "@/components/install/InstallApp";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

// next/font self-hosts the font files at build time: no request to Google at runtime.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
// Program themes (CelsBSNS, CelsGLOBAL body text; CelsUS: Jakarta for the interface, Source Serif for headings and questions).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    // Canonical URLs and Open Graph images resolve against the public domain (nuevo.celstv.com is noindex).
    metadataBase: new URL("https://celstv.com"),
    title: t.meta.title,
    description: t.meta.description,
    applicationName: "CelsU",
    // iOS "Add to Home Screen": full-screen app named CelsU with the icon below.
    appleWebApp: { capable: true, title: "CelsU", statusBarStyle: "default" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

export const viewport: Viewport = { themeColor: "#F5178C" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang, t } = await getDictionary();
  return (
    <html lang={lang}>
      <body className={`${poppins.variable} ${inter.variable} ${jakarta.variable} ${serif.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: captureInstallPrompt }} />
        <InstallProvider t={t.install}>
          <OfflineSync />
          <ErrorReporter />
          {children}
        </InstallProvider>
      </body>
    </html>
  );
}
