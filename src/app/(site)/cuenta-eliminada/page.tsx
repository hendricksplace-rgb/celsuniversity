import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Cuenta eliminada · CelsU", robots: { index: false } };

/** Shown after Eliminar mi cuenta: the account and session are already gone. */
export default async function CuentaEliminada() {
  const { t } = await getDictionary();
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-5xl" aria-hidden>
        👋
      </p>
      <h1 className="mt-4 text-3xl font-extrabold">{t.cuenta.deletedTitle}</h1>
      <p className="mt-3 text-[#6B6680]">{t.cuenta.deletedText}</p>
      <Link href="/" className="mt-8 inline-flex rounded-full bg-[#F5178C] px-6 py-3 font-extrabold text-white hover:bg-[#D10F75]">
        {t.cuenta.deletedHome}
      </Link>
    </div>
  );
}
