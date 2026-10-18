"use client";

// "Llévatelo sin internet": downloads the episode screen and its parts (never the video) for 7 days.
// States: Descargar → Descargando con Wi-Fi… → Disponible sin conexión · Quedan N días.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { downloadEpisode, offlineEntry, offlineSupported, removeBook } from "@/lib/offline";
import { fill } from "./kit";

type T = Dictionary["episode"];
type State = { s: "idle" } | { s: "loading"; pct: number } | { s: "done"; days: number; mb: string } | { s: "error" } | { s: "unsupported" };

const daysLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));
const mb = (bytes: number) => (bytes / 1048576).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " MB";

export function EpisodeDownload({ t, episodeKey, moduleId, userId, pages }: { t: T; episodeKey: string; moduleId: string; userId: string; pages: string[] }) {
  const [state, setState] = useState<State>({ s: "idle" });

  useEffect(() => {
    if (!offlineSupported()) return setState({ s: "unsupported" });
    void offlineEntry(episodeKey).then((b) => b && setState({ s: "done", days: daysLeft(b.expiresAt), mb: mb(b.bytes) }));
  }, [episodeKey]);

  const start = async () => {
    setState({ s: "loading", pct: 0 });
    try {
      const book = await downloadEpisode(createClient(), {
        key: episodeKey,
        moduleId,
        userId,
        pages,
        onProgress: (d, total) => setState({ s: "loading", pct: Math.round((d / total) * 100) }),
      });
      setState({ s: "done", days: daysLeft(book.expiresAt), mb: mb(book.bytes) });
    } catch {
      setState({ s: "error" });
    }
  };
  const remove = async () => {
    await removeBook(createClient(), episodeKey);
    setState({ s: "idle" });
  };

  const icon = (done: boolean) => (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-[13px]"
      style={{
        background: done ? "linear-gradient(160deg, #A6EB6E, #3A9A1A)" : "linear-gradient(160deg, #F567B1, #B04378)",
        boxShadow: done ? undefined : "0 8px 16px -8px #F20174",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={done ? 3 : 2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d={done ? "M20 6 9 17l-5-5" : "M12 4v11M7 10l5 5 5-5M5 20h14"} />
      </svg>
    </span>
  );

  return (
    <div className="space-y-2.5 rounded-[20px] border border-white/10 bg-white/[.06] p-3.5" aria-live="polite">
      {state.s === "loading" ? (
        <>
          <div className="flex items-baseline justify-between">
            <strong className="text-[15px] font-extrabold">{t.offLoading}</strong>
            <span className="text-xs font-bold text-[#F567B1]">{state.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-white/10" role="progressbar" aria-label={t.offLoading} aria-valuenow={state.pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded bg-gradient-to-r from-[#F567B1] to-[#FFEF05] transition-[width]" style={{ width: `${state.pct}%` }} />
          </div>
        </>
      ) : state.s === "done" ? (
        <div className="flex items-center gap-3">
          {icon(true)}
          <div className="min-w-0 flex-1">
            <strong className="block text-[15px] font-extrabold">{t.offDone}</strong>
            <span className="text-xs text-white/70">
              {fill(t.offDays, { n: state.days })} · {state.mb}
            </span>
          </div>
          <button type="button" onClick={() => void remove()} className="kit-focus-light rounded-lg px-2 py-1.5 text-xs font-bold text-[#F78FC4]">
            {t.offRemove}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {icon(false)}
          <div className="min-w-0 flex-1">
            <strong className="block text-[15px] font-extrabold">{t.offTitle}</strong>
            <span className="text-xs text-white/70">{state.s === "unsupported" ? t.offUnsupported : state.s === "error" ? t.offError : t.offSub}</span>
          </div>
          {state.s !== "unsupported" && (
            <button type="button" onClick={() => void start()} className="kit-focus-light shrink-0 rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-extrabold text-[#160C1F]">
              {t.offDownload}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
