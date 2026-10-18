"use client";

// Navigation of the student area: links in the top bar on desktop, tab bar at the bottom on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: "home" | "courses" | "progress" | "classes" | "account" };

const ICONS: Record<NavItem["icon"], React.ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  courses: <path d="M5 4.5h5a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H5zM19 4.5h-5a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h5z" />,
  progress: <path d="M5 20V13M10 20V9M15 20v-5M20 20V5" />,
  account: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />,
  classes: <path d="M12 4 3 8.5l9 4.5 9-4.5zM7 10.6V15c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.4" />,
};

const active = (pathname: string, href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-1 md:flex">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={active(pathname, it.href) ? "page" : undefined}
          className="rounded-full px-3.5 py-1.5 text-sm font-bold text-[#4A4766] transition hover:bg-[#F1EDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5178C] aria-[current=page]:bg-[#1B1830] aria-[current=page]:text-white"
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EFE6F2] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md">
        {items.map((it) => {
          const on = active(pathname, it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5178C] ${on ? "text-[#F5178C]" : "text-[#6B6680]"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
                  {ICONS[it.icon]}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
