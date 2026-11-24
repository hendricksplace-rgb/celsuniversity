"use client";

// C-050 "Mi escuela": the few bits that need the viewer's browser: the greeting and "updated" time in their own
// time zone (the server only knows Mexico City), and the PDF button (the print stylesheet does the rest).
import { useEffect, useState } from "react";

type Greetings = { morning: string; afternoon: string; evening: string };

const greetingFor = (hour: number, g: Greetings) => (hour < 12 ? g.morning : hour < 19 ? g.afternoon : g.evening);

/** "Good evening, Nico." by the viewer's local hour (server value first, then the browser's). */
export function Greeting({ serverHour, name, g }: { serverHour: number; name: string; g: Greetings }) {
  const [hour, setHour] = useState(serverHour);
  useEffect(() => setHour(new Date().getHours()), []);
  return <>{greetingFor(hour, g).replace("{name}", name)}</>;
}

/** "Updated today, 6:28 PM" in the viewer's time zone. */
export function UpdatedAt({ template, serverTime, iso, locale }: { template: string; serverTime: string; iso: string; locale: string }) {
  const [time, setTime] = useState(serverTime);
  useEffect(() => setTime(new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })), [iso, locale]);
  return <>{template.replace("{time}", time)}</>;
}

export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
      </svg>
      {label}
    </button>
  );
}
