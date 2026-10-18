// Share images (Open Graph / Twitter) for the public pages, drawn with next/og at build time.
// Each page's opengraph-image.tsx calls shareImage() with its program look; the title comes from the
// page's SEO title (celsu-website-copy.md). Logos and Plus Jakarta Sans live in src/assets/og.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const asset = (file: string) => readFile(join(process.cwd(), "src/assets/og", file));
const dataUrl = async (file: string) => `data:image/png;base64,${(await asset(file)).toString("base64")}`;

export type ShareLook = {
  /** Page title without the program prefix ("Aprende inglés con una serie de TV"). */
  title: string;
  /** One short line under the title. */
  sub: string;
  background: string;
  ink: string;
  /** Kicker and footer color. */
  accent: string;
  /** Logo file in src/assets/og and its rendered size. */
  logo: string;
  logoWidth: number;
  logoHeight: number;
  /** Text next to the logo when the logo is a mark only (CelsU, CelsTV). */
  wordmark?: string;
  /** Rounded corners for logos with their own box (CelsUS). */
  logoRadius?: number;
};

/**
 * Text as one span per word. next/og doesn't apply the font's kerning, so "vida, tu" came out as
 * "vida , tu": the punctuation after a word is pulled back by hand.
 */
function Words({ text, size, style }: { text: string; size: number; style: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.24, fontSize: size, ...style }}>
      {text.split(" ").map((word, i) => {
        const m = word.match(/^(.*?)([.,;:]+)$/);
        return m ? (
          <span key={i} style={{ display: "flex" }}>
            <span>{m[1]}</span>
            <span style={{ marginLeft: -size * 0.14 }}>{m[2]}</span>
          </span>
        ) : (
          <span key={i}>{word}</span>
        );
      })}
    </div>
  );
}

export async function shareImage(look: ShareLook) {
  const [bold, extra, logo] = await Promise.all([
    asset("plus-jakarta-sans-latin-700-normal.woff"),
    asset("plus-jakarta-sans-latin-800-normal.woff"),
    dataUrl(look.logo),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: look.background,
          color: look.ink,
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img */}
          <img src={logo} alt="" width={look.logoWidth} height={look.logoHeight} style={{ borderRadius: look.logoRadius ?? 0 }} />
          {look.wordmark && <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>{look.wordmark}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
          <Words text={look.title} size={look.title.length > 34 ? 66 : 76} style={{ fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }} />
          <Words text={look.sub} size={32} style={{ fontWeight: 700, lineHeight: 1.3, opacity: 0.88 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, fontWeight: 800, color: look.accent }}>
          <span>celstv.com</span>
          <span>CelsU · Latin American Media</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Jakarta", data: bold, weight: 700, style: "normal" },
        { name: "Jakarta", data: extra, weight: 800, style: "normal" },
      ],
    },
  );
}
