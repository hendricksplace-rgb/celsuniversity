import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { fill } from "@/components/course/kit";
import { CuentaPage, card } from "@/components/cuenta/ui";

export const metadata = { title: "Mis compras · CelsU" };

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })} USD`;

/** Mis compras: the student's orders and each payment (the 5-payment CelsGLOBAL plan shows every one). */
export default async function ComprasPage() {
  const { t, lang } = await getDictionary();
  const tc = t.cuenta;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/compras");
  const [{ data: orders }, { data: payments }] = await Promise.all([
    supabase.from("orders").select("id, amount_usd_cents, status, created_at, paid_at, card_last4, product:products(name, installments)").eq("user_id", viewer.user.id).order("created_at", { ascending: false }),
    supabase.from("payments").select("order_id, kind, amount_usd_cents, card_last4, created_at").eq("user_id", viewer.user.id).order("created_at"),
  ]);
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { dateStyle: "long", timeZone: "America/Mexico_City" });
  const list = (orders ?? []).filter((o) => o.status !== "pending" || o.paid_at);

  return (
    <CuentaPage title={tc.rows.compras} back="/app/cuenta" backLabel={tc.back}>
      {list.length === 0 ? (
        <p className={card}>{tc.purchasesEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => {
            const product = one(o.product);
            const pays = (payments ?? []).filter((p) => p.order_id === o.id);
            return (
              <li key={o.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold">{product?.name ?? "CelsU"}</h2>
                    <p className="text-sm text-[#6B6680]">{fmt.format(new Date(o.paid_at ?? o.created_at))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold">{usd(o.amount_usd_cents ?? 0)}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${o.status === "paid" ? "bg-[#E3F1E6] text-[#1E7A3A]" : "bg-[#FFF4D6] text-[#8A6400]"}`}>
                      {o.status === "paid" ? tc.paid : tc.pending}
                    </span>
                  </div>
                </div>
                {pays.length > 1 && (
                  <ul className="mt-3 divide-y divide-[#F3EFF7] border-t border-[#F3EFF7] text-sm">
                    {pays.map((p, i) => (
                      <li key={`${p.created_at}:${i}`} className="flex justify-between py-2">
                        <span>
                          {fill(tc.installment, { n: i + 1 })} · {fmt.format(new Date(p.created_at))}
                        </span>
                        <span className="font-bold">{usd(p.amount_usd_cents ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(o.card_last4 ?? pays[0]?.card_last4) && <p className="mt-2 text-xs text-[#6B6680]">{fill(tc.card, { n: o.card_last4 ?? pays[0]?.card_last4 ?? "" })}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </CuentaPage>
  );
}
