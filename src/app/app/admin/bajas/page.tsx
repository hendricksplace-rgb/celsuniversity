import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, isAdminRole } from "@/lib/access";

export const metadata = { title: "Solicitudes de eliminación · CelsU" };

/** ARCO tracking: account deletion requests and when each one was completed. */
export default async function DeletionRequests() {
  const { t, lang } = await getDictionary();
  const tc = t.cuenta;
  const supabase = await createClient();
  const viewer = (await getViewer(supabase))!;
  if (!isAdminRole(viewer.role)) notFound();
  const { data } = await supabase.from("account_deletion_requests").select("id, email, reason, requested_at, completed_at").order("requested_at", { ascending: false }).limit(500);
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-extrabold">{tc.requestsTitle}</h1>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">{tc.requestsSub}</p>
      </header>
      {!data?.length ? (
        <p className="rounded-2xl bg-white p-5 shadow-sm">{tc.requestsEmpty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#EFE6F2] bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#6B6680]">
              <tr>
                <th className="px-4 py-3 font-extrabold">{tc.email}</th>
                <th className="px-2 py-3 font-extrabold">{tc.requested}</th>
                <th className="px-2 py-3 font-extrabold">{tc.completed}</th>
                <th className="px-4 py-3 font-extrabold">{tc.reason.replace(/\s*\(.*\)$/, "")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-[#F3EFF7]">
                  <td className="px-4 py-2.5 font-bold">{r.email ?? "—"}</td>
                  <td className="px-2 py-2.5 text-[#6B6680]">{fmt.format(new Date(r.requested_at))}</td>
                  <td className="px-2 py-2.5">
                    {r.completed_at ? (
                      <span className="text-[#1E7A3A]">✓ {fmt.format(new Date(r.completed_at))}</span>
                    ) : (
                      <span className="font-bold text-[#8A6400]">{tc.inProgress}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#6B6680]">{r.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
