"use client";

// Lesson editor: the lesson's blocks (drag to reorder, add by type, edit with a form or JSON), a live
// preview with the student components, and "Deshacer último cambio".
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createBlock, deleteBlock, reorderBlocks, undoLast, updateBlock, updateLesson } from "@/app/app/admin/cursos/actions";
import { previewLesson } from "@/app/app/admin/cursos/preview";
import { BLOCK_LABEL, BLOCK_PRESETS, formKind, type BuilderBlock } from "@/lib/builder";
import { BlockForm, type Draft } from "./BlockForm";
import { EditableTitle, StatusChip } from "./CourseTree";
import { Sortable } from "./Sortable";
import { btn } from "./ui";

type Lesson = { id: string; title: string; status: "draft" | "published"; teacher_only: boolean };

const ICON: Record<string, string> = Object.fromEntries(BLOCK_PRESETS.map((p) => [p.key, p.icon]));
ICON.json = "🧩";

function summary(b: BuilderBlock) {
  const question = Array.isArray(b.data.settings) ? (b.data.settings[0] as { question?: string } | undefined)?.question : undefined;
  const media = typeof b.data.media_url === "string" ? b.data.media_url.split("/").pop() : "";
  return b.title || (b.body ?? "").replace(/<[^>]+>/g, " ").trim().slice(0, 80) || question || media || BLOCK_LABEL[formKind(b)] || b.block_type;
}

const toDraft = (b: BuilderBlock): Draft => ({ block_type: b.block_type, title: b.title, body: b.body, data: b.data, teacher_only: b.teacher_only });

