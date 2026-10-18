import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "CelsUS · Prepárate para tu entrevista de ciudadanía";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Prepárate para tu entrevista de ciudadanía",
    sub: "Preguntas cívicas oficiales y simulador con oficial. Desde $139 USD.",
    background: "linear-gradient(160deg, #1F5389 0%, #194876 50%, #0E2A4F 100%)",
    ink: "#F4F1E8",
    accent: "#FFD24D",
    logo: "celsus.png",
    logoWidth: 249,
    logoHeight: 100,
    logoRadius: 12,
  });
}
