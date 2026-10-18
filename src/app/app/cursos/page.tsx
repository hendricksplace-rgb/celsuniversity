import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { accessibleCourses, courseStats, nextLesson, type CourseStats } from "@/lib/learning";
import { BRAND } from "@/components/brand";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["mycourses"];
type Filter = "all" | "progress" | "done";
type Props = { searchParams: Promise<{ f?: string }> };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";
const BOOK_COLOR: Record<string, string> = { celstv: "#F5178C", celsbsns: "#13284D", celsus: "#194876", celsglobal: "#5C7F6E" };
const PROGRAM_NAME: Record<string, string> = { celstv: "CelsTV", celsbsns: "CelsBSNS", celsus: "CelsUS", celsglobal: "CelsGLOBAL" };

function ago(t: T, iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return days <= 0 ? t.today : days === 1 ? t.yesterday : fill(t.daysAgo, { n: days });
}

function CourseCard({ t, c }: { t: T; c: CourseStats }) {
  const b = BRAND[c.brand];
  const serif = c.brand === "celsus" || c.brand === "celsglobal";
  const pct = c.lessons ? Math.round((c.done / c.lessons) * 100) : 0;
  const recent = c.last && Date.now() - new Date(c.last.at).getTime() < 7 * 864e5;
  const next = nextLesson(c);
  const label = c.completed ? t.review : !c.started ? t.start : recent ? t.continue : t.keepGoing;
  const href = c.completed || !next ? `/app/cursos/${c.slug}` : `/app/lecciones/${next.id}`;
  const btnInk = c.brand === "celsus" ? "#0E2A4F" : "#FFFFFF";
  const accent = c.brand === "celsus" ? "#FFD24D" : b.accent;
  // CelsBSNS cyan is too light behind white text: its buttons use the program navy.
  const button = c.brand === "celsbsns" ? "#13284D" : accent;
  return (
    <li className="flex flex-col overflow-hidden rounded-3xl border border-[#EFE6F2] bg-white shadow-sm">
      <div className="relative flex h-24 items-center px-5" style={{ background: b.bg }}>
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: b.bar }} />
        {b.logo}
        {(c.started || c.completed) && (
          <span
            className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            style={c.completed ? { background: "#6DC067", color: "#0d2210" } : { background: "#FFFFFF", color: "#1B1830" }}
          >
            {c.completed ? t.badgeDone : t.badgeProgress}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6680]">{PROGRAM_NAME[c.brand]}</p>
        <h2 className={`mt-1 text-lg leading-snug ${serif ? "font-serif font-semibold" : "font-extrabold"}`}>{c.title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#6B6680]">{c.last ? `${ago(t, c.last.at)} · ${c.last.lessonTitle}` : t.notStarted}</p>
        {c.modules.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs font-bold text-[#4A4766]">
              <span>{fill(t.unitOf, { unit: t.unit[c.brand], x: Math.min(c.currentModule, c.modules.length), y: c.modules.length })}</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F1EDF5]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
            </div>
          </div>
        )}
        {c.downloaded && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#E5F3E2] px-2.5 py-1 text-xs font-extrabold text-[#2E6B2A]">✓ {t.saved[c.brand]}</span>
        )}
        <div className="mt-auto pt-4">
          <Link href={href} className={`inline-flex w-full justify-center rounded-full px-5 py-3 text-sm font-extrabold ${focus}`} style={{ background: button, color: btnInk }}>
            {label} →
          </Link>
        </div>
      </div>
    </li>
  );
}

export default async function MisCursos({ searchParams }: Props) {
  const { f } = await searchParams;
  const filter: Filter = f === "progress" || f === "done" ? f : "all";
  const { t } = await getDictionary();
  const m = t.mycourses;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id; // the /app shell already sent signed-out visitors to /entrar

  const access = await accessibleCourses(supabase, userId);
  const [stats, { data: books }, { data: answers }] = await Promise.all([
    courseStats(supabase, userId, access.ids),
    supabase.from("ebooks").select("id, slug, title, program, status").eq("status", "published").order("title"),
    supabase.from("ebook_answers").select("ebook_id, last_screen, completed_at").eq("user_id", userId),
  ]);
  const all = [...stats.values()].sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? "") || a.sort - b.sort);
  const shown = all.filter((c) => (filter === "done" ? c.completed : filter === "progress" ? c.started && !c.completed : true));
  const read = new Map((answers ?? []).map((a) => [a.ebook_id, a]));

  const chips: [Filter, string][] = [
    ["all", m.all],
    ["progress", m.progress],
    ["done", m.done],
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{m.title}</h1>
        <nav className="flex flex-wrap gap-2" aria-label={m.title}>
          {chips.map(([k, label]) => (
            <Link
              key={k}
              href={k === "all" ? "/app/cursos" : `/app/cursos?f=${k}`}
              aria-current={filter === k ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-extrabold ${focus} ${filter === k ? "bg-[#1B1830] text-white" : "border border-[#E4DEEA] bg-white text-[#4A4766] hover:bg-[#F1EDF5]"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {shown.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <CourseCard key={c.id} t={m} c={c} />
          ))}
        </ul>
      ) : filter === "done" ? (
        <div className="flex flex-col items-center rounded-3xl border border-[#EFE6F2] bg-white px-6 py-12 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full p-1.5" style={{ background: "conic-gradient(#F5178C 0 25%, #FFC531 25% 50%, #6DC067 50% 75%, #35C3F0 75% 100%)" }} aria-hidden>
            <span className="grid h-full w-full place-items-center rounded-full bg-white text-3xl font-extrabold text-[#1B1830]">✓</span>
          </span>
          <h2 className="mt-4 text-xl font-extrabold">{m.emptyDoneTitle}</h2>
          <p className="mt-1 max-w-sm text-sm font-semibold text-[#6B6680]">{m.emptyDoneText}</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#EFE6F2] bg-white px-6 py-10 text-center">
          <p className="font-bold text-[#4A4766]">{filter === "progress" ? m.emptyProgress : m.none}</p>
          <Link href="/cursos" className={`mt-4 inline-flex rounded-full bg-[#F5178C] px-5 py-3 text-sm font-extrabold text-white ${focus}`}>
            {m.browse}
          </Link>
        </div>
      )}

      {!!books?.length && (
        <section>
          <h2 className="text-xl font-extrabold">{m.books}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {books.map((bk) => {
              const a = read.get(bk.id);
              const status = a?.completed_at ? m.read : a?.last_screen ? m.reading : m.newBook;
              const color = BOOK_COLOR[bk.program ?? ""] ?? "#1B1830";
              return (
                <li key={bk.id}>
                  <Link href={`/app/libros/${bk.slug}`} className={`group block rounded-xl ${focus}`}>
                    <div
                      className="relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl p-3 text-white shadow-md transition group-hover:-translate-y-0.5 motion-reduce:transition-none"
                      style={{ background: `linear-gradient(160deg, ${color}, #1B1830 140%)` }}
                    >
                      {/* spine */}
                      <span className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" aria-hidden />
                      <span className="text-[13px] font-extrabold leading-snug">{bk.title}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{bk.title}</p>
                    <p className="text-xs font-semibold text-[#6B6680]">
                      {PROGRAM_NAME[bk.program ?? ""] ?? "CelsU"} · {status}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
