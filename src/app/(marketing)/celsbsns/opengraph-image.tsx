import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "CelsBSNS · Inglés de negocios en 10 semanas";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Inglés de negocios en 10 semanas",
    sub: "Juntas, entrevistas, correos y presentaciones. Desde $120 USD.",
    background: "linear-gradient(160deg, #1B3A6B 0%, #13284D 55%, #0C1A33 100%)",
    ink: "#FFFFFF",
    accent: "#8FDCF7",
    logo: "celsbsns.png",
    logoWidth: 321,
    logoHeight: 90,
  });
}
