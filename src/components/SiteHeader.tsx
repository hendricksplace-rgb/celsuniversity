import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { setLanguage } from "@/lib/actions";
import { SignOutButton } from "./SignOutButton";
import { getViewer } from "@/lib/access";
import { InstallButton } from "./install/InstallApp";

export async function SiteHeader() {
  const { lang, t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  const user = viewer?.user;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#1A1128]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Cels<span className="text-brand">U</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 whitespace-nowrap text-sm sm:gap-3">
          {/* On phones a signed-in student reaches the catalog from Inicio: room for "Descargar app". */}
          <Link href="/cursos" className={`rounded-lg px-2 py-1.5 hover:bg-white/10 ${user ? "hidden sm:inline-block" : ""}`}>
            {t.nav.courses}
          </Link>
          {user ? (
            <>
              <Link href="/app" className="rounded-lg px-2 py-1.5 hover:bg-white/10">
                {t.nav.myLearning}
              </Link>
              {viewer?.isStaff && (
                <Link href="/app/admin/libros" className="rounded-lg px-2 py-1.5 hover:bg-white/10">
                  {t.admin.booksTitle}
                </Link>
              )}
              <SignOutButton label={t.nav.signOut} />
            </>
          ) : (
            <>
              <Link href="/entrar" className="rounded-lg px-2 py-1.5 hover:bg-white/10">
                {t.nav.signIn}
              </Link>
              <Link href="/registro" className="btn-primary hidden sm:inline-flex">
                {t.nav.signUp}
              </Link>
            </>
          )}
          <InstallButton />
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={lang === "es" ? "en" : "es"} />
            <button
              aria-label={t.nav.languageLabel}
              className="rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold uppercase hover:bg-white/10"
            >
              {lang === "es" ? "EN" : "ES"}
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
