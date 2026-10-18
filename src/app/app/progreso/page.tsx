import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadProgress } from "@/lib/progress-page";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
const card = "rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6";

export const metadata = { title: "Progreso · CelsU" };

export default async function Progreso() {
  const { t, lang } = await getDictionary();
  const p = t.progress;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [d, { data: prefs }] = await Promise.all([
    loadProgress(supabase, user!.id), // the /app shell already sent signed-out visitors to /entrar
    supabase.from("user_preferences").select("daily_goal_xp").eq("user_id", user!.id).maybeSingle(),
  ]);
  // Cuenta → Preferencias → Meta diaria de XP.
  const GOAL = prefs?.daily_goal_xp ?? 50;

  const weekTotal = d.xpWeek.reduce((a, b) => a + b, 0);
  const max = Math.max(GOAL, ...d.xpWeek);
  const bestDay = weekTotal ? d.xpWeek.indexOf(Math.max(...d.xpWeek)) : -1;
  const levelIdx = d.level ? LEVELS.indexOf(d.level) : -1;
  const medals = d.medals;
  const earnedCount = medals.filter((m) => d.earned.has(m.code)).length;
  const locale = lang === "en" ? "en-US" : "es-MX";

  const tiles = [
    { label: p.streak, value: d.streak, color: "#C2410C", icon: "🔥" },
    { label: p.xp, value: d.totalXp.toLocaleString(locale), color: "#0F766E", icon: "⚡" },
    { label: p.level, value: d.level ?? "—", color: "#BE185D", icon: "🎯" },
    { label: p.medals, value: earnedCount, color: "#6D28D9", icon: "🏅" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{p.title}</h1>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((s) => (
          <li key={s.label} className="rounded-3xl p-4 text-white shadow-sm sm:p-5" style={{ background: s.color }}>
            <span className="text-xl" aria-hidden>
              {s.icon}
            </span>
            <b className="mt-1 block text-3xl font-extrabold">{s.value}</b>
            <span className="text-sm font-bold">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="xp-week">
          <div className="flex items-baseline justify-between">
            <h2 id="xp-week" className="text-lg font-extrabold">
              {p.weekTitle}
            </h2>
            <span className="text-sm font-extrabold text-[#BE185D]">{fill(p.weekTotal, { n: weekTotal })}</span>
          </div>
          <ol className="mt-5 grid h-44 grid-cols-7 items-end gap-2">
            {d.xpWeek.map((xp, i) => {
              const today = i === d.today;
              const h = xp ? Math.max(8, Math.round((xp / max) * 100)) : 4;
              return (
                <li key={i} className="flex h-full flex-col items-center justify-end gap-1">
                  <span className="text-xs font-extrabold text-[#4A4766]">{xp || ""}</span>
                  <span
                    className="w-full max-w-10 rounded-t-lg"
                    style={{ height: `${h}%`, background: !xp ? "#E4DEEA" : today ? "#F5178C" : "#35C3F0" }}
                    title={`${p.days[i]}: ${xp} XP`}
                  />
                  <span className={`text-xs font-bold ${today ? "text-[#F5178C]" : "text-[#6B6680]"}`}>{p.daysShort[i]}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm font-semibold text-[#4A4766]">{bestDay >= 0 ? fill(p.best, { day: p.days[bestDay] }) : p.noBest}</p>
        </section>

        <section className={card} aria-labelledby="eng-level">
          <h2 id="eng-level" className="text-lg font-extrabold">
            {p.levelTitle}
          </h2>
          <ol className="mt-4 grid grid-cols-6 gap-1.5">
            {LEVELS.map((L, i) => (
              <li
                key={L}
                aria-current={i === levelIdx ? "true" : undefined}
                className="rounded-xl py-2.5 text-center text-sm font-extrabold"
                style={i === levelIdx ? { background: "#1B1830", color: "#fff" } : i < levelIdx ? { background: "#FFE3F0", color: "#B5007E" } : { background: "#F4F1F7", color: "#6B6880" }}
              >
                {L}
              </li>
            ))}
          </ol>
          <h3 className="mt-5 text-sm font-extrabold text-[#4A4766]">{p.history}</h3>
          {d.history.length ? (
            <ul className="mt-2 divide-y divide-[#F1EDF5]">
              {[...d.history].reverse().map((h) => (
                <li key={h.evaluated_at} className="flex justify-between py-2 text-sm">
                  <span className="font-semibold text-[#4A4766]">{new Date(h.evaluated_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</span>
                  <b>{h.level}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[#6B6680]">{p.noHistory}</p>
          )}
          {d.retakeDays > 0 ? (
            <span className="mt-4 inline-flex rounded-full bg-[#F1EDF5] px-5 py-3 text-sm font-extrabold text-[#4A4766]">{fill(p.retakeIn, { n: d.retakeDays })}</span>
          ) : (
            <Link href="/evaluacion" className={`mt-4 inline-flex rounded-full bg-[#D6006A] px-5 py-3 text-sm font-extrabold text-white ${focus}`}>
              {p.retakeNow} →
            </Link>
          )}
        </section>
      </div>

      {d.civics && (
        <section className="rounded-3xl p-5 text-[#F4F1E8] sm:p-6" style={{ background: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)" }} aria-labelledby="civics">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-[#FFD24D] bg-[#0E2A4F] text-center shadow-[0_0_0_6px_rgba(255,210,77,.2)]">
              <span>
                <b className="block font-serif text-3xl text-[#FFD24D]">{d.civics.best ? `${d.civics.best.score}/${d.civics.best.total}` : "—"}</b>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C9D3E2]">CelsUS</span>
              </span>
            </div>
            <div className="flex-1">
              <h2 id="civics" className="font-serif text-2xl font-semibold">
                {p.civicsTitle}
              </h2>
              <p className="text-sm font-semibold text-[#C9D3E2]">{d.civics.best ? p.civicsBest : p.civicsNone}</p>
              <ul className="mt-4 space-y-2.5">
                {p.topics.map((name, i) => {
                  const v = d.civics!.topics[i];
                  return (
                    <li key={name}>
                      <div className="flex justify-between text-xs font-bold">
                        <span>{name}</span>
                        <span className="text-[#FFD24D]">{v === null ? "—" : `${v}%`}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-[#FFD24D]" style={{ width: `${v ?? 0}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">💡 {d.civics.weakest === null ? p.tipNone : fill(p.tip, { topic: p.topics[d.civics.weakest] })}</p>
              <Link href="/app/examen-civico" className={`mt-4 inline-flex rounded-full bg-[#FFD24D] px-5 py-3 text-sm font-extrabold text-[#0E2A4F] ${focus}`}>
                {p.practice} →
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className={card} aria-labelledby="medals">
        <div className="flex items-baseline justify-between">
          <h2 id="medals" className="text-lg font-extrabold">
            {p.medalsTitle}
          </h2>
          <span className="text-sm font-extrabold text-[#6D28D9]">{fill(p.medalsCount, { n: earnedCount, total: medals.length })}</span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {medals.map((m) => {
            const on = d.earned.has(m.code);
            return (
              <li key={m.code} className="flex flex-col items-center text-center">
                <span
                  className="grid h-16 w-16 place-items-center rounded-full text-2xl font-extrabold"
                  style={
                    on
                      ? { background: m.color, color: "#fff", boxShadow: `0 0 0 4px #fff, 0 0 0 6px ${m.color}` }
                      : { background: "#F1EDF5", color: "#6B6880", boxShadow: "0 0 0 4px #fff, 0 0 0 6px #E4DEEA" }
                  }
                  aria-hidden
                >
                  {on ? "★" : "🔒"}
                </span>
                <b className="mt-3 text-sm font-extrabold">{m.name}</b>
                <span className="text-xs font-semibold text-[#6B6680]">{m.requirement}</span>
                <span className="sr-only">{on ? "✓" : ""}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
