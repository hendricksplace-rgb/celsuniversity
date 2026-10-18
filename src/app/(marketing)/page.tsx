import { sitePrices } from "@/components/site/prices-server";
import HomeBoard from "@/components/site/home/HomeBoard";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "CelsU · Aprende inglés para tu vida, tu trabajo y tu ciudadanía",
  description: "Programas de inglés en línea para latinoamericanos: inglés para la vida, inglés de negocios, preparación para la ciudadanía de EE.UU. y desarrollo profesional. Descubre tu nivel gratis en 10 minutos.",
  alternates: { canonical: "/" },
  openGraph: { title: "CelsU · Aprende inglés para tu vida, tu trabajo y tu ciudadanía", description: "Programas de inglés en línea para latinoamericanos: inglés para la vida, inglés de negocios, preparación para la ciudadanía de EE.UU. y desarrollo profesional. Descubre tu nivel gratis en 10 minutos.", locale: "es_MX", type: "website", images: [{ url: "/og/celsu.png", width: 1200, height: 630 }] },
};

// Prices come from public.products; refreshed at most once an hour.
export const revalidate = 3600;

export default async function Home() {
  return <HomeBoard prices={await sitePrices()} />;
}
