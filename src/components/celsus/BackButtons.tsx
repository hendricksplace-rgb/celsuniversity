// CelsUS "Curso" + "Regresar al Episodio N" buttons (C-013), at the top of every CelsUS page instead of the small
// breadcrumb link. Pages outside an episode show only the course button. Labels follow the app language.
import "./back-buttons.css";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["usBack"];
/** What a CelsUS screen needs for its back buttons (passed from the server page). */
export type UsBack = { t: T; course: { href: string; name: string } };

export function BackButtons({
  t,
  course,
  episode,
  dark,
  className,
}: {
  t: T;
  course: { href: string; name: string };
  episode?: { href: string; n: number } | null;
  /** On a navy header. */
  dark?: boolean;
  className?: string;
}) {
  return (
    <nav className={`usb${dark ? " dark" : ""}${className ? ` ${className}` : ""}`} aria-label={t.aria}>
      <Link className="b course" href={course.href}>
        <span className="i" aria-hidden>
          ‹
        </span>
        <span className="t">
          <small>{t.course}</small>
          {course.name}
        </span>
      </Link>
      {episode && (
        <Link className="b ep" href={episode.href}>
          <span className="i" aria-hidden>
            ‹
          </span>
          <span className="t">
            <small>{t.back}</small>
            {t.episode.replace("{n}", String(episode.n))}
          </span>
        </Link>
      )}
    </nav>
  );
}
