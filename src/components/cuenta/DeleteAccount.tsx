"use client";

// Eliminar mi cuenta (spec §6): the warning, an optional reason, "Escribe ELIMINAR", then the
// delete-account function. Afterwards the session is gone and /cuenta-eliminada says so.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { card, input } from "./ui";

type T = Dictionary["cuenta"];

export function DeleteAccount({ t }: { t: T }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = word.trim().toUpperCase() === t.confirmWord;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const label = (t.reasons as Record<string, string>)[reason];
    const { error: fe } = await supabase.functions.invoke("delete-account", {
      body: { confirm: "ELIMINAR", reason: [reason && label, detail.trim()].filter(Boolean).join(" · ") || undefined },
    });
    if (fe) {
      setBusy(false);
      return setError(t.deleteError);
    }
    // The account no longer exists: drop the local session (no server call needed) and leave.
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/cuenta-eliminada");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="rounded-[18px] border-2 border-[#F2B8BB] bg-[#FFF5F5] p-5">
        <h2 className="text-xl font-extrabold text-[#A3121A]">⚠️ {t.deleteTitle}</h2>
        <p className="mt-2 font-semibold">{t.deleteLose}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {t.deleteItems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[#5E2328]">{t.deleteMonthly}</p>
      </section>

      <section className={`${card} space-y-3`}>
        <div>
          <label htmlFor="reason" className="mb-1 block text-sm font-extrabold">
            {t.reason}
          </label>
          <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
            {Object.entries(t.reasons).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="detail" className="mb-1 block text-sm font-extrabold">
            {t.reasonText}
          </label>
          <textarea id="detail" rows={3} maxLength={800} value={detail} onChange={(e) => setDetail(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-extrabold">
            {t.confirmLabel}
          </label>
          <input id="confirm" autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} className={input} />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-[#C0262D]">
            {error}
          </p>
        )}
        <button
          disabled={!ready || busy}
          className="w-full rounded-full bg-[#C0262D] px-6 py-3.5 font-extrabold text-white transition hover:bg-[#A3121A] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C0262D]"
        >
          {busy ? t.deleting : t.deleteButton}
        </button>
      </section>
    </form>
  );
}
