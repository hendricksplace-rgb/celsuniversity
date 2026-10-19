import { Plus_Jakarta_Sans } from "next/font/google";

// The bands, titles and questions are set in Jakarta italic (the root layout loads the upright styles only).
export const jakartaItalic = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["700", "800"], style: ["italic"], variable: "--cb-italic", display: "swap" });
