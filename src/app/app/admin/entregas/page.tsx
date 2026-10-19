import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { taskTime, weekTitle } from "@/lib/bsns";
import { fill } from "@/components/course/kit";
import { countWords } from "@/lib/writing";
import { reviewSubmission, reviewWriting } from "./actions";

export const metadata = { title: "Entregas por revisar · CelsU" };
type Props = { searchParams: Promise<{ id?: string; vista?: string; ok?: string; error?: string }> };

const card = "rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm";

/** Coach queue for CelsBSNS tasks: what students handed in, a reading view and the comment box. */
export default async function SubmissionsQueue({ searchParams }: Props) {
  const { id, vista, ok, error } = await searchParams;
  const { t, lang } = await getDictionary();
  const tb = t.bsns;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/admin/entregas");
  if (!viewer.isStaff) return <p className={card}>{t.admin.staffOnly}</p>;
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

  const reviewed = vista === "revisadas";
  const { data: rows } = await supabase
    .from("submissions")
    .select("id, user_id, lesson_id, subject, version, body, media_path, status, coach_feedback, coach_good, coach_improve, coach_message, submitted_at, reviewed_at, lesson:lessons(title, module:modules(title, sort_order))")
    .eq("status", reviewed ? "reviewed" : "submitted")
    .order(reviewed ? "reviewed_at" : "submitted_at", { ascending: !reviewed })
    .limit(200);
  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id, display_name, email").in("id", userIds) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.display_name || p.email || "—"]));
  const label = (r: NonNullable<typeof rows>[number]) => {
    const lesson = one(r.lesson);
    const mod = one(lesson?.module);
    return { task: taskTime(lesson?.title ?? "").name, week: mod ? `${fill(tb.queueWeek, { n: (mod.sort_order ?? 0) + 1 })} · ${weekTitle(mod.title)}` : "" };
  };

  const open = id ? (rows ?? []).find((r) => r.id === id) : null;
  if (open) {
    const l = label(open);
    const { data: media } = open.media_path ? await supabase.storage.from("submissions").createSignedUrl(open.media_path, 3600) : { data: null };
    // CelsBSNS Interactive Writing Task: the email as sent and the coach's three fields.
    const { data: wc } = await supabase.from("writing_content").select("data").eq("lesson_id", open.lesson_id).maybeSingle();
    const writingTo = wc ? ((wc.data as { to_label?: string }).to_label ?? "—") : null;
    const isVideo = /\.(mp4|mov|webm)$/i.test(open.media_path ?? "") && !/\.(m4a|mp3)$/i.test(open.media_path ?? "");
    return (
      <div className="mx-auto max-w-[720px] space-y-4">
        <Link href={`/app/admin/entregas${reviewed ? "?vista=revisadas" : ""}`} className="text-sm font-bold text-[#6B6680] hover:underline">
          ← {tb.queueBack}
        </Link>
        <header>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2C6BC4]">{l.week}</p>
          <h1 className="text-2xl font-extrabold">{l.task}</h1>
          <p className="text-sm font-semibold text-[#6B6680]">
            {who.get(open.user_id)} · {open.submitted_at ? fmt.format(new Date(open.submitted_at)) : ""}
          </p>
        </header>
        {media?.signedUrl &&
          (isVideo ? <video controls playsInline src={media.signedUrl} className="aspect-video w-full rounded-2xl bg-black" /> : <audio controls src={media.signedUrl} className="w-full" />)}
        {writingTo ? (
          <WritingReview open={open} to={writingTo} lang={lang} reviewed={reviewed} error={!!error} errorText={t.admin.notAllowed} />
        ) : (
          <>
            <section className={card}>
              <p lang="en" className="whitespace-pre-line text-[15px] leading-relaxed [overflow-wrap:anywhere]">
                {open.body || tb.queueNoText}
              </p>
            </section>
            <form action={reviewSubmission} className={`${card} space-y-3`}>
              <input type="hidden" name="id" value={open.id} />
              <label htmlFor="comment" className="block text-sm font-extrabold">
                {tb.queueComment}
              </label>
              <textarea id="comment" name="comment" required rows={6} defaultValue={open.coach_feedback ?? ""} className="w-full rounded-xl border border-[#E3DDEA] p-3 text-[15px]" />
              {error && (
                <p role="alert" className="text-sm font-semibold text-[#A3123F]">
                  {t.admin.notAllowed}
                </p>
              )}
              <button className="rounded-full bg-[#2C6BC4] px-5 py-2.5 text-sm font-extrabold text-white">{tb.queueSend}</button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      <h1 className="text-3xl font-extrabold">{tb.queueTitle}</h1>
      {ok && (
        <p role="status" className="rounded-xl bg-[#E3F1E6] px-3 py-2 text-sm font-semibold text-[#1E7A3A]">
          {tb.queueSent}
        </p>
      )}
      <nav className="flex gap-2 text-sm font-bold">
        <Link href="/app/admin/entregas" className={`rounded-full px-4 py-1.5 ${reviewed ? "bg-white shadow-sm" : "bg-[#1B1830] text-white"}`}>
          {tb.queueTitle}
        </Link>
        <Link href="/app/admin/entregas?vista=revisadas" className={`rounded-full px-4 py-1.5 ${reviewed ? "bg-[#1B1830] text-white" : "bg-white shadow-sm"}`}>
          {tb.queueReviewed}
        </Link>
      </nav>
      {(rows ?? []).length === 0 ? (
        <p className={card}>{tb.queueEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {(rows ?? []).map((r) => {
            const l = label(r);
            return (
              <li key={r.id}>
                <Link href={`/app/admin/entregas?id=${r.id}${reviewed ? "&vista=revisadas" : ""}`} className={`${card} flex items-center gap-3 hover:border-[#C9D6EE]`}>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{who.get(r.user_id)}</strong>
                    <span className="block text-sm text-[#6B6680]">
                      {l.task} · {l.week}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#6B6680]">
                    {fmt.format(new Date((reviewed ? r.reviewed_at : r.submitted_at) ?? Date.now()))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type WritingRow = { id: string; subject: string | null; version: number; body: string; coach_good: string | null; coach_improve: string | null; coach_message: string | null };

const W = {
  es: { words: "palabras", version: "Versión", good: "Lo que hizo bien", improve: "Para mejorar", message: "Mensaje (opcional)", send: "Enviar comentarios", sent: "Ya revisada: estos son tus comentarios." },
  en: { words: "words", version: "Version", good: "What they did well", improve: "To improve", message: "Message (optional)", send: "Send feedback", sent: "Already reviewed: this is your feedback." },
};

/** The student's email exactly as sent (To, Subject, body), its word count, and the three feedback fields. */
function WritingReview({ open, to, lang, reviewed, error, errorText }: { open: WritingRow; to: string; lang: string; reviewed: boolean; error: boolean; errorText: string }) {
  const w = W[lang === "en" ? "en" : "es"];
  const field = "w-full rounded-xl border border-[#E3DDEA] p-3 text-[15px]";
  return (
    <>
      <section className={card}>
        <p className="flex flex-wrap justify-between gap-2 border-b border-[#EFE6F2] pb-3 text-sm text-[#5B6B86]">
          <span lang="en">
            <strong className="text-[#1B1830]">To:</strong> {to}
            <br />
            <strong className="text-[#1B1830]">Subject:</strong> {open.subject || "—"}
          </span>
          <span className="font-bold">
            {countWords(open.body)} {w.words} · {w.version} {open.version}
          </span>
        </p>
        <p lang="en" className="mt-3 whitespace-pre-line text-[15px] leading-relaxed [overflow-wrap:anywhere]">
          {open.body}
        </p>
      </section>
      <form action={reviewWriting} className={`${card} space-y-3`}>
        <input type="hidden" name="id" value={open.id} />
        {reviewed && <p className="text-sm font-semibold text-[#5B6B86]">{w.sent}</p>}
        <label htmlFor="good" className="block text-sm font-extrabold text-[#1E7A3A]">
          {w.good}
        </label>
        <textarea id="good" name="good" required rows={3} maxLength={5000} defaultValue={open.coach_good ?? ""} readOnly={reviewed} className={field} />
        <label htmlFor="improve" className="block text-sm font-extrabold text-[#8A6400]">
          {w.improve}
        </label>
        <textarea id="improve" name="improve" required rows={3} maxLength={5000} defaultValue={open.coach_improve ?? ""} readOnly={reviewed} className={field} />
        <label htmlFor="message" className="block text-sm font-extrabold">
          {w.message}
        </label>
        <textarea id="message" name="message" rows={3} maxLength={5000} defaultValue={open.coach_message ?? ""} readOnly={reviewed} className={field} />
        {error && (
          <p role="alert" className="text-sm font-semibold text-[#A3123F]">
            {errorText}
          </p>
        )}
        {!reviewed && <button className="rounded-full bg-[#2C6BC4] px-5 py-2.5 text-sm font-extrabold text-white">{w.send}</button>}
      </form>
    </>
  );
}
