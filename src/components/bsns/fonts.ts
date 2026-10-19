import { Dancing_Script, Montserrat } from "next/font/google";

// CelsBSNS v2 titles. Self-hosted by next/font at build time (no request to Google at runtime).
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["800"], variable: "--font-montserrat", display: "swap" });

// The signed name on "Mi compromiso" (Feedback & Progress). Not preloaded: it's below the fold.
export const dancing = Dancing_Script({ subsets: ["latin"], weight: ["700"], variable: "--font-dancing", display: "swap", preload: false });
