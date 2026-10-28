import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "Evaluación de inglés gratis · CelsU";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Evaluación de inglés gratis",
    sub: "Descubre tu nivel (A1 a C2) en unos 15 minutos, con resultados por habilidad.",
    background: "linear-gradient(150deg, #D6006A 0%, #B0005A 50%, #6E1FB8 100%)",
    ink: "#FFFFFF",
    accent: "#FFEF05",
    logo: "celsu-u.png",
    logoWidth: 136,
    logoHeight: 90,
    wordmark: "CelsU",
  });
}
