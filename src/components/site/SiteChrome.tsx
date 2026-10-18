// Navigation and footer for the plain public pages (/privacidad, /terminos), matching the boards'
// header and footer. The program pages carry their own from their boards.
import Image from "next/image";
import Link from "next/link";

const focus = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#0F0D1E]";

export function SiteNav() {
  return (
    <header className="border-b border-[#ECEAF2] bg-white">
      <nav aria-label="Principal" className="mx-auto flex max-w-[1240px] items-center gap-5 px-5 py-3">
        <Link href="/" className={`mr-auto flex items-center gap-2.5 text-[#0F0D1E] ${focus}`}>
          <Image src="/site/celsu-logo.png" alt="" width={44} height={29} priority />
          <span className="flex flex-col gap-1 leading-none">
            <span className="text-[19px] font-extrabold tracking-tight">CelsUniversity</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[1.5px] text-[#6B6680]">
              BY <Image src="/site/lam-logo.png" alt="LAM" width={40} height={13} className="h-[13px] w-auto" />
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-[15px] font-semibold md:flex">
          <Link href="/#programas" className={`py-2.5 text-[#3F3B52] hover:text-[#0F0D1E] ${focus}`}>
            Programas
          </Link>
          <Link href="/#precios" className={`py-2.5 text-[#3F3B52] hover:text-[#0F0D1E] ${focus}`}>
            Precios
          </Link>
          <Link href="/entrar" className={`py-2.5 font-bold text-[#0F0D1E] ${focus}`}>
            Iniciar sesión
          </Link>
        </div>
        <Link href="/evaluacion" className={`rounded-full bg-[#D6006A] px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-[#B0005A] ${focus}`}>
          Evaluación gratis
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const link = `text-[#CFCBDB] hover:text-white ${focus} focus-visible:outline-white`;
  return (
    <footer className="bg-[#0F0D1E] px-5 pb-9 pt-14 text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-7">
        <div className="flex flex-wrap gap-x-16 gap-y-7">
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <Image src="/site/celsu-logo.png" alt="" width={42} height={28} />
              <span className="text-lg font-extrabold">CelsUniversity</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px] font-semibold text-[#CFCBDB]">
              Una empresa de <Image src="/site/lam-white.png" alt="Latin American Media" width={66} height={22} className="h-[22px] w-auto" />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <strong className="font-bold">Programas</strong>
            <Link href="/celstv" className={link}>CelsTV</Link>
            <Link href="/celsbsns" className={link}>CelsBSNS</Link>
            <Link href="/celsus" className={link}>CelsUS</Link>
            <Link href="/celsglobal" className={link}>CelsGLOBAL</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <strong className="font-bold">Contacto</strong>
            <a href="mailto:hola@celstv.com" className={link}>hola@celstv.com</a>
            <a href="https://wa.link/n5kdfs" className={link}>WhatsApp 449 497 5359</a>
            <span className="text-[#A9A4BA]">Lun–Vie, 9:00–18:00 (CDMX)</span>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <strong className="font-bold">Legal</strong>
            <Link href="/privacidad" className={link}>Aviso de Privacidad</Link>
            <Link href="/terminos" className={link}>Términos</Link>
            <Link href="/ayuda" className={link}>Ayuda</Link>
          </div>
        </div>
        <p className="border-t border-[#2A2640] pt-4 text-[13px] leading-relaxed text-[#A9A4BA]">
          CelsU es un producto de Latin American Media · Aguascalientes, México. © 2026 CelsUniversity by Latin American Media (LAM). CelsUS es un proveedor
          educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.
        </p>
      </div>
    </footer>
  );
}

/** A readable 720 px text column between the site nav and footer. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#F7F5FA] text-[#0F0D1E]">
      <SiteNav />
      <main className="mx-auto max-w-[720px] px-5 py-12">
        <h1 className="text-[clamp(30px,5vw,42px)] font-extrabold leading-tight tracking-tight">{title}</h1>
        <div className="legal mt-6 space-y-4 text-[16px] leading-relaxed text-[#3F3B52] [&_a]:font-bold [&_a]:text-[#C8005F] [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-[#0F0D1E] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#0F0D1E]">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

