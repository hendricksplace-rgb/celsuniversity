import type { Metadata } from "next";
import CelsUSBoard from "@/components/site/celsus/CelsUSBoard";

export const metadata: Metadata = {
  title: "CelsUS Para Ciudadanía · Prepárate para tu entrevista de ciudadanía | CelsU",
  description:
    "Las preguntas de cívica con audio, inglés para la entrevista y simulacros con el oficial, en inglés y español. CelsUS no está afiliado con USCIS ni da asesoría legal.",
  alternates: { canonical: "/celsus" },
  openGraph: {
    title: "CelsUS Para Ciudadanía",
    description: "Prepárate para la entrevista de ciudadanía de EE. UU. con cívica en audio y simulacros.",
    url: "/celsus",
    images: [{ url: "/site/celsus-logo.jpg" }],
    locale: "es_MX",
    type: "website",
  },
};

export default function CelsUSPage() {
  return <CelsUSBoard />;
}
