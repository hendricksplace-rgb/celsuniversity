import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "CelsTV · Aprende inglés con una serie de TV";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Aprende inglés con una serie de TV",
    sub: "32 episodios con tarjetas, libro interactivo, audio y quiz. Desde $99 USD.",
    background: "linear-gradient(160deg, #FFF1F6 0%, #F8C9DC 55%, #E58AB0 100%)",
    ink: "#2A0F1E",
    accent: "#8F0044",
    logo: "celstv-e.png",
    logoWidth: 85,
    logoHeight: 90,
    wordmark: "CelsTV",
  });
}
