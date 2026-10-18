import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { SignOutButton } from "@/components/SignOutButton";
import { card } from "@/components/cuenta/ui";

export const metadata = { title: "Cuenta · CelsU" };

const ROWS = [
  { key: "datos", href: "/app/cuenta/datos", icon: "👤" },
  { key: "preferencias", href: "/app/cuenta/preferencias", icon: "⚙️" },
  { key: "seguridad", href: "/app/cuenta/seguridad", icon: "🔒" },
  { key: "compras", href: "/app/cuenta/compras", icon: "🧾" },
  { key: "ayuda", href: "/ayuda", icon: "❓" },
  { key: "privacidad", href: "/privacidad", icon: "🛡️" },
] as const;

/** Cuenta (spec §1): who you are, your programs, and the account pages. */
export default async function CuentaHome() {
  const { t } = await getDictionary();
  const tc = t.cuenta;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta");

  const [{ data: profile }, { data: enrollments }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", viewer.user.id).maybeSingle(),
    supabase.from("enrollments").select("status, program:programs(title), course:courses(title)").eq("user_id", viewer.user.id).eq("status", "active"),
  ]);
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
  const chips = [...new Set((enrollments ?? []).map((e) => one(e.program)?.title ?? one(e.course)?.title).filter((x): x is string => !!x))];
  const name = profile?.display_name || viewer.user.email || "";

  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      <section className={`${card} flex items-center gap-4`}>
        <Link href="/app/cuenta/datos" className="group relative shrink-0" aria-label={tc.changePhoto}>
          <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#F5178C] to-[#35C3F0] text-3xl font-extrabold text-white">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- public avatar
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              name.trim().charAt(0).toUpperCase()
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-white text-sm shadow-md" aria-hidden>
            📷
          </span>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{name}</h1>
          <p className="truncate text-sm font-semibold text-[#6B6680]">{viewer.user.email}</p>
          {chips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li key={c} className="rounded-full bg-[#FDE7F2] px-2.5 py-1 text-xs font-extrabold text-[#B0105F]">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <nav className={`${card} !p-2`}>
        <ul className="divide-y divide-[#F3EFF7]">
          {ROWS.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="flex items-center gap-3 rounded-xl px-3 py-3.5 hover:bg-[#F7F5FA]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F7F5FA]" aria-hidden>
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block">{tc.rows[r.key]}</strong>
                  <span className="block text-sm text-[#6B6680]">{tc.rowSubs[r.key]}</span>
                </span>
                <span className="text-[#B3ADC2]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
          <li>
            <SignOutButton label={tc.signOut} className="w-full rounded-xl px-3 py-3.5 text-left font-extrabold text-[#D10F75] hover:bg-[#F7F5FA]" />
          </li>
        </ul>
      </nav>

      <p className="pt-2 text-center">
        <Link href="/app/cuenta/eliminar" className="text-sm font-semibold text-[#C0262D] underline-offset-2 hover:underline">
          {tc.deleteLink}
        </Link>
      </p>
    </div>
  );
}
