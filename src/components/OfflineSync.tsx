"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushFinishedLessons, flushPending, offlineSupported, registerServiceWorker, renewDownloads } from "@/lib/offline";

/**
 * Mounted once in the root layout: whenever the app is (back) online, renew downloads, send queued
 * answers and finished parts. The user comes from the local session (no request), so public pages
 * don't wait on an auth call on the server.
 */
export function OfflineSync() {
  useEffect(() => {
    if (!offlineSupported()) return;
    const supabase = createClient();
    let userId: string | null = null;
    const sync = async () => {
      if (!navigator.onLine) return;
      userId = (await supabase.auth.getSession()).data.session?.user.id ?? null;
      void flushPending(supabase, userId);
      void flushFinishedLessons(supabase, userId);
      void renewDownloads(supabase, userId);
    };
    void registerServiceWorker();
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const onVisible = () => document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
