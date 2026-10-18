import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { Mxn } from "@/components/shop/Mxn";
import { PROGRAMS, productsFor, programOf, usd } from "@/lib/purchase";

type Props = { searchParams: Promise<{ producto?: string }> };
export const metadata = { title: "Tu compra · CelsU" };

/** Step 2: what you're buying, your account, and the pay button (Stripe Checkout is step 3). */
export default async function Resumen({ searchParams }: Props) {
  const { producto } = await searchParams;
  const [p] = producto ? await productsFor({ code: producto }) : [];
  if (!p) notFound();
  const program = programOf(p);
  const meta = PROGRAMS[program];
  const plan = p.installments;
  const today = plan ? plan[0] : p.price_usd_cents;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const change = p.program === "bundle" ? (p.code === "bundle_tv_bsns" ? "/celsbsns" : "/cursos") : `/comprar/${p.program}`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">Paso 2 de 3</p>
        <h1 className="mt-1 text-3xl font-extrabold">Tu compra</h1>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-5" style={{ background: meta.bg, color: "#fff" }}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">{p.program === "bundle" ? "Paquete" : meta.title}</p>
            <h2 className="text-xl font-extrabold">{p.name}</h2>
            <p className="text-sm font-semibold opacity-85">Acceso por {p.access_label}</p>
          </div>
          <Link href={change} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold text-white hover:bg-white/25">
            Cambiar
          </Link>
        </div>
        <dl className="space-y-2 p-5 text-sm font-semibold">
          {plan ? (
            <>
              <div className="flex justify-between">
                <dt>Hoy (pago 1 de {plan.length})</dt>
                <dd>{usd(plan[0])}</dd>
              </div>
              <div className="flex justify-between text-[#6B6680]">
                <dt>Después, cada mes</dt>
                <dd>
                  {plan.length - 2} × {usd(plan[1])} y 1 × {usd(plan[plan.length - 1])}
                </dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <dt>{p.name}</dt>
              <dd>{usd(p.price_usd_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[#6B6680]">
            <dt>¿Tienes un código?</dt>
            <dd>Lo agregas en el siguiente paso</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-[#F1EDF5] pt-3">
            <dt className="text-base font-extrabold">{plan ? "Pagas hoy" : "Total"}</dt>
            <dd className="text-right">
              <b className="block text-2xl font-extrabold">{usd(today)} USD</b>
              <Mxn cents={today} className="text-xs font-semibold text-[#6B6680]" />
            </dd>
          </div>
        </dl>
      </section>

      <CheckoutForm product={p.code} signedInEmail={user?.email ?? null} payLabel={`Pagar ${usd(today)} con tarjeta`} color={meta.color} ink={meta.ink} />

      <p className="text-center text-xs font-semibold leading-relaxed text-[#6B6680]">
        El pago lo procesa Stripe; no guardamos tu tarjeta. Acceso por {p.access_label} desde hoy. Reembolso en las primeras 72 horas.{" "}
        <Link href="/ayuda" className="underline">
          Términos
        </Link>{" "}
        · Aviso de Privacidad (muy pronto)
      </p>
    </div>
  );
}
