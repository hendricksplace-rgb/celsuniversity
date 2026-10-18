"use client";

// Course editor: the course's modules and their lessons, each list reorderable by drag-and-drop.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createLesson,
  createModule,
  deleteCourse,
  deleteLesson,
  deleteModule,
  duplicateModule,
  reorderLessons,
  reorderModules,
  updateCourse,
  updateLesson,
  updateModule,
} from "@/app/app/admin/cursos/actions";
import { STATUS_LABEL } from "@/lib/builder";
import { Sortable } from "./Sortable";
import { btn, focus, input } from "./ui";

type Status = "draft" | "published";
export type TreeLesson = { id: string; title: string; status: Status; teacher_only: boolean; lesson_type: string; blocks: number };
export type TreeModule = { id: string; title: string; status: Status; kind: string; lessons: TreeLesson[] };
type Course = { id: string; title: string; status: Status; slug: string | null };

type Result = { ok: boolean; error?: string; id?: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<Result>, after?: (r: Result) => void) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Algo salió mal.");
      else after?.(r);
      router.refresh();
    });
  return { pending, error, run };
}

export function StatusChip({ status, onToggle, disabled }: { status: Status; onToggle: () => void; disabled?: boolean }) {
  const on = status === "published";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      title={on ? "Pasar a borrador" : "Publicar"}
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${on ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#F1EDF5] text-[#5E5A73]"} ${focus}`}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

/** A title that becomes a text field on "Renombrar". */
export function EditableTitle({ value, onSave, className, label }: { value: string; onSave: (v: string) => void; className?: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing)
    return (
      <span className={`flex min-w-0 items-center gap-1 ${className ?? ""}`}>
        <span className="min-w-0 truncate">{value}</span>
        <button
          type="button"
          className={btn.small}
          aria-label={`Renombrar: ${value}`}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          ✏️
        </button>
      </span>
    );
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
        setEditing(false);
      }}
    >
      <input aria-label={label} autoFocus className={`${input} flex-1`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} />
      <button className={btn.small}>Guardar</button>
    </form>
  );
}

