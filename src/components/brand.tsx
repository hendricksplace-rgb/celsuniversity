// Each program's look on cards: background, ink, accent, top bar and logo. Shared by the home and Mis cursos.
import Image from "next/image";
import type { ThemeKey } from "@/lib/themes";

export const BRAND: Record<ThemeKey, { href: string; bg: string; ink: string; muted: string; accent: string; bar: string; logo: React.ReactNode }> = {
  celstv: {
    href: "/celstv",
    bg: "linear-gradient(150deg,#2a1240 0%,#1a1030 60%,#12101f 100%)",
    ink: "#FFFFFF",
    muted: "#C9C2DD",
    accent: "#F5178C",
    bar: "linear-gradient(90deg,#F5178C,#FFC531,#6DC067,#35C3F0)",
    logo: (
      <span className="flex items-center gap-2">
        <Image src="/brand/celstv-e.png" alt="" width={34} height={36} />
        <span className="text-2xl font-extrabold text-white">
          Cels<span className="text-[#F5178C]">TV</span>
        </span>
      </span>
    ),
  },
  celsbsns: {
    href: "/celsbsns",
    bg: "linear-gradient(150deg,#13284D 0%,#0c1a33 100%)",
    ink: "#FFFFFF",
    muted: "#A9BBD9",
    accent: "#35C3F0",
    bar: "#35C3F0",
    logo: <Image src="/brand/celsbsns.png" alt="CelsBSNS" width={150} height={42} />,
  },
  celsus: {
    href: "/cursos",
    bg: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)",
    ink: "#F4F1E8",
    muted: "#C9D3E2",
    accent: "#FFD24D",
    bar: "#FFD24D",
    logo: <Image src="/brand/celsus.jpg" alt="CelsUS" width={120} height={48} className="rounded-md" />,
  },
  celsglobal: {
    href: "/app/programas/celsglobal",
    bg: "linear-gradient(150deg,#F3F1EC 0%,#E4E8E1 100%)",
    ink: "#2F3A36",
    muted: "#5E6B66",
    accent: "#5C7F6E",
    bar: "#5C7F6E",
    logo: <Image src="/brand/celsglobal.png" alt="CelsGLOBAL" width={170} height={38} />,
  },
};
