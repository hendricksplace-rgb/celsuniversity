// C-026 leaderboard types and helpers that the browser can load too (lib/leaderboard.ts is the server side).
import type { ThemeKey } from "@/lib/themes";

export type LbRow = {
  rank: number;
  user_id: string;
  display: string;
  initial: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  rank_change: number | null;
  is_me: boolean;
  receive_cheers: boolean | null;
  cheers: number | null;
  cheered_today: boolean | null;
};
export type Lb = {
  rows: LbRow[];
  ranked: number;
  students: number;
  my_rank: number | null;
  ahead: { rank: number; display: string; xp: number } | null;
  period_start: string;
  period_end: string;
  has_class: boolean;
  teacher: string | null;
};
export type Period = "week" | "all" | "class";
export type Phrase = { code: string; emoji: string; en: string; es: string; note: string; audio: string | null; wt: number[] };
export type LbCourse = { id: string; slug: string; label: string; color: string; earnHref: string };

export const BRAND_COLOR: Record<ThemeKey, string> = { celstv: "#F20174", celsus: "#C7A24E", celsbsns: "#2C6BC4", celsglobal: "#19A974" };
const BRAND_LABEL: Record<ThemeKey, string> = { celstv: "CelsTV", celsus: "CelsUS", celsbsns: "CelsBSNS", celsglobal: "CelsGLOBAL" };
/** The pill name: the program for one-course programs; the course title for the CelsGLOBAL courses. */
export const courseLabel = (brand: ThemeKey, title: string) => (brand === "celsglobal" ? title : BRAND_LABEL[brand]);

/** Colors for avatars without a photo, picked by user id so a student keeps theirs. */
const AV = ["#F20174", "#8E5CFF", "#1F9BD1", "#E0682B", "#19A974", "#C2185B", "#5C6BC0", "#00897B", "#D81B60", "#7E57C2"];
export const avatarColor = (id: string) => AV[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AV.length];

/** XP still needed to pass the student just above (a tie goes to whoever got there first, so one more). */
export const xpToPass = (lb: Lb) => (lb.ahead ? lb.ahead.xp - (lb.rows.find((r) => r.is_me)?.xp ?? 0) + 1 : 0);
