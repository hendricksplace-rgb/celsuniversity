"use client";

// The two live parts of the next-class card: the countdown (days, hours, minutes; ticks every 20 s) and the
// "Agregar a mi calendario" link, whose .ics file is built here in the browser.
import { useEffect, useMemo, useState } from "react";

const split = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 6e4));
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
};
const two = (n: number) => String(n).padStart(2, "0");

export function Countdown({ at, now, labels, className }: { at: string; now: number; labels: { days: string; hours: string; mins: string; aria: string }; className?: string }) {
  // Starts from the server's clock so the first paint matches the HTML, then follows the device clock.
  const [t, setT] = useState(now);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);
  const { d, h, m } = split(Date.parse(at) - t);
  return (
    <div className={className} role="timer" aria-label={labels.aria.replace("{d}", String(d)).replace("{h}", String(h)).replace("{m}", String(m))}>
      <div aria-hidden>
        <b>{d}</b>
        <span>{labels.days}</span>
      </div>
      <div aria-hidden>
        <b>{two(h)}</b>
        <span>{labels.hours}</span>
      </div>
      <div aria-hidden>
        <b>{two(m)}</b>
        <span>{labels.mins}</span>
      </div>
    </div>
  );
}

const icsDate = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
/** RFC 5545 text: escape \ ; , and newlines. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function CalendarLink({
  id,
  at,
  durationMin,
  title,
  description,
  url,
  className,
  children,
}: {
  id: string;
  at: string;
  durationMin: number | null;
  title: string;
  description: string;
  url: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const href = useMemo(() => {
    const start = Date.parse(at);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CelsU//Mis clases//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${id}-${icsDate(start)}@celsu`,
      `DTSTAMP:${icsDate(start)}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(start + (durationMin ?? 60) * 6e4)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(url ? `${description}\n${url}` : description)}`,
      ...(url ? [`URL:${url}`, `LOCATION:${esc(url)}`] : []),
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(title)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }, [id, at, durationMin, title, description, url]);
  return (
    <a className={className} href={href} download="clase-celsu.ics">
      {children}
    </a>
  );
}
