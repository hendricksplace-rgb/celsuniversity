"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Progreso shows the latest numbers when the student comes back to it: a copy from the client router cache
 * (back / forward, or a link to a page seen a moment ago) is older than its render time, so it is fetched again;
 * so is a tab that comes back to the front after a while.
 */
export function FreshOnReturn({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  useEffect(() => {
    let seen = renderedAt;
    if (Date.now() - renderedAt > 3000) {
      seen = Date.now();
      router.refresh();
    }
    const again = () => {
      if (document.visibilityState === "visible" && Date.now() - seen > 30_000) {
        seen = Date.now();
        router.refresh();
      }
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        seen = Date.now();
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", again);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("pageshow", onShow);
    };
  }, [renderedAt, router]);
  return null;
}
