"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushFinishedLessons, flushPending, offlineSupported, registerServiceWorker, renewDownloads } from "@/lib/offline";

/**
 * Mounted once in the root layout (so on every lesson and task page): whenever the app is (back) online or
 * visible again, send finished lessons queued by finishLesson, and (where offline e-books work) renew downloads
 * and send queued answers. The user comes from the local session (no request), so public pages
 * don't wait on an auth call on the server.
 */
export function OfflineSync() {
  useEffect(() => {
    const supabase = createClient();
    const offline = offlineSupported();
    let userId: string | null = null;
    let running = false;
    const sync = async () => {
      if (!navigator.onLine || running) return;
      running = true;
      try {
        userId = (await supabase.auth.getSession()).data.session?.user.id ?? null;
        // Finished lessons queue in localStorage on every browser (finishLesson), service worker or not.
        await Promise.all([
          flushFinishedLessons(supabase, userId),
          ...(offline ? [flushPending(supabase, userId), renewDownloads(supabase, userId)] : []),
        ]);
      } catch {
        /* next time */
      } finally {
        running = false;
      }
    };
    if (offline) void registerServiceWorker();
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
