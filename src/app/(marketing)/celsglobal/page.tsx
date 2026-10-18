import CelsGLOBALBoard from "@/components/site/celsglobal/CelsGLOBALBoard";

export const metadata = {
  title: "CelsGLOBAL · International Business Development en 6 meses | CelsU",
  description:
    "Inglés de negocios, resume al estilo americano, entrevistas, finanzas personales y tu camino con la Visa TN: 8 programas en una ruta guiada de 6 meses por $499 USD.",
  alternates: { canonical: "/celsglobal" },
  openGraph: {
    title: "CelsGLOBAL · International Business Development",
    description: "8 programas en una ruta guiada de 6 meses: inglés de negocios, resume, entrevistas, finanzas y Visa TN.",
    url: "/celsglobal",
    locale: "es_MX",
    images: [{ url: "/site/celsglobal-lockup-dark.png", alt: "CelsGLOBAL" }],
  },
};

/** CelsGLOBAL sales page (board CelsGLOBAL.dc.html). The student route is /app/programas/celsglobal. */
export default function CelsGlobalPage() {
  return <CelsGLOBALBoard />;
}
