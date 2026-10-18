import { sitePrices } from "@/components/site/prices-server";
import HomeBoard from "@/components/site/home/HomeBoard";

export const metadata = {
  title: "CelsUniversity by LAM · Inglés para tu vida, tu trabajo y tu ciudadanía",
  description: "Aprende inglés con CelsTV, CelsBSNS, CelsUS y CelsGLOBAL. Descubre tu nivel gratis y elige el programa para tu meta.",
  alternates: { canonical: "/" },
};

// Prices come from public.products; refreshed at most once an hour.
export const revalidate = 3600;

export default async function Home() {
  return <HomeBoard prices={await sitePrices()} />;
}
