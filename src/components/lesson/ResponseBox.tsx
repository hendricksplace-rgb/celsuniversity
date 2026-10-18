"use client";

// "Tu respuesta" under an activity text block (data.response_field). Saves on its own after a pause;
// 20 characters or more count the block as done for the lesson.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePartDone } from "./progress";

const MIN_CHARS = 20;
type Strings = { answer: string; placeholder: string; saving: string; saved: string; error: string };

export function ResponseBox({ blockId, initial, t }: { blockId: string; initial: string; t: Strings }) {
  const [body, setBody] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(initial ? "saved" : "idle");
  const last = useRef(initial);
  const done = usePartDone();

  useEffect(() => {
    if (initial.trim().length >= MIN_CHARS) done();
  }, [initial, done]);

  useEffect(() => {
    if (body === last.current) return;
    const h = setTimeout(async () => {
      setState("saving");
      const { error } = await createClient().from("lesson_answers").upsert({ block_id: blockId, body }, { onConflict: "user_id,block_id" });
      if (error) return setState("error");
      last.current = body;
      setState("saved");
      if (body.trim().length >= MIN_CHARS) done();
    }, 1200);
    return () => clearTimeout(h);
  }, [body, blockId, done]);

  const id = `answer-${blockId}`;
  return (
    <div className="space-y-1.5 rounded-[var(--t-radius)] border-2 border-[var(--t-accent)] bg-[var(--t-surface)] p-3">
      <label htmlFor={id} className="t-heading block text-sm">
        {t.answer}
      </label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.placeholder}
        rows={6}
        maxLength={20000}
        className="block w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none"
      />
      <p className="t-muted text-right text-xs" aria-live="polite">
        {state === "saving" ? t.saving : state === "saved" ? t.saved : state === "error" ? t.error : ""}
      </p>
    </div>
  );
}
