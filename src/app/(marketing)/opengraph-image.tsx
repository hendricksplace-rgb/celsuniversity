import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "CelsU · Aprende inglés para tu vida, tu trabajo y tu ciudadanía";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Aprende inglés para tu vida, tu trabajo y tu ciudadanía",
    sub: "Programas en línea para latinoamericanos. Evaluación de nivel gratis.",
    background: "linear-gradient(160deg, #2BD8FF 0%, #00CCFE 45%, #00A9DC 100%)",
    ink: "#0F0D1E",
    accent: "#0E2A3A",
    logo: "celsu-u.png",
    logoWidth: 136,
    logoHeight: 90,
    wordmark: "CelsU",
  });
}
