import { LegalPage } from "@/components/site/SiteChrome";
import { LegalMarkdown, legalText } from "@/components/site/LegalMarkdown";

// Text: celsu-website-copy.md §1 (Cowork, 2026-10-18), in src/content/legal/terminos.md.
export const metadata = {
  title: "Términos y Condiciones · CelsU",
  description: "Las condiciones de uso, pagos, acceso y reembolsos de CelsU.",
  openGraph: { locale: "es_MX", type: "website", images: [{ url: "/og/celsu.png", width: 1200, height: 630 }] },
  alternates: { canonical: "/terminos" },
};

export default function Terminos() {
  return (
    <LegalPage title="Términos y Condiciones">
      <LegalMarkdown source={legalText("terminos")} />
    </LegalPage>
  );
}
