// Shell of the student area (/app): light CelsU background, top bar, bottom tab bar on phones.
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { setLanguage } from "@/lib/actions";
import { getViewer, isAdminRole } from "@/lib/access";
import { InstallButton } from "@/components/install/InstallApp";
import { SignOutButton } from "@/components/SignOutButton";
import { TabBar, TopNav, type NavItem } from "./AppNav";
import { withDefaults } from "@/lib/prefs";
import { BadgeWatcher } from "./BadgeWatcher";
import { CheerWatcher } from "@/components/leaderboard/CheerWatcher";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app");

  // "Mis clases": staff always; anyone in a class (teacher or student); and every student who has bought at least
  // one course or program (an active enrollment), Matt 2026-10-19.
  const [{ count }, { count: owned }, { data: me }, { data: prefRow }] = await Promise.all([
    supabase.from("class_members").select("class_id", { count: "exact", head: true }).eq("user_id", viewer.user.id),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.user.id)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    supabase.from("profiles").select("avatar_url").eq("id", viewer.user.id).maybeSingle(),
    supabase.from("user_preferences").select("sound_effects, show_spanish, autoplay_audio, text_size").eq("user_id", viewer.user.id).maybeSingle(),
  ]);
  const prefs = withDefaults(prefRow);
  const teaches = viewer.isStaff || (count ?? 0) > 0 || (owned ?? 0) > 0;
  const items: NavItem[] = [
    { href: "/app", label: t.shell.home, icon: "home" },
    { href: "/app/cursos", label: t.shell.courses, icon: "courses" },
    { href: "/app/progreso", label: t.shell.progress, icon: "progress" },
    ...(teaches ? [{ href: "/app/clases", label: t.shell.classes, icon: "classes" as const }] : []),
  ];
  const name = viewer.displayName || viewer.user.email || "";

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[#F7F5FA] text-[#1B1830]"
      data-prefs=""
      data-sound={prefs.sound_effects ? "on" : "off"}
      data-es={prefs.show_spanish ? "on" : "off"}
      data-autoplay={prefs.autoplay_audio ? "on" : "off"}
      data-text={prefs.text_size}
    >
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
                className="avatar-ring block h-10 w-10 cursor-pointer list-none rounded-full p-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C] [&::-webkit-details-marker]:hidden"
              >
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#7B61FF] to-[#E8137B] text-sm font-extrabold text-white">
                  {me?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public avatar, 256 px
                    <img src={me.avatar_url} alt="" width={36} height={36} className="h-full w-full object-cover" />
                  ) : (
                    name.trim().charAt(0).toUpperCase() || "?"
                  )}
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#EFE6F2] bg-white p-2 text-sm shadow-xl">
                <p className="truncate px-3 py-2 text-xs font-semibold text-[#6B6680]">{viewer.user.email}</p>
                <Link href="/app/cuenta" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                  {t.cuenta.title}
                </Link>
                <Link href="/cursos" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                  {t.shell.catalog}
                </Link>
                {isAdminRole(viewer.role) ? (
                  <Link href="/app/admin" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                    Admin
                  </Link>
                ) : (
                  viewer.isStaff && (
                    <>
                      <Link href="/app/admin/libros" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                        {t.admin.booksTitle}
                      </Link>
                      <Link href="/app/admin/entregas" className="block rounded-xl px-3 py-2 font-bold hover:bg-[#F7F5FA]">
                        {t.bsns.queueTitle}
                      </Link>
                    </>
                  )
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
      <BadgeWatcher title={t.progress.newMedal} cta={t.progress.seeMedals} />
      <CheerWatcher t={t.lb} />
      {/* Phones also get "Cuenta" as a tab; on larger screens it's in the avatar menu. */}
      <TabBar items={[...items, { href: "/app/cuenta", label: t.cuenta.title, icon: "account" }]} />
    </div>
  );
}
