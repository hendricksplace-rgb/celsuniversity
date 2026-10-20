import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { setLanguage } from "@/lib/actions";
import { ENROLL_PROGRAMS, evalHref, isEnrollProgram, plansHref } from "@/lib/enroll";
import { enrollCopy } from "@/lib/i18n/enroll-copy";
import { getLang } from "@/lib/i18n/server";
import { PROGRAMS } from "@/lib/purchase-programs";

// Enrollment entry point (Matt, 2026-10-20): every buy/enroll button on the site lands here with its program.
// Free evaluation first; "ver los planes" skips it.
export const metadata: Metadata = {
  title: "Inscríbete · CelsU",
  robots: { index: false, follow: true },
  alternates: { canonical: "/inscribirme" },
};

type Props = { searchParams: Promise<{ programa?: string }> };

const focus = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#0F0D1E]";

export default async function Inscribirme({ searchParams }: Props) {
  const { programa } = await searchParams;
  const lang = await getLang();
  const t = enrollCopy(lang);
  const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F5FA] text-[#0F0D1E]">
      <SiteNav />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[2px] text-[#C8005F]">{t.kicker}</span>
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={lang === "es" ? "en" : "es"} />
            <button
              aria-label={lang === "es" ? "EN: Switch to English" : "ES: Cambiar a español"}
              className={`rounded-full border border-[#DAD5E4] bg-white px-3 py-1.5 text-xs font-extrabold uppercase text-[#3F3B52] hover:bg-[#F1EDF5] ${focus}`}
            >
              {lang === "es" ? "EN" : "ES"}
            </button>
          </form>
        </div>

        {isEnrollProgram(programa) ? (
          <ProgramEntry programa={programa} t={t} fill={fill} />
        ) : (
          <section aria-labelledby="choose-title">
            <h1 id="choose-title" className="text-[clamp(28px,5vw,42px)] font-extrabold leading-tight tracking-tight">
              {t.chooseTitle}
            </h1>
            <p className="mt-3 max-w-[620px] text-[17px] leading-relaxed text-[#3F3B52]">{t.chooseSub}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {ENROLL_PROGRAMS.map((p) => (
                <li key={p}>
                  <Link
                    href={`/inscribirme?programa=${p}`}
                    data-programa={p}
                    className={`flex h-full flex-col gap-3 rounded-[22px] p-6 text-white shadow-[0_24px_48px_-28px_rgba(15,13,30,.6)] transition hover:-translate-y-0.5 motion-reduce:transition-none ${focus}`}
                    style={{ background: PROGRAMS[p].bg }}
                  >
                    <span className="text-2xl font-extrabold">{PROGRAMS[p].title}</span>
                    <span className="text-[15px] leading-relaxed text-white/85">{t.promise[p]}</span>
                    <span className="mt-auto pt-2">
                      <span className="inline-flex rounded-full px-5 py-2.5 text-sm font-extrabold" style={{ background: PROGRAMS[p].color, color: PROGRAMS[p].ink }}>
                        {t.choose} →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ProgramEntry({ programa, t, fill }: { programa: (typeof ENROLL_PROGRAMS)[number]; t: ReturnType<typeof enrollCopy>; fill: (s: string, v: Record<string, string>) => string }) {
  const meta = PROGRAMS[programa];
  return (
    <section aria-labelledby="enroll-title" className="overflow-hidden rounded-[28px] text-white shadow-[0_34px_70px_-30px_rgba(15,13,30,.7)]" style={{ background: meta.bg }}>
      <div className="flex flex-col gap-5 px-5 py-9 sm:px-10 sm:py-12">
        <h1 id="enroll-title" className="text-[clamp(30px,6vw,48px)] font-extrabold leading-[1.08] tracking-tight">
          {meta.title}
        </h1>
        <p className="max-w-[620px] text-[18px] leading-relaxed text-white/90">{t.promise[programa]}</p>

        <ol className="flex flex-wrap gap-2 text-[13px] font-bold text-white/85">
          {t.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold" style={{ background: meta.color, color: meta.ink }}>
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <div className="mt-2 flex flex-col items-stretch gap-4 sm:items-start">
          <Link
            href={evalHref(programa)}
            data-testid="enroll-eval"
            className={`inline-flex min-h-[52px] items-center justify-center rounded-full px-6 py-3.5 text-center text-base font-extrabold shadow-lg transition hover:brightness-110 ${focus} focus-visible:outline-white`}
            style={{ background: meta.color, color: meta.ink }}
          >
            {t.primary} →
          </Link>
          <p className="text-sm text-white/75">{t.primaryNote}</p>
          <Link href={plansHref(programa)} data-testid="enroll-skip" className={`self-start text-[15px] font-bold text-white underline underline-offset-4 hover:text-white/80 ${focus} focus-visible:outline-white`}>
            {t.skip}
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/15 px-5 py-4 sm:px-10">
        <Link href="/inscribirme" className={`text-sm font-semibold text-white/80 hover:text-white ${focus} focus-visible:outline-white`}>
          {fill("← {x}", { x: t.other })}
        </Link>
      </div>
    </section>
  );
}
