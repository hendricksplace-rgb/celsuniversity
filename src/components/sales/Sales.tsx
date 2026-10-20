// Building blocks for the /celstv and /celsbsns sales pages (ported from Base44, bright CelsU style).
import Link from "next/link";
import { enrollHref } from "@/lib/enroll";

export const C = { pink: "#F5178C", blue: "#5B8DEF", cyan: "#35C3F0", green: "#6DC067", yellow: "#FFC531", lavender: "#A9A4C0" };
export type Plan = "celstv" | "celsbsns" | "bundle";

/** The buttons go through /inscribirme (Matt, 2026-10-20); the CelsTV + CelsBSNS bundle opens with CelsBSNS. */
export const planHref = (plan: Plan) => enrollHref(plan === "bundle" ? "celsbsns" : plan);

/** USD → MXN for the "≈ $X MXN" hint. Cached for a day; nothing shown if the rate service is down. */
export async function mxnRate(): Promise<number | null> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 86400 } });
    const d = (await r.json()) as { rates?: { MXN?: number } };
    return d.rates?.MXN ?? null;
  } catch {
    return null;
  }
}

export function Mxn({ usd, rate }: { usd: number; rate: number | null }) {
  if (!rate) return null;
  return (
    <p className="mt-1.5 text-xs font-semibold leading-snug text-[#A9A4C0]">
      ≈ ${Math.round(usd * rate).toLocaleString("es-MX")} MXN aprox. Se cobra en dólares; tu banco aplica el tipo de cambio del día.
    </p>
  );
}

export function PersonaBanner({ name, level, goal }: { name?: string; level?: string; goal?: string }) {
  if (!name || !level || !/^[ABC][12]$/.test(level)) return null;
  const msg =
    goal === "work"
      ? `Recomendado para ti, ${name}: tu nivel ${level} + tu meta profesional.`
      : `Recomendado para ti, ${name}: tu nivel ${level} + tu meta de conversar con confianza.`;
  return (
    <div className="rounded-2xl border-2 p-3.5 text-sm font-bold leading-snug" style={{ borderColor: C.yellow, background: "rgba(255,197,49,.10)" }}>
      ⭐ <span style={{ color: C.yellow }}>{msg}</span>
    </div>
  );
}

export const SectionTitle = ({ children }: { children: React.ReactNode }) => <h2 className="pt-6 text-xl font-extrabold text-white">{children}</h2>;

