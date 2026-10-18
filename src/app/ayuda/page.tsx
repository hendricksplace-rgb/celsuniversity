import Image from "next/image";
import Link from "next/link";
import { HelpCenter } from "@/components/help/HelpCenter";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "Centro de ayuda · CelsU",
  description: "Respuestas sobre tu cuenta, la app, los pagos, los reembolsos y tus cursos.",
  alternates: { canonical: "/ayuda" },
  openGraph: { title: "Centro de ayuda · CelsU", description: "Respuestas sobre tu cuenta, la app, los pagos, los reembolsos y tus cursos.", locale: "es_MX", type: "website", images: [{ url: "/og/celsu.png", width: 1200, height: 630 }] },
};

/** Public help center: light CelsU style, one 720 px column. */
export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-[#F7F5FA] text-[#1B1830]">
      <header className="border-b border-[#EFE6F2] bg-white">
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5178C]">
            <Image src="/brand/celsu-u.png" alt="" width={30} height={20} />
            <span className="text-lg font-extrabold">CelsU</span>
          </Link>
          <Link href="/app" className="rounded-full bg-[#1B1830] px-4 py-2 text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]">
            Ir a la app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">¿Cómo te ayudamos?</h1>
        <p className="mt-2 text-base font-semibold text-[#4A4766]">Respuestas rápidas a lo que más nos preguntan. Si no encuentras lo que buscas, escríbenos.</p>
        <div className="mt-6">
          <HelpCenter />
        </div>
      </main>
      <footer className="border-t border-[#EFE6F2] py-6 text-center text-xs font-semibold text-[#6B6680]">© {new Date().getFullYear()} Latin American Media</footer>
    </div>
  );
}
