"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushFinishedLessons, flushPending, offlineSupported, registerServiceWorker, renewDownloads } from "@/lib/offline";

/** Mounted once in the root layout: whenever the app is (back) online, renew downloads, send queued answers and finished parts. */
export function OfflineSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!offlineSupported()) return;
    const supabase = createClient();
    const sync = () => {
      if (!navigator.onLine) return;
      void flushPending(supabase, userId);
      void flushFinishedLessons(supabase, userId);
      void renewDownloads(supabase, userId);
    };
    void registerServiceWorker();
    sync();
    window.addEventListener("online", sync);
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);
  return null;
}