export function CheckList({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="card mt-3 space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm font-bold leading-snug text-white">
          <span style={{ color: C.green }}>✓</span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

export function FeatureList({ features }: { features: { icon: string; title: string; desc: string; bg: string }[] }) {
  return (
    <div className="card mt-3 space-y-3.5">
      {features.map((f) => (
        <div key={f.title} className="flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: f.bg }}>
            {f.icon}
          </div>
          <div>
            <h3 className="text-[15.5px] font-extrabold text-white">{f.title}</h3>
            <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-[#A9A4C0]">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Testimonials({ items }: { items: { quote: string; who: string }[] }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {items.map((t) => (
        <figure key={t.who} className="card">
          <blockquote className="text-sm font-semibold italic leading-relaxed text-white">“{t.quote}”</blockquote>
          <figcaption className="mt-2 text-xs font-bold text-[#A9A4C0]">— {t.who}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-3 space-y-2.5">
      {items.map((f) => (
        <details key={f.q} className="card !p-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-extrabold text-white">
            {f.q} <span style={{ color: C.cyan }}>+</span>
          </summary>
          <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-[#A9A4C0]">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function PriceCard({
  label,
  amount,
  includes,
  cta,
  color,
  plan,
  rate,
  access,
  children,
}: {
  label: string;
  amount: number;
  includes: string[];
  cta: string;
  color: string;
  plan: Plan;
  rate: number | null;
  /** "un año", "6 meses"… */
  access: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card mt-4" style={{ border: `2px solid ${color}` }}>
      <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ background: color }}>
        {label}
      </span>
      <div className="mt-2 text-4xl font-extrabold text-white">
        ${amount} <span className="text-sm font-bold text-[#A9A4C0]">USD · acceso por {access}</span>
      </div>
      <Mxn usd={amount} rate={rate} />
      <ul className="mt-3">
        {includes.map((inc) => (
          <li key={inc} className="py-1.5 text-sm font-bold leading-snug text-white">
            <span style={{ color: C.green }}>✓ </span>
            {inc}
          </li>
        ))}
      </ul>
      <Link href={planHref(plan)} className="mt-4 block w-full rounded-2xl py-4 text-center text-base font-extrabold text-white transition hover:brightness-110" style={{ background: color }}>
        {cta}
      </Link>
      <p className="mt-3 text-center text-[11px] leading-snug text-[#A9A4C0]/70">No hay reembolsos una vez accedido el contenido.</p>
      {children}
    </div>
  );
}

export function BundleCard({ rate }: { rate: number | null }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl border-2 p-5" style={{ borderColor: C.yellow, background: "linear-gradient(135deg,rgba(245,23,140,.22),rgba(91,141,239,.22))" }}>
      <div className="absolute -right-8 top-3 rotate-[38deg] px-10 py-1 text-[11px] font-extrabold tracking-wide text-[#3a2a00]" style={{ background: C.yellow }}>
        MEJOR VALOR
      </div>
      <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#3a2a00]" style={{ background: C.yellow }}>
        Paquete completo
      </span>
      <h2 className="mt-2.5 text-2xl font-extrabold text-white">
        Cels<span style={{ color: C.pink }}>TV</span> + Cels<span style={{ color: C.blue }}>BSNS</span>
      </h2>
      <p className="mt-2 text-sm font-bold leading-relaxed text-white">
        Del inglés cotidiano al inglés de negocios en un paquete inteligente. Si tu nivel es B1 y tu meta es profesional, esta es tu ruta: CelsTV te lleva a B2 mientras CelsBSNS te espera listo.
      </p>
      <div className="mt-3 flex flex-wrap items-center">
        <span className="mr-2 text-xl font-extrabold text-[#A9A4C0] line-through">$219</span>
        <span className="text-3xl font-extrabold text-white">$150</span>
        <span className="ml-1 text-sm font-extrabold text-[#A9A4C0]">USD</span>
        <span className="ml-2 inline-block rounded-full px-3 py-1 text-xs font-extrabold text-[#0d2210]" style={{ background: C.green }}>
          AHORRA $69
        </span>
      </div>
      <Mxn usd={150} rate={rate} />
      <ul className="mt-3">
        {["Todo CelsTV (32 episodios · English For Our Generation)", "Todo CelsBSNS (10 semanas · English for Business)", "Doble certificación de CelsUniversity", "Una sola ruta: de tu nivel actual al inglés profesional"].map((inc) => (
          <li key={inc} className="py-1.5 text-sm font-bold leading-snug text-white">
            <span style={{ color: C.green }}>✓ </span>
            {inc}
          </li>
        ))}
      </ul>
      <Link href={planHref("bundle")} className="mt-4 block w-full rounded-2xl py-4 text-center text-base font-extrabold text-[#3a2a00] transition hover:brightness-110" style={{ background: C.yellow }}>
        Quiero el paquete: $150 →
      </Link>
    </div>
  );
}

export function SalesFooter({ product }: { product: "celstv" | "celsbsns" }) {
  return (
    <div className="pb-24 pt-6 text-center text-xs font-bold text-[#A9A4C0]">
      <p>
        ¿Ya eres estudiante?{" "}
        <Link href="/entrar" className="font-extrabold" style={{ color: C.cyan }}>
          Inicia sesión
        </Link>
      </p>
      <p className="mt-3 leading-relaxed">
        {product === "celsbsns" ? "CelsBSNS" : "CelsTV"} es parte de CelsUniversity by Latin American Media (LAM)
        <br />
        {product === "celsbsns" ? "hola@celsuniversity.com · @Celstv" : "#EnglishForOurGeneration"}
      </p>
    </div>
  );
}

/** Fixed bottom call to action on phones. */
export function StickyCTA({ label, color, plan }: { label: string; color: string; plan: Plan }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#12101f]/90 p-3 backdrop-blur sm:hidden">
      <Link href={planHref(plan)} className="block w-full rounded-2xl py-3.5 text-center text-base font-extrabold text-white" style={{ background: color }}>
        {label}
      </Link>
    </div>
  );
}
