"use client";

// New medals (public.badges rules, awarded by private.award_badges): checked on every page change in
// the student area. Each new one gets a toast and confetti, unless "Sonidos y celebraciones" is off;
// either way it's marked seen (ack_badges, C-025: my_new_badges no longer marks them) and shows on Progreso.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientPref } from "@/lib/prefs";
import { Confetti, sfx } from "@/components/part/fx";

type Medal = {
  code: string;
  name: string;
  color: string;
  icon?: string | null;
};

export function BadgeWatcher({ title, cta }: { title: string; cta: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [queue, setQueue] = useState<Medal[]>([]);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // A moment after the page settles, so a finished lesson has been recorded.
    const h = setTimeout(async () => {
      const db = createClient();
      const { data } = await db.rpc("my_new_badges");
      if (cancelled || !data?.length) return;
      await db.rpc("ack_badges", { codes: data.map((m) => m.code) });
      if (pathname.startsWith("/app/progreso")) router.refresh();
      if (!clientPref("sound")) return;
      setQueue((q) => [...q, ...data]);
      setBurst((b) => b + 1);
      sfx.correct();
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!queue.length) return;
    const h = setTimeout(() => setQueue((q) => q.slice(1)), 4500);
    return () => clearTimeout(h);
  }, [queue]);

  // The cheers overlay (C-026) waits while a medal toast is up.
  useEffect(() => {
    document.documentElement.dataset.badgeToast = queue.length ? "1" : "";
  }, [queue]);

  const m = queue[0];
  return (
    <>
      <Confetti burst={burst} />
      {m && (
        <div
          role="status"
          className="fixed inset-x-4 top-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-2xl ring-1 ring-[#EFE6F2] motion-safe:animate-[cu-pop_.4s_ease-out]"
        >
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full text-xl font-extrabold text-white"
            style={{
              background: m.color,
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${m.color}`,
            }}
            aria-hidden
          >
            {m.icon && m.icon !== "e" ? m.icon : "★"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-[#6B6680]">{title}</span>
            <strong className="block truncate text-[15px]">{m.name}</strong>
          </span>
          <a href="/app/progreso" className="shrink-0 text-sm font-extrabold text-[#D10F75] hover:underline">
            {cta}
          </a>
        </div>
      )}
    </>
  );
}
