import { LegalPage } from "@/components/site/SiteChrome";
import { LegalMarkdown, legalText } from "@/components/site/LegalMarkdown";

// Text: celsu-ayuda-privacidad.md (Cowork, 2026-10-18), in src/content/legal/privacidad.md.
export const metadata = {
  title: "Aviso de Privacidad · CelsU",
  description: "Cómo protegemos y usamos tus datos personales en CelsU.",
  openGraph: { locale: "es_MX", type: "website", images: [{ url: "/og/celsu.png", width: 1200, height: 630 }] },
  alternates: { canonical: "/privacidad" },
};

export default function Privacidad() {
  return (
    <LegalPage title="Aviso de Privacidad Integral">
      <LegalMarkdown source={legalText("privacidad")} />
    </LegalPage>
  );
}
