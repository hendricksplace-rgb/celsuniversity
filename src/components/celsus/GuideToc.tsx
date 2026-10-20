"use client";

// "En esta guía": every section with its time; the section on screen is highlighted as you scroll.
// Desktop: sticky on the left. Phone: a sideways-scrolling row of chips.
import { useEffect, useRef, useState } from "react";

export function GuideToc({ sections, t }: { sections: { id: string; title: string; time: string | null }[]; t: { toc: string; print: string; top: string } }) {
  const [on, setOn] = useState(sections[0]?.id ?? "");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let cur = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < 160) cur = s.id;
      }
      setOn(cur);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  // Phone chips: keep the current one in view (without moving the page).
  useEffect(() => {
    const list = listRef.current;
    const a = list?.querySelector<HTMLElement>(`a[href="#${on}"]`);
    if (!list || !a || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: a.offsetLeft - list.offsetLeft - 8, behavior: "smooth" });
  }, [on]);

  return (
    <nav className="toc" aria-labelledby="tg-toc">
      <h2 id="tg-toc">{t.toc}</h2>
      <div className="list" ref={listRef}>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={s.id === on ? "on" : undefined} aria-current={s.id === on ? "location" : undefined}>
            <small>{s.time ?? "—"}</small>
            <span>{s.title}</span>
          </a>
        ))}
      </div>
      <div className="tools">
        <button type="button" className="p" onClick={() => window.print()}>
          {t.print}
        </button>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {t.top}
        </button>
      </div>
    </nav>
  );
}