export function CourseTree({ course, modules }: { course: Course; modules: TreeModule[] }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState<Set<string>>(() => new Set(modules.length <= 3 ? modules.map((m) => m.id) : []));
  const toggle = (id: string) => setOpen((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));

  return (
    <div className="space-y-5" aria-busy={pending}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="w-full min-w-0 text-2xl font-extrabold sm:w-auto sm:flex-1 sm:text-3xl">
          <EditableTitle value={course.title} label="Título del curso" onSave={(t) => run(() => updateCourse(course.id, { title: t }))} />
        </h1>
        <StatusChip status={course.status} disabled={pending} onToggle={() => run(() => updateCourse(course.id, { status: course.status === "published" ? "draft" : "published" }))} />
        {course.status === "draft" && (
          <button
            type="button"
            className={btn.danger}
            disabled={pending}
            onClick={() => {
              if (confirm(`¿Eliminar el curso "${course.title}" con todos sus módulos y lecciones?`)) run(() => deleteCourse(course.id), () => router.push("/app/admin/cursos"));
            }}
          >
            Eliminar curso
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-[#FDECEA] px-3 py-2 text-sm font-bold text-[#B42318]">
          {error}
        </p>
      )}

      {modules.length === 0 && <p className="rounded-2xl border border-dashed border-[#E3DDEA] p-6 text-center text-sm font-semibold text-[#6B6680]">Este curso aún no tiene módulos.</p>}

      <Sortable
        items={modules}
        getId={(m) => m.id}
        getLabel={(m) => m.title}
        onReorder={(ids) => run(() => reorderModules(course.id, ids))}
        className="space-y-3"
        render={(m, handle) => (
          <section className="rounded-2xl border border-[#EFE6F2] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3">
              {handle}
              <button
                type="button"
                onClick={() => toggle(m.id)}
                aria-expanded={open.has(m.id)}
                aria-label={`${open.has(m.id) ? "Ocultar" : "Ver"} lecciones de ${m.title}`}
                className={`${btn.small} text-base`}
              >
                {open.has(m.id) ? "▾" : "▸"}
              </button>
              <EditableTitle className="flex-1 font-extrabold" value={m.title} label="Título del módulo" onSave={(t) => run(() => updateModule(m.id, { title: t }))} />
              <span className="text-xs font-bold text-[#6B6680]">{m.lessons.length === 1 ? "1 lección" : `${m.lessons.length} lecciones`}</span>
              <StatusChip status={m.status} disabled={pending} onToggle={() => run(() => updateModule(m.id, { status: m.status === "published" ? "draft" : "published" }))} />
              <button type="button" className={btn.small} disabled={pending} onClick={() => run(() => duplicateModule(m.id))}>
                Duplicar como plantilla
              </button>
              <button
                type="button"
                className={btn.danger}
                disabled={pending}
                onClick={() => {
                  if (confirm(m.lessons.length ? `¿Eliminar el módulo "${m.title}" y sus lecciones (${m.lessons.length})?` : `¿Eliminar el módulo "${m.title}"?`)) run(() => deleteModule(m.id));
                }}
              >
                Eliminar
              </button>
            </div>
            {open.has(m.id) && (
              <div className="border-t border-[#F1EDF5] p-2.5 sm:p-3">
                {m.lessons.length === 0 && <p className="px-2 py-1 text-sm font-semibold text-[#6B6680]">Sin lecciones todavía.</p>}
                <Sortable
                  items={m.lessons}
                  getId={(l) => l.id}
                  getLabel={(l) => l.title}
                  onReorder={(ids) => run(() => reorderLessons(course.id, ids))}
                  className="space-y-1.5"
                  render={(l, lessonHandle) => (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FAF8FC] p-1.5 pr-2">
                      {lessonHandle}
                      <Link href={`/app/admin/cursos/${course.id}/leccion/${l.id}`} className={`min-w-0 flex-1 truncate text-sm font-bold text-[#1B1830] hover:underline ${focus}`}>
                        {l.title}
                      </Link>
                      <span className="text-xs font-semibold text-[#6B6680]">{l.blocks === 1 ? "1 bloque" : `${l.blocks} bloques`}</span>
                      <label className="flex items-center gap-1 text-xs font-bold text-[#4A4766]">
                        <input
                          type="checkbox"
                          checked={l.teacher_only}
                          disabled={pending}
                          onChange={(e) => run(() => updateLesson(l.id, { teacher_only: e.target.checked }))}
                          className="size-4 accent-[#D6006A]"
                        />
                        Solo profesores
                      </label>
                      <StatusChip status={l.status} disabled={pending} onToggle={() => run(() => updateLesson(l.id, { status: l.status === "published" ? "draft" : "published" }))} />
                      <button
                        type="button"
                        className={btn.danger}
                        disabled={pending}
                        aria-label={`Eliminar lección ${l.title}`}
                        onClick={() => {
                          if (confirm(`¿Eliminar la lección "${l.title}"?`)) run(() => deleteLesson(l.id));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                />
                <AddRow label="+ Lección" placeholder="Título de la lección" onAdd={(t) => run(() => createLesson(m.id, t))} />
              </div>
            )}
          </section>
        )}
      />

      <AddRow label="+ Módulo" placeholder="Título del módulo" onAdd={(t) => run(() => createModule(course.id, t), (r) => r.id && setOpen((s) => new Set(s.add(r.id!))))} />
    </div>
  );
}

function AddRow({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open)
    return (
      <button type="button" className={`${btn.ghost} mt-2`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(title);
        setTitle("");
        setOpen(false);
      }}
    >
      <input aria-label={placeholder} autoFocus className={`${input} flex-1`} placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className={btn.primary} disabled={!title.trim()}>
        Agregar
      </button>
      <button type="button" className={btn.ghost} onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
