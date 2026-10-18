import { sitePrices } from "@/components/site/prices-server";
import type { Metadata } from "next";
import CelsUSBoard from "@/components/site/celsus/CelsUSBoard";

// Title and description: celsu-website-copy.md §2.
export const metadata: Metadata = {
  title: "CelsUS · Prepárate para tu entrevista de ciudadanía",
  description: "Practica las preguntas cívicas oficiales, el inglés de la entrevista y un simulador con oficial. En español e inglés, desde $139 USD. No es asesoría legal.",
  alternates: { canonical: "/celsus" },
  openGraph: { title: "CelsUS · Prepárate para tu entrevista de ciudadanía", description: "Practica las preguntas cívicas oficiales, el inglés de la entrevista y un simulador con oficial. En español e inglés, desde $139 USD. No es asesoría legal.", locale: "es_MX", type: "website", images: [{ url: "/og/celsus.png", width: 1200, height: 630 }] },
};

// Prices come from public.products; refreshed at most once an hour.
export const revalidate = 3600;

export default async function CelsUSPage() {
  return <CelsUSBoard prices={await sitePrices()} />;
}
