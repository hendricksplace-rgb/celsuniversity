"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCourse } from "@/app/app/admin/cursos/actions";
import { btn, input } from "./ui";

/** "Nuevo curso": a draft course, then straight to its editor. */
export function NewCourse() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button type="button" className={btn.primary} onClick={() => setOpen(true)}>
        + Nuevo curso
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createCourse(title);
          if (r.ok && r.id) router.push(`/app/admin/cursos/${r.id}`);
          else if (!r.ok) setError(r.error);
        });
      }}
    >
      <label className="sr-only" htmlFor="new-course">
        Título del curso
      </label>
      <input id="new-course" autoFocus className={input} placeholder="Título del curso" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className={btn.primary} disabled={pending || !title.trim()}>
        {pending ? "Creando…" : "Crear"}
      </button>
      <button type="button" className={btn.ghost} onClick={() => setOpen(false)}>
        Cancelar
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-bold text-[#B42318]">
          {error}
        </p>
      )}
    </form>
  );
}
