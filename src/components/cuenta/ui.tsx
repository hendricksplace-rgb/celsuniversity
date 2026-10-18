// Shared pieces of the Cuenta pages (celsu-cuenta-spec.md): the light CelsU shell, cards with radius 18,
// the pink primary button and a 720 px column on desktop.
import Link from "next/link";

export const card = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_#EFE6F2]";
export const primary =
  "inline-flex items-center justify-center rounded-full bg-[#D6006A] px-6 py-3 font-extrabold text-white transition hover:bg-[#B0005A] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
export const input =
  "block w-full rounded-xl border border-[#E3DDEA] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[#F5178C] focus:ring-2 focus:ring-[#F5178C]/20";

export function CuentaPage({ title, back, backLabel, children }: { title: string; back?: string; backLabel?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      {back && (
        <Link href={back} className="inline-flex items-center gap-1 text-sm font-bold text-[#6B6680] hover:text-[#1B1830]">
          ‹ {backLabel}
        </Link>
      )}
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {children}
    </div>
  );
}
