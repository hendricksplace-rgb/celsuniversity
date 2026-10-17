import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

export default async function Home() {
  const { t } = await getDictionary();
  return (
    <div className="space-y-16">
      <section className="max-w-3xl space-y-6 pt-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">{t.home.eyebrow}</p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{t.home.headline}</h1>
        <p className="text-lg text-white/75">{t.home.sub}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registro" className="btn-primary">
            {t.home.ctaPrimary}
          </Link>
          <Link href="/cursos" className="btn-ghost">
            {t.home.ctaSecondary}
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {t.home.features.map((f) => (
          <div key={f.title} className="card">
            <h2 className="mb-2 font-bold">{f.title}</h2>
            <p className="text-sm text-white/70">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
