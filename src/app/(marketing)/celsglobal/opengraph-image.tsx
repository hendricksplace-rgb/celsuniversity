import { OG_SIZE, shareImage } from "@/components/site/og";

export const alt = "CelsGLOBAL · Tu carrera internacional en 6 meses";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage({
    title: "Tu carrera internacional en 6 meses",
    sub: "Inglés de negocios, resume, entrevista con IA y Visa TN. $499 USD o 5 pagos.",
    background: "linear-gradient(160deg, #1E2A48 0%, #14182B 60%, #0E1120 100%)",
    ink: "#F4F1EA",
    accent: "#C7A24E",
    logo: "celsglobal.png",
    logoWidth: 407,
    logoHeight: 90,
  });
}
