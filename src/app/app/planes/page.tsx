import Link from "next/link";
import { ENROLL_PROGRAMS, PROGRAM_BUNDLES, PURCHASES_OPEN, appPlansHref, checkoutHref, isEnrollProgram, planCode } from "@/lib/enroll";
import { enrollCopy } from "@/lib/i18n/enroll-copy";
import { getDictionary } from "@/lib/i18n/server";
import { missingGrants, type Grant } from "@/lib/grants";
import { PROGRAMS, productsFor, usd, type ProgramKey, type ShopProduct } from "@/lib/purchase";
import { createClient } from "@/lib/supabase/server";
import { RequestAccess } from "@/components/shop/RequestAccess";

export const metadata = { title: "Planes · CelsU" };

type Props = { searchParams: Promise<{ programa?: string; plan?: string }> };

const focus = "kit-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1830]";

/**
 * In-app plans of a program (Matt, 2026-10-20 item 2): every buy button inside /app lands here, so signed-in
 * students skip the evaluation. Names and prices come from public.products.
 * Purchases closed: "Solicitar acceso" saves profiles.requested_plan (RequestAccess → requestPlanAccess) and
 * confirms in place. Open: the checkout. ?plan=<code> highlights a card.
 */
export default async function AppPlanes({ searchParams }: Props) {
  const { programa, plan } = await searchParams;
  const { lang } = await getDictionary();
  const t = enrollCopy(lang);
  const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

  if (!isEnrollProgram(programa)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">{t.appKicker}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{t.appChoose}</h1>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {ENROLL_PROGRAMS.map((p) => (
            <li key={p}>
              <Link href={appPlansHref(p)} className={`block rounded-3xl p-5 text-white ${focus}`} style={{ background: PROGRAMS[p].bg }}>
                <span className="text-xl font-extrabold">{PROGRAMS[p].title}</span>
                <span className="mt-1 block text-sm text-white/85">{t.promise[p]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const meta = PROGRAMS[programa];
  const [own, bundles] = await Promise.all([productsFor({ program: programa }), Promise.all(PROGRAM_BUNDLES[programa].map((code) => productsFor({ code })))]);
  const products: ShopProduct[] = [...own, ...bundles.flat()];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id; // the /app shell sends signed-out visitors to /entrar
  const [{ data: me }, { data: grantRows }] = await Promise.all([
    supabase.from("profiles").select("requested_plan").eq("id", userId).maybeSingle(),
    supabase
      .from("products")
      .select("code, grants")
      .in(
        "code",
        products.map((p) => p.code),
      ),
  ]);
  // Already enrolled in everything a product gives: say so instead of offering it.
  const owned = new Set<string>();
  await Promise.all(
    (grantRows ?? []).map(async (r) => {
      const grants = Array.isArray(r.grants) ? (r.grants as Grant[]) : [];
      if (grants.length && !(await missingGrants(supabase, userId, grants)).length) owned.add(r.code);
    }),
  );
  const highlight = planCode(plan);
  const requested = me?.requested_plan ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <p className="text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">{t.appKicker}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{fill(t.appTitle, { program: meta.title })}</h1>
      <p className="mt-2 max-w-2xl text-[15px] font-semibold text-[#4A4766]">{PURCHASES_OPEN ? t.appSubOpen : t.appSubClosed}</p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {products.map((p) => {
          const program = (PROGRAMS as Record<string, (typeof PROGRAMS)[ProgramKey]>)[p.program] ?? meta;
          const chosen = p.code === highlight;
          const has = owned.has(p.code);
          const asked = p.code === requested;
          return (
            <li
              key={p.code}
              data-plan={p.code}
              data-chosen={chosen ? "true" : undefined}
              className="flex flex-col rounded-3xl border-2 bg-white p-5 shadow-sm sm:p-6"
              style={{ borderColor: chosen ? meta.color : p.tier === "premium" ? `${program.color}66` : "#EFE6F2", boxShadow: chosen ? `0 0 0 3px ${meta.color}40` : undefined }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">{p.program === "bundle" ? t.bundle : program.title}</span>
                {chosen && (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: meta.color, color: meta.ink }}>
                    {t.chosen}
                  </span>
                )}
                {asked && !has && <span className="rounded-full bg-[#E9F6EE] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1B4D31]">{t.requestedBadge}</span>}
              </div>
              <h2 className="mt-1 text-xl font-extrabold">{p.name}</h2>
              <p className="mt-2 text-3xl font-extrabold">
                {usd(p.installments ? p.installments[0] : p.price_usd_cents)}
                <span className="ml-1 text-sm font-bold text-[#6B6680]">{p.installments ? `USD × ${p.installments.length}` : t.oneTime}</span>
              </p>
              <p className="text-xs font-semibold text-[#6B6680]">{p.access_label}</p>
              {p.features.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm font-semibold text-[#3F3B52]">
                  {p.features.map((f) => (
                    <li key={f}>
                      <span className="text-[#2E8B57]" aria-hidden>
                        ✓
                      </span>{" "}
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-5">
                {has ? (
                  <Link href="/app/cursos" className={`flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#F1EDF5] px-5 text-sm font-extrabold text-[#1B1830] ${focus}`}>
                    {t.owned} · {t.goCourses} →
                  </Link>
                ) : PURCHASES_OPEN ? (
                  <Link
                    href={checkoutHref(p.code)}
                    data-testid="plan-buy"
                    className={`flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-extrabold ${focus}`}
                    style={{ background: meta.color, color: meta.ink }}
                  >
                    {t.buyCta} →
                  </Link>
                ) : (
                  <RequestAccess
                    plan={p.code}
                    back={appPlansHref(programa, p.code)}
                    color={meta.color}
                    ink={meta.ink}
                    t={{ cta: t.requestCta, done: t.requested, error: t.requestError }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center">
        <Link href="/app/planes" className={`text-sm font-bold text-[#4A4766] underline underline-offset-4 hover:text-[#1B1830] ${focus}`}>
          {t.otherPrograms}
        </Link>
      </p>
    </div>
  );
}