export function LessonEditor({
  courseId,
  lesson,
  blocks,
  ebooks,
  initialPreview,
}: {
  courseId: string;
  lesson: Lesson;
  blocks: BuilderBlock[];
  ebooks: { slug: string; title: string }[];
  initialPreview: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<React.ReactNode>(initialPreview);
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, okText?: string, after?: (id?: string) => void) =>
    start(async () => {
      const r = await fn();
      setMessage(r.ok ? (okText ? { kind: "ok", text: okText } : null) : { kind: "error", text: r.error ?? "Algo salió mal." });
      if (r.ok) after?.(r.id);
      router.refresh();
    });

  const current = blocks.find((b) => b.id === selected) ?? null;
  const dirty = !!(current && draft && JSON.stringify(toDraft(current)) !== JSON.stringify(draft));

  // Live preview: the saved blocks with the open draft in place, re-rendered on the server.
  const merged = blocks.map((b) => (b.id === selected && draft ? { ...b, ...draft } : b));
  const key = JSON.stringify(merged);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      previewLesson(lesson.id, JSON.parse(key))
        .then((node) => node && setPreview(node))
        .catch(() => {
          /* keep the last preview; the next edit tries again */
        });
    }, 500);
    return () => clearTimeout(t);
  }, [key, lesson.id]);

  const open = (b: BuilderBlock) => {
    if (dirty && !confirm("Tienes cambios sin guardar en el bloque abierto. ¿Descartarlos?")) return;
    setSelected(b.id);
    setDraft(toDraft(b));
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <div className="space-y-5" aria-busy={pending}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="w-full min-w-0 text-2xl font-extrabold sm:w-auto sm:flex-1 sm:text-3xl">
          <EditableTitle value={lesson.title} label="Título de la lección" onSave={(t) => run(() => updateLesson(lesson.id, { title: t }))} />
        </h1>
        <StatusChip status={lesson.status} disabled={pending} onToggle={() => run(() => updateLesson(lesson.id, { status: lesson.status === "published" ? "draft" : "published" }))} />
        <label className="flex items-center gap-1.5 text-sm font-bold text-[#4A4766]">
          <input type="checkbox" className="size-4 accent-[#D6006A]" checked={lesson.teacher_only} disabled={pending} onChange={(e) => run(() => updateLesson(lesson.id, { teacher_only: e.target.checked }))} />
          Solo profesores
        </label>
        <button
          type="button"
          className={btn.ghost}
          disabled={pending}
          onClick={() =>
            run(
              () => undoLast(lesson.id),
              "Se deshizo el último cambio.",
              () => {
                setSelected(null);
                setDraft(null);
              },
            )
          }
        >
          ↶ Deshacer último cambio
        </button>
      </header>

      <p role="status" aria-live="polite" className={message ? `rounded-xl px-3 py-2 text-sm font-bold ${message.kind === "ok" ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#FDECEA] text-[#B42318]"}` : "sr-only"}>
        {message?.text}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-[#EFE6F2] bg-white p-3 shadow-sm">
            <h2 className="px-1 pb-2 text-sm font-extrabold uppercase tracking-wider text-[#5E5A73]">Bloques</h2>
            {blocks.length === 0 && <p className="px-1 py-2 text-sm font-semibold text-[#6B6680]">Esta lección no tiene bloques. Agrega el primero.</p>}
            <Sortable
              items={blocks}
              getId={(b) => b.id}
              getLabel={summary}
              onReorder={(ids) => run(() => reorderBlocks(lesson.id, ids))}
              className="space-y-1.5"
              render={(b, handle) => {
                const kind = formKind(b);
                const on = b.id === selected;
                return (
                  <div className={`flex items-center gap-2 rounded-xl p-1.5 pr-2 ${on ? "bg-[#FFE3F0] ring-2 ring-[#D6006A]" : "bg-[#FAF8FC]"}`}>
                    {handle}
                    <span aria-hidden className="text-lg">
                      {ICON[kind] ?? "🧩"}
                    </span>
                    <button type="button" onClick={() => open(b)} className="min-w-0 flex-1 text-left text-sm font-bold text-[#1B1830] hover:underline" aria-current={on || undefined}>
                      <span className="block truncate">{summary(b)}</span>
                      <span className="block text-xs font-semibold text-[#6B6680]">
                        {BLOCK_LABEL[kind]}
                        {b.teacher_only ? " · solo profesores" : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={btn.danger}
                      disabled={pending}
                      aria-label={`Eliminar bloque ${summary(b)}`}
                      onClick={() => {
                        if (confirm("¿Eliminar este bloque? Puedes recuperarlo con «Deshacer último cambio».")) {
                          run(() => deleteBlock(b.id), "Bloque eliminado.", () => {
                            if (selected === b.id) {
                              setSelected(null);
                              setDraft(null);
                            }
                          });
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              }}
            />
            <div className="mt-3">
              {adding ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Tipo de bloque">
                  {BLOCK_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      disabled={pending}
                      className="flex flex-col items-center gap-1 rounded-xl border border-[#EFE6F2] bg-white p-2.5 text-center text-xs font-bold text-[#1B1830] transition hover:border-[#D6006A]"
                      onClick={() => {
                        setAdding(false);
                        run(
                          () => createBlock(lesson.id, { block_type: p.type, title: p.title ?? null, body: p.body ?? null, data: p.data, teacher_only: false }),
                          `Se agregó: ${p.label}.`,
                          (id) => {
                            if (id) {
                              setSelected(id);
                              setDraft({ block_type: p.type, title: p.title ?? null, body: p.body ?? null, data: p.data, teacher_only: false });
                            }
                          },
                        );
                      }}
                    >
                      <span aria-hidden className="text-xl">
                        {p.icon}
                      </span>
                      {p.label}
                    </button>
                  ))}
                  <button type="button" className={`${btn.ghost} col-span-2 sm:col-span-4`} onClick={() => setAdding(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className={btn.primary} onClick={() => setAdding(true)}>
                  + Agregar bloque
                </button>
              )}
            </div>
          </section>

          {current && draft && (
            <section ref={formRef} className="rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm" aria-label="Editar bloque">
              <BlockForm key={current.id} draft={draft} onChange={setDraft} courseId={courseId} ebooks={ebooks} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btn.primary} disabled={pending || !dirty} onClick={() => run(() => updateBlock(current.id, draft), "Bloque guardado.")}>
                  {pending ? "Guardando…" : "Guardar bloque"}
                </button>
                <button type="button" className={btn.ghost} disabled={!dirty} onClick={() => setDraft(toDraft(current))}>
                  Descartar cambios
                </button>
                <button
                  type="button"
                  className={btn.ghost}
                  onClick={() => {
                    if (!dirty || confirm("¿Cerrar sin guardar?")) {
                      setSelected(null);
                      setDraft(null);
                    }
                  }}
                >
                  Cerrar
                </button>
              </div>
            </section>
          )}
        </div>

        <section className="min-w-0 lg:sticky lg:top-4 lg:self-start" aria-label="Vista previa">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#5E5A73]">Vista previa del estudiante</h2>
            {lesson.status === "published" && (
              <Link href={`/app/lecciones/${lesson.id}`} className="text-sm font-bold text-[#D6006A] hover:underline">
                Abrir en la app →
              </Link>
            )}
          </div>
          <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-[#EFE6F2] bg-white shadow-sm">{preview}</div>
          {dirty && <p className="mt-2 text-xs font-bold text-[#8A6A00]">La vista previa muestra cambios sin guardar.</p>}
        </section>
      </div>
    </div>
  );
}
