import Link from "next/link";

export const metadata = { title: "Página no encontrada · CelsU" };

/** Friendly 404 in Spanish (old celstv.com addresses that no longer exist land here too). */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F5FA] px-4 font-[family-name:var(--font-jakarta)] text-[#0F0D1E]">
      <div className="max-w-md text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#C8005F]">Error 404</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">No encontramos esta página</h1>
        <p className="mt-3 text-[#3F3B52]">Puede que el enlace sea de nuestro sitio anterior. Empieza desde el inicio o descubre tu nivel de inglés gratis.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-[#0F0D1E] px-6 py-3 font-extrabold text-white hover:bg-[#2A2640]">
            Ir al inicio
          </Link>
          <Link href="/evaluacion" className="rounded-full bg-[#F20174] px-6 py-3 font-extrabold text-white hover:bg-[#C8005F]">
            Evaluación gratis
          </Link>
        </div>
      </div>
    </main>
  );
}
