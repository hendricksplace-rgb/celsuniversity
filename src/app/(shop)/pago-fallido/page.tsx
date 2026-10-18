import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ producto?: string }> };
export const metadata = { title: "Tu pago no se completó · CelsU" };

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

/** Stripe's cancel_url, and where a failed payment ends up. */
export default async function PagoFallido({ searchParams }: Props) {
  const { producto } = await searchParams;
  const { data } = await (await createClient()).from("settings").select("value").eq("key", "whatsapp_url").maybeSingle();
  const whatsapp = typeof data?.value === "string" && data.value.startsWith("https://") ? data.value : null;
  const retry = producto && /^[a-z_]+$/.test(producto) ? `/comprar/resumen?producto=${producto}` : "/cursos";

  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFE3F0] text-3xl" aria-hidden>
        !
      </div>
      <h1 className="text-3xl font-extrabold">Tu pago no se completó</h1>
      <p className="font-semibold text-[#4A4766]">No se hizo ningún cargo.</p>
      <section className="rounded-3xl border border-[#EFE6F2] bg-white p-5 text-left shadow-sm">
        <h2 className="font-extrabold">Lo más común</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm font-semibold text-[#4A4766]">
          <li>Tu banco bloqueó el cargo en dólares. Llámalo o autorízalo en su app y vuelve a intentar.</li>
          <li>Algún dato de la tarjeta no coincide: número, fecha o código de seguridad.</li>
          <li>La tarjeta no tiene saldo o límite suficiente. Prueba con otra.</li>
        </ul>
      </section>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={retry} className={`rounded-full bg-[#F5178C] px-6 py-3.5 font-extrabold text-white ${focus}`}>
          Intentar de nuevo
        </Link>
        <a
          href={whatsapp ?? "mailto:hola@celstv.com?subject=Ayuda%20con%20mi%20pago"}
          className={`rounded-full border-2 border-[#1B1830] px-6 py-3.5 font-extrabold ${focus}`}
          {...(whatsapp ? { target: "_blank", rel: "noopener" } : {})}
        >
          {whatsapp ? "Escríbenos por WhatsApp" : "Escríbenos por correo"}
        </a>
      </div>
    </div>
  );
}
