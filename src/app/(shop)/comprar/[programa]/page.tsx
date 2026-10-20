import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mxn } from "@/components/shop/Mxn";
import { PROGRAMS, isProgram, planDates, productsFor, usd } from "@/lib/purchase";
import { closedPurchaseRedirect } from "@/lib/purchase-closed";

type Props = { params: Promise<{ programa: string }> };
export const metadata = { title: "Elige tu plan · CelsU" };

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

/** Step 1: Standard vs Premium (or, for CelsGLOBAL, one payment vs 5). Single-option programs skip it. */
export default async function ElegirPlan({ params }: Props) {
  const { programa } = await params;
  if (!isProgram(programa)) notFound();
  await closedPurchaseRedirect(programa);
  const products = await productsFor({ program: programa });
  if (!products.length) notFound();
  if (products.length === 1) redirect(`/comprar/resumen?producto=${products[0].code}`);
  const meta = PROGRAMS[programa];
  const access = products[0].access_label;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">Paso 1 de 3</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{programa === "celsglobal" ? "¿Cómo prefieres pagar?" : `Elige tu plan de ${meta.title}`}</h1>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {products.map((p) => {
          const plan = p.installments;
          const featured = p.tier === "premium";
          return (
            <li key={p.code}>
              <Link
                href={`/comprar/resumen?producto=${p.code}`}
                className={`flex h-full flex-col rounded-3xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 motion-reduce:transition-none ${focus}`}
                style={{ borderColor: featured ? meta.color : "#EFE6F2" }}
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2" style={{ borderColor: meta.color }} aria-hidden />
                  <b className="text-lg font-extrabold">{plan ? "5 pagos mensuales" : programa === "celsglobal" ? "Un solo pago" : p.name}</b>
                </span>
                <span className="mt-3 text-4xl font-extrabold">
                  {plan ? `${usd(plan[0])}` : usd(p.price_usd_cents)}
                  <span className="ml-1 text-base font-bold text-[#6B6680]">{plan ? "USD/mes" : "USD"}</span>
                </span>
                <Mxn cents={plan ? plan[0] : p.price_usd_cents} className="text-sm font-semibold text-[#6B6680]" />
                {plan && (
                  <ol className="mt-4 space-y-1 text-sm font-semibold text-[#4A4766]">
                    {planDates(plan.length).map((d, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{i === 0 ? "Hoy" : fmt(d)}</span>
                        <b>{usd(plan[i])}</b>
                      </li>
                    ))}
                    <li className="flex justify-between border-t border-[#F1EDF5] pt-1 font-extrabold text-[#1B1830]">
                      <span>Total</span>
                      <span>{usd(plan.reduce((a, b) => a + b, 0))}</span>
                    </li>
                  </ol>
                )}
                {p.features.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm font-semibold">
                    {p.features.map((f) => (
                      <li key={f}>
                        <span className="text-[#2E8B57]">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <span className="mt-auto pt-5">
                  <span className="inline-flex w-full justify-center rounded-full px-5 py-3 text-sm font-extrabold" style={{ background: meta.color, color: meta.ink }}>
                    Elegir →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-sm font-semibold text-[#6B6680]">Acceso por {access}. Se cobra en dólares; la referencia en pesos cambia con el tipo de cambio del día.</p>
    </div>
  );
}
