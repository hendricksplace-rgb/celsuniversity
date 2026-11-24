// C-061: Fraunces for the CelsGLOBAL hero ("sin fronteras." and the closing line). Self-hosted by next/font at build
// time and only loaded where it's used.
import { Fraunces } from "next/font/google";

export const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], display: "swap", variable: "--font-fraunces" });
