"use client";

// The resume sheet (Mi resume, the print/PDF copy and the one-page measure) and its .docx export, built the same
// way as Resume Review's (the `docx` package, loaded on demand).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HEADINGS, eduLine, jobDates, jobPlace, type DocModel, type Lang } from "@/lib/guided";
import s from "./guided.module.css";

type Empty = Partial<Record<"summary" | "skills" | "jobs" | "education" | "contact", string>>;

export function ResumeSheet({ m, lang, empty, id }: { m: DocModel; lang: Lang; empty?: Empty; id?: string }) {
  const h = HEADINGS[lang];
  const ph = (k: keyof Empty) => (empty?.[k] ? <p className={s.empty}>{empty[k]}</p> : null);
  return (
    <article className={s.doc} id={id} lang={lang === "en" ? "en" : "es"}>
      <div className={s.dnm}>{m.name || (empty?.contact ? "—" : "")}</div>
      {m.contact.length ? <div className={s.dct}>{m.contact.join(" · ")}</div> : ph("contact")}
      <h6>{h.summary}</h6>
      {m.summary ? <p>{m.summary}</p> : ph("summary")}
      <h6>{h.skills}</h6>
      {m.skills.length ? <p>{m.skills.join(" · ")}</p> : ph("skills")}
      <h6>{h.jobs}</h6>
      {m.jobs.length
        ? m.jobs.map((j) => (
            <div key={j.id}>
              <div className={s.jr}>
                <span>
                  <b>{j.title}</b>
                  {jobPlace(j) ? ` · ${jobPlace(j)}` : ""}
                </span>
                <span>{jobDates(j)}</span>
              </div>
              {j.bullets.some((b) => b.trim()) && (
                <ul>
                  {j.bullets
                    .filter((b) => b.trim())
                    .map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                </ul>
              )}
            </div>
          ))
        : ph("jobs")}
      <h6>{h.education}</h6>
      {m.education.length ? m.education.map((e) => <p key={e.id}>{eduLine(e)}</p>) : ph("education")}
      {m.certs.length > 0 && (
        <>
          <h6>{h.certs}</h6>
          {m.certs.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </>
      )}
    </article>
  );
}

/** The copy that prints ("Descargar PDF"): hidden on screen, alone on the page in print. */
export function PrintCopy({ m, lang }: { m: DocModel; lang: Lang }) {
  return (
    <PrintPortal>
      <ResumeSheet m={m} lang={lang} />
    </PrintPortal>
  );
}

/** What prints: a direct child of <body>, so print can drop everything else from the layout (no blank pages). */
export function PrintPortal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;
  return createPortal(
    <div className={s.printDoc} aria-hidden>
      {children}
    </div>,
    host,
  );
}

/** Letter paper, 0.75 in top/bottom margins: 9.5 in of text height at 96 px per inch. */
const PAGE_PX = 9.5 * 96;
/** Renders the sheet off screen at the print width and reports whether it fits on one page. */
export function useFitsOnePage(m: DocModel, lang: Lang) {
  const ref = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState<boolean | null>(null);
  const key = JSON.stringify(m);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => setFits(el.scrollHeight <= PAGE_PX));
    return () => cancelAnimationFrame(id);
  }, [key]);
  const node = (
    <div className={s.measure} ref={ref} aria-hidden>
      <ResumeSheet m={m} lang={lang} />
    </div>
  );
  return [fits, node] as const;
}

export async function downloadDocx(m: DocModel, lang: Lang, fileName: string) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType } = await import("docx");
  const h = HEADINGS[lang];
  const head = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22 })],
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1A1D2B", space: 2 } },
    });
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.name, bold: true, size: 36 })] }),
    ...(m.contact.length ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.contact.join(" · "), size: 20 })] })] : []),
  ];
  if (m.summary) children.push(head(h.summary), new Paragraph({ children: [new TextRun(m.summary)] }));
  if (m.skills.length) children.push(head(h.skills), new Paragraph({ children: [new TextRun(m.skills.join(" · "))] }));
  if (m.jobs.length) {
    children.push(head(h.jobs));
    for (const j of m.jobs) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          children: [new TextRun({ text: j.title, bold: true }), new TextRun(jobPlace(j) ? ` · ${jobPlace(j)}` : ""), new TextRun({ text: `\t${jobDates(j)}` })],
        }),
        ...j.bullets.filter((b) => b.trim()).map((b) => new Paragraph({ text: b, bullet: { level: 0 } })),
      );
    }
  }
  if (m.education.length) children.push(head(h.education), ...m.education.map((e) => new Paragraph({ children: [new TextRun(eduLine(e))] })));
  if (m.certs.length) children.push(head(h.certs), ...m.certs.map((c) => new Paragraph({ children: [new TextRun(c)] })));
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a); // some browsers ignore the name of a detached link
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** "Descargar PDF": the print dialog with the file name as the document title (browsers use it as the PDF name). */
export function printPdf(fileName: string) {
  const prev = document.title;
  document.title = fileName.replace(/\.pdf$/i, "");
  const restore = () => {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
