import HomeBoard from "@/components/site/home/HomeBoard";

export const metadata = {
  title: "CelsUniversity by LAM · Inglés para tu vida, tu trabajo y tu ciudadanía",
  description: "Aprende inglés con CelsTV, CelsBSNS, CelsUS y CelsGLOBAL. Descubre tu nivel gratis y elige el programa para tu meta.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomeBoard />;
}
