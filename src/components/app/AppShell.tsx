// Shell of the student area (/app): light CelsU background, top bar, bottom tab bar on phones.
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { setLanguage } from "@/lib/actions";
import { getViewer } from "@/lib/access";
import { InstallButton } from "@/components/install/InstallApp";
import { SignOutButton } from "@/components/SignOutButton";
import { TabBar, TopNav, type NavItem } from "./AppNav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app");

  // Teachers see "Mis clases" when they teach a class; staff always do.
  const { count } = await supabase.from("class_members").select("class_id", { count: "exact", head: true }).eq("user_id", viewer.user.id).eq("member_role", "teacher");
  const teaches = viewer.isStaff || (count ?? 0) > 0;
  const items: NavItem[] = [
    { href: "/app", label: t.shell.home, icon: "home" },
    { href: "/app/cursos", label: t.shell.courses, icon: "courses" },
    { href: "/app/progreso", label: t.shell.progress, icon: "progress" },
    ...(teaches ? [{ href: "/app/clases", label: t.shell.classes, icon: "classes" as const }] : []),
  ];
  const name = viewer.displayName || viewer.user.email || "";

  return (
    <div className="min-h-screen bg-[#F7F5FA] text-[#1B1830]">
      <header className="sticky top-0 z-30 border-b border-[#EFE6F2] bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/app" className="flex items-center gap-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5178C]">
            <Image src="/brand/celsu-u.png" alt="" width={30} height={20} />
            <span className="text-lg font-extrabold tracking-tight">CelsU</span>
          </Link>
          <div className="mx-auto">
            <TopNav items={items} />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <InstallButton />
            <details className="relative">
              <summary
                aria-label={t.shell.account}
                className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-gradient-to-br from-[#F5178C] to-[#35C3F0] text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C] [&::-webkit-details-marker]:hidden"
              >
                {name.trim().charAt(0).toUpperCase() || "?"}
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#EFE6F2] bg-white p-2 text-sm shadow-xl">
                <p className="truncate px-3 py-2 text-xs font-semibold text-[#6B6680]">{viewer.user.email}</p>
                <Link href="/cursos" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                  {t.shell.catalog}
                </Link>
                {viewer.isStaff && (
                  <Link href="/app/admin/libros" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                    {t.admin.booksTitle}
                  </Link>
                )}
                <Link href="/ayuda" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                  {t.footer.help}
                </Link>
                <form action={setLanguage}>
                  <input type="hidden" name="lang" value={lang === "es" ? "en" : "es"} />
                  <button className="w-full rounded-xl px-3 py-2 text-left font-bold hover:bg-[#F7F5FA]">{t.nav.language}</button>
                </form>
                <SignOutButton label={t.nav.signOut} className="w-full rounded-xl px-3 py-2 text-left font-bold text-[#D10F75] hover:bg-[#F7F5FA]" />
              </div>
            </details>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-16 md:pt-8">{children}</main>
      <TabBar items={items} />
    </div>
  );
}
