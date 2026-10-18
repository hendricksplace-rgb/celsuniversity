import { sitePrices } from "@/components/site/prices-server";
import CelsGLOBALBoard from "@/components/site/celsglobal/CelsGLOBALBoard";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "CelsGLOBAL · Tu carrera internacional en 6 meses",
  description: "Inglés de negocios, resume para EE.UU., práctica de entrevista con IA, finanzas personales y la Visa TN. 8 programas en una sola ruta por $499 USD o 5 pagos.",
  alternates: { canonical: "/celsglobal" },
  openGraph: { title: "CelsGLOBAL · Tu carrera internacional en 6 meses", description: "Inglés de negocios, resume para EE.UU., práctica de entrevista con IA, finanzas personales y la Visa TN. 8 programas en una sola ruta por $499 USD o 5 pagos.", locale: "es_MX", type: "website", images: [{ url: "/og/celsglobal.png", width: 1200, height: 630 }] },
};

/** CelsGLOBAL sales page (board CelsGLOBAL.dc.html). The student route is /app/programas/celsglobal. */
// Prices come from public.products; refreshed at most once an hour.
export const revalidate = 3600;

export default async function CelsGlobalPage() {
  return <CelsGLOBALBoard prices={await sitePrices()} />;
}
