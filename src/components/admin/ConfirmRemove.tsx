"use client";

// C-051: "Quitar" asks first. The second button submits the server action passed in.
import { useState } from "react";

type Props = { action: () => Promise<void>; label: string; question: string; yes: string; cancel: string; className: string; dangerClassName: string };

export function ConfirmRemove({ action, label, question, yes, cancel, className, dangerClassName }: Props) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" role="group" aria-label={question}>
      <span className="text-xs font-bold text-[#4A4766]">{question}</span>
      <button type="submit" className={dangerClassName} autoFocus>
        {yes}
      </button>
      <button type="button" className={className} onClick={() => setAsking(false)}>
        {cancel}
      </button>
    </form>
  );
}
