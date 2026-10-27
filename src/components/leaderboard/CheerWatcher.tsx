"use client";

// C-026: cheers a student received show full screen ("{nombre} te felicitó", the phrase with Amy's audio and its
// meaning, "Responder «Thanks! 🙏»"), after any new-medal toast and never in the middle of a lesson. More than 3
// unseen ones come as one list. Thanks the student's own cheers got come back as a small toast.
import "./tabla.css";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { fill } from "@/components/course/kit";
import { playClip, stopClip } from "@/components/part/clip";
import { sfx } from "@/components/part/fx";
import { themeForCourse } from "@/lib/themes";
import { avatarColor, courseLabel } from "@/lib/leaderboard-shared";
import { Words } from "./Words";

type Got = {
  id: number;
  from: string;
  course: string;
  slug: string;
  code: string;
  emoji: string;
  en: string;
  es: string;
  note: string;
  audio: string | null;
  wt: number[];
  rank: number | null;
};
type Thanks = { id: number; to: string; en: string; emoji: string };

/** Lesson and tool screens: the overlay waits until the student is back on a hub page. */
const BUSY = /\/app\/(lecciones|ebook|libros|herramientas|examen-civico|admin)|\/app\/cursos\/[^/]+\/./;
const MEDAL = ["🥇", "🥈", "🥉"];
const badgeShowing = () => document.documentElement.dataset.badgeToast === "1";

export function CheerWatcher({ t }: { t: Dictionary["lb"] }) {
  const pathname = usePathname();
  const [got, setGot] = useState<Got[]>([]);
  const [batch, setBatch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (BUSY.test(pathname)) return;
    let cancelled = false;
    let h: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (cancelled) return;
      if (badgeShowing()) return void (h = setTimeout(check, 700));
      const { data } = await createClient().rpc("cheer_inbox");
      if (cancelled || !data) return;
      const box = data as unknown as { received: Got[]; thanks: Thanks[] };
      if (box.received.length) {
        setGot(box.received);
        setBatch(box.received.length > 3);
        void createClient().rpc("mark_cheers_seen", { p_ids: box.received.map((g) => g.id) });
        window.dispatchEvent(new Event("celsu:cheers"));
      }
      if (box.thanks.length) {
        const k = box.thanks[0];
        setToast(fill(t.thanksToast, { name: k.to === "Estudiante" ? t.hiddenName : k.to.split(" ")[0], phrase: `${k.en} ${k.emoji}` }));
        setTimeout(() => setToast(null), 3500);
        void createClient().rpc("mark_thanks_seen", { p_ids: box.thanks.map((x) => x.id) });
      }
    };
    // After the medal check (1.2 s) has had its turn.
    h = setTimeout(check, 2200);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [pathname, t]);

  const close = () => {
    stopClip();
    setGot([]);
    setBatch(false);
  };

  return (
    <>
      {toast && (
        <div className="lb-toast" role="status">
          {toast}
        </div>
      )}
      {got.length > 0 &&
        (batch ? (
          <Batch t={t} got={got} onPick={(g) => (setGot([g, ...got.filter((x) => x.id !== g.id)]), setBatch(false))} onClose={close} />
        ) : (
          <Incoming key={got[0].id} t={t} g={got[0]} last={got.length === 1} onNext={() => setGot((q) => q.slice(1))} onClose={close} />
        ))}
    </>
  );
}

function Batch({ t, got, onPick, onClose }: { t: Dictionary["lb"]; got: Got[]; onPick: (g: Got) => void; onClose: () => void }) {
  useEffect(() => sfx.cheer(), []);
  return (
    <div className="lb-inc" role="dialog" aria-modal="true" aria-label={fill(t.inc.batch, { n: got.length })}>
      <div className="big" aria-hidden>
        👏
      </div>
      <h2 className="m-0 text-2xl font-extrabold">{fill(t.inc.batch, { n: got.length })}</h2>
      <p className="m-0 mt-1 text-sm font-semibold text-[#B9B0E6]">{t.inc.batchSub}</p>
      <div className="batch">
        {got.map((g) => (
          <button key={g.id} type="button" onClick={() => onPick(g)}>
            <span className="e" aria-hidden>
              {g.emoji}
            </span>
            <span>
              <b lang="en">{g.en}</b>
              <small>{name(t, g.from)}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="acts">
        <button type="button" className="btn2" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}

const name = (t: Dictionary["lb"], s: string) => (s === "Estudiante" ? t.hiddenName : s);

function Incoming({ t, g, last, onNext, onClose }: { t: Dictionary["lb"]; g: Got; last: boolean; onNext: () => void; onClose: () => void }) {
  const [k, setK] = useState(-1);
  const [thanked, setThanked] = useState(false);
  const play = () => playClip(g.audio ?? undefined, setK, g.wt, () => setK(-1));
  useEffect(() => {
    sfx.cheer();
    const h = setTimeout(play, 900);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      clearTimeout(h);
      window.removeEventListener("keydown", esc);
      stopClip();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.id]);
  const next = () => (last ? onClose() : onNext());
  const thank = async () => {
    setThanked(true);
    await createClient().rpc("thank_cheer", { p_id: g.id });
    setTimeout(next, 700);
  };
  const from = name(t, g.from);
  return (
    <div className="lb-inc" role="dialog" aria-modal="true" aria-label={`${from} ${t.inc.from}`}>
      <div className="from">
        <span className="lb-av" style={{ background: avatarColor(g.from + g.id) }} aria-hidden>
          {from[0]}
        </span>
        <span>
          <b>{from}</b> {t.inc.from}
        </span>
      </div>
      <div className="big" aria-hidden>
        {g.emoji}
      </div>
      <div className="card2">
        <div className="k">
          <span>{t.inc.say}</span>
          <button type="button" className="say" onClick={play}>
            {t.inc.listen}
          </button>
        </div>
        <p className="p" lang="en">
          <Words text={g.en} k={k} />
        </p>
        <p className="m">💡 {g.note}</p>
      </div>
      {g.rank && (
        <span className="tag2">
          {MEDAL[g.rank - 1] ?? "🏆"} {fill(t.inc.rank, { rank: g.rank, course: courseLabel(themeForCourse({ slug: g.slug }), g.course) })}
        </span>
      )}
      <div className="acts">
        <button type="button" className="lb-send" disabled={thanked} onClick={() => void thank()}>
          {thanked ? t.inc.thanked : t.inc.thanks}
        </button>
        <button type="button" className="btn2" onClick={next}>
          {last ? t.close : t.inc.next}
        </button>
      </div>
    </div>
  );
}
