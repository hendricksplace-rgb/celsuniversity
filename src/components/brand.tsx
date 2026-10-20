// Each program's look on cards: background, ink, accent, top bar and logo. Shared by the home and Mis cursos.
import Image from "next/image";
import type { ThemeKey } from "@/lib/themes";
import { appPlansHref } from "@/lib/enroll";

// `fill` and `onFill` are for filled buttons: the accent itself is too light behind its text (WCAG 4.5:1).
export const BRAND: Record<ThemeKey, { href: string; bg: string; ink: string; muted: string; accent: string; fill: string; onFill: string; bar: string; logo: React.ReactNode }> = {
  celstv: {
    href: "/celstv",
    bg: "linear-gradient(150deg,#2a1240 0%,#1a1030 60%,#12101f 100%)",
    ink: "#FFFFFF",
    muted: "#C9C2DD",
    accent: "#F5178C",
    fill: "#D6006A",
    onFill: "#FFFFFF",
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
    fill: "#35C3F0",
    onFill: "#0F0D1E",
    bar: "#35C3F0",
    logo: <Image src="/brand/celsbsns.png" alt="CelsBSNS" width={150} height={42} />,
  },
  celsus: {
    // No CelsUS page in the app yet: its card opens the in-app plans (Matt, 2026-10-20 item 2).
    href: appPlansHref("celsus"),
    bg: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)",
    ink: "#F4F1E8",
    muted: "#C9D3E2",
    accent: "#FFD24D",
    fill: "#FFD24D",
    onFill: "#0E2A4F",
    bar: "#FFD24D",
    logo: <Image src="/brand/celsus.jpg" alt="CelsUS" width={120} height={48} className="rounded-md" />,
  },
  celsglobal: {
    href: "/app/programas/celsglobal",
    bg: "linear-gradient(150deg,#F3F1EC 0%,#E4E8E1 100%)",
    ink: "#2F3A36",
    muted: "#5E6B66",
    accent: "#5C7F6E",
    fill: "#4F6F60",
    onFill: "#FFFFFF",
    bar: "#5C7F6E",
    logo: <Image src="/brand/celsglobal.png" alt="CelsGLOBAL" width={170} height={38} />,
  },
};
