"use client";

// C-029 "Avísame cuando esté listo": a CelsBSNS video the student asked about now has its file. Shown once, as a
// small notice on Inicio or the course pages (take_ready_videos marks it as told).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHERE = /^\/app($|\/cursos\/english-for-business|\/progreso$|\/mis-cursos)/;

export function VideoReadyWatcher({ label, go }: { label: string; go: string }) {
  const pathname = usePathname();
  const [ready, setReady] = useState<{ lesson_id: string; title: string } | null>(null);
  useEffect(() => {
    if (!WHERE.test(pathname)) return;
    let cancelled = false;
    const h = setTimeout(async () => {
      const { data } = await createClient().rpc("take_ready_videos");
      const list = (data ?? []) as unknown as { lesson_id: string; title: string }[];
      if (!cancelled && list.length) setReady(list[0]);
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [pathname]);
  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => setReady(null), 9000);
    return () => clearTimeout(h);
  }, [ready]);
  if (!ready) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-[#13284D] p-3 pl-4 text-white shadow-2xl md:bottom-6"
    >
      <span className="min-w-0 flex-1 text-sm font-bold">{label.replace("{title}", ready.title.replace(/^Week\s*\d+\s*\|\s*/i, ""))}</span>
      <Link
        href={`/app/lecciones/${ready.lesson_id}`}
        className="shrink-0 rounded-xl bg-[#2C6BC4] px-3 py-2 text-sm font-extrabold"
        onClick={() => setReady(null)}
      >
        {go}
      </Link>
    </div>
  );
}
