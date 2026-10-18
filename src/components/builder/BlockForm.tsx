"use client";

// The form for one block, by type, plus a raw JSON tab. Edits stay in the draft until "Guardar".
import { useEffect, useState } from "react";
import { formKind, BLOCK_LABEL, type QuizQuestion } from "@/lib/builder";
import { MediaUpload } from "./MediaUpload";
import { btn, input, label } from "./ui";

export type Draft = { block_type: string; title: string | null; body: string | null; data: Record<string, unknown>; teacher_only: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");

function Field({ id, text, children, hint }: { id: string; text: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
      {hint && <p className="text-xs font-semibold text-[#6B6680]">{hint}</p>}
    </div>
  );
}

export function BlockForm({ draft, onChange, courseId, ebooks }: { draft: Draft; onChange: (d: Draft) => void; courseId: string; ebooks: { slug: string; title: string }[] }) {
  const kind = formKind(draft);
  const [tab, setTab] = useState<"form" | "json">(kind === "json" ? "json" : "form");
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const setData = (patch: Record<string, unknown>) => set({ data: { ...draft.data, ...patch } });
  const settings = (draft.data.settings && typeof draft.data.settings === "object" ? draft.data.settings : {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Modo de edición" className="flex gap-1 rounded-full bg-[#F1EDF5] p-1 text-sm font-bold">
        {(
          [
            ["form", "Formulario"],
            ["json", "JSON"],
          ] as const
        ).map(([k, text]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            disabled={k === "form" && kind === "json"}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-full px-3 py-1.5 ${tab === k ? "bg-white shadow-sm" : "text-[#5E5A73]"} disabled:opacity-40`}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <JsonTab draft={draft} onChange={onChange} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#D6006A]">{BLOCK_LABEL[kind]}</p>
          <Field id="b-title" text={kind === "image" ? "Título (también es el texto alternativo)" : "Título"}>
            <input id="b-title" className={`${input} w-full`} value={draft.title ?? ""} onChange={(e) => set({ title: e.target.value || null })} />
          </Field>

          {(kind === "text" || kind === "activity") && (
            <>
              <Field id="b-body" text="Texto" hint="Los enlaces se vuelven clicables. Deja una línea en blanco entre párrafos.">
                <textarea id="b-body" rows={8} className={`${input} w-full`} value={draft.body ?? ""} onChange={(e) => set({ body: e.target.value })} />
              </Field>
              <Field id="b-es" text="Traducción al español (opcional)" hint='Se muestra con "Ver en español".'>
                <textarea id="b-es" rows={4} className={`${input} w-full`} value={str(draft.data.text_es)} onChange={(e) => setData({ text_es: e.target.value || undefined })} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="size-4 accent-[#D6006A]" checked={draft.data.response_field === true} onChange={(e) => setData({ response_field: e.target.checked || undefined })} />
                Caja de respuesta del estudiante (actividad)
              </label>
            </>
          )}

          {kind === "video" && (
            <>
              <Field id="b-url" text="Enlace del video" hint="YouTube, Vimeo, un enlace .mp4, o sube el archivo.">
                <input id="b-url" className={`${input} w-full`} value={str(draft.data.media_url)} onChange={(e) => setData({ media_url: e.target.value.trim() })} placeholder="https://youtu.be/…" />
              </Field>
              <MediaUpload courseId={courseId} accept="video/mp4,video/webm,video/quicktime" onUploaded={(ref) => setData({ media_url: ref })} />
              <Field id="b-thumb" text="Miniatura (opcional)">
                <input id="b-thumb" className={`${input} w-full`} value={str(draft.data.thumbnail_url)} onChange={(e) => setData({ thumbnail_url: e.target.value.trim() || undefined })} />
              </Field>
              <MediaUpload courseId={courseId} accept="image/*" onUploaded={(ref) => setData({ thumbnail_url: ref })} />
            </>
          )}

          {kind === "audio" && (
            <>
              <Field id="b-url" text="Archivo de audio" hint="Sube un MP3 o M4A.">
                <input id="b-url" className={`${input} w-full`} value={str(draft.data.media_url)} onChange={(e) => setData({ media_url: e.target.value.trim() })} />
              </Field>
              <MediaUpload courseId={courseId} accept="audio/*" onUploaded={(ref) => setData({ media_url: ref })} />
              <Field id="b-body" text="Texto (opcional)">
                <textarea id="b-body" rows={3} className={`${input} w-full`} value={draft.body ?? ""} onChange={(e) => set({ body: e.target.value || null })} />
              </Field>
            </>
          )}

          {kind === "image" && (
            <>
              <Field id="b-url" text="Imagen">
                <input id="b-url" className={`${input} w-full`} value={str(draft.data.media_url)} onChange={(e) => setData({ media_url: e.target.value.trim() })} />
              </Field>
              <MediaUpload courseId={courseId} accept="image/*" onUploaded={(ref) => setData({ media_url: ref })} />
            </>
          )}

          {kind === "embed" && (
            <>
              <Field id="b-src" text="Enlace" hint="Los estudiantes solo ven videos de YouTube o Vimeo; otros sitios se muestran como bloqueados.">
                <input id="b-src" className={`${input} w-full`} value={str(settings.src)} onChange={(e) => setData({ settings: { ...settings, src: e.target.value.trim() } })} />
              </Field>
              <Field id="b-h" text="Altura (px)">
                <input
                  id="b-h"
                  type="number"
                  min={200}
                  max={2000}
                  className={`${input} w-32`}
                  value={Number(settings.height ?? 600)}
                  onChange={(e) => setData({ settings: { ...settings, height: Number(e.target.value) || 600 } })}
                />
              </Field>
            </>
          )}

          {kind === "ebook" && (
            <>
              <Field id="b-book" text="E-book">
                <select id="b-book" className={`${input} w-full`} value={str(draft.data.ebook_slug)} onChange={(e) => setData({ ebook_slug: e.target.value })}>
                  <option value="">Elige un e-book…</option>
                  {ebooks.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="b-screen" text="Pantalla donde abre (opcional)" hint="Por ejemplo m4. Vacío: abre al inicio.">
                <input id="b-screen" className={`${input} w-32`} value={str(draft.data.ebook_screen)} onChange={(e) => setData({ ebook_screen: e.target.value.trim() || undefined })} />
              </Field>
            </>
          )}

          {kind === "quiz" && <QuizForm questions={(Array.isArray(draft.data.settings) ? draft.data.settings : []) as QuizQuestion[]} onChange={(q) => setData({ settings: q })} />}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" className="size-4 accent-[#D6006A]" checked={draft.teacher_only} onChange={(e) => set({ teacher_only: e.target.checked })} />
        Solo para profesores
      </label>
    </div>
  );
}

function QuizForm({ questions, onChange }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  const update = (i: number, patch: Partial<QuizQuestion>) => onChange(questions.map((q, n) => (n === i ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <fieldset key={i} className="space-y-2 rounded-xl border border-[#EFE6F2] p-3">
          <legend className="px-1 text-xs font-extrabold text-[#5E5A73]">Pregunta {i + 1}</legend>
          <input aria-label={`Pregunta ${i + 1}`} className={`${input} w-full`} value={q.question ?? ""} placeholder="Escribe la pregunta" onChange={(e) => update(i, { question: e.target.value })} />
          {(q.options ?? []).map((o, k) => (
            <div key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${i}`}
                className="size-4 accent-[#15803D]"
                checked={q.correct === k}
                onChange={() => update(i, { correct: k })}
                aria-label={`Opción ${k + 1} es la correcta`}
              />
              <input
                aria-label={`Opción ${k + 1}`}
                className={`${input} flex-1`}
                value={o}
                onChange={(e) => update(i, { options: q.options.map((x, n) => (n === k ? e.target.value : x)) })}
              />
              {q.options.length > 2 && (
                <button
                  type="button"
                  className={btn.danger}
                  aria-label={`Quitar opción ${k + 1}`}
                  onClick={() => update(i, { options: q.options.filter((_, n) => n !== k), correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct })}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {q.options.length < 6 && (
              <button type="button" className={btn.small} onClick={() => update(i, { options: [...q.options, ""] })}>
                + Opción
              </button>
            )}
            <button type="button" className={btn.danger} onClick={() => onChange(questions.filter((_, n) => n !== i))}>
              Quitar pregunta
            </button>
          </div>
          <input aria-label={`Explicación de la pregunta ${i + 1}`} className={`${input} w-full`} value={q.explanation ?? ""} placeholder="Explicación (opcional)" onChange={(e) => update(i, { explanation: e.target.value })} />
        </fieldset>
      ))}
      <button type="button" className={btn.ghost} onClick={() => onChange([...questions, { question: "", options: ["", ""], correct: 0, explanation: "" }])}>
        + Pregunta
      </button>
    </div>
  );
}

function JsonTab({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [text, setText] = useState(() => JSON.stringify(draft, null, 2));
  const [error, setError] = useState("");
  // Form edits made in the other tab show up here (but typing here isn't reformatted).
  const serialized = JSON.stringify(draft, null, 2);
  useEffect(() => {
    setText((cur) => {
      try {
        return JSON.stringify(JSON.parse(cur), null, 2) === serialized ? cur : serialized;
      } catch {
        return cur;
      }
    });
  }, [serialized]);
  return (
    <div className="space-y-1">
      <label htmlFor="b-json" className={label}>
        JSON del bloque
      </label>
      <textarea
        id="b-json"
        rows={16}
        spellCheck={false}
        className={`${input} w-full font-mono text-xs`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const v = JSON.parse(e.target.value) as Partial<Draft>;
            if (!v || typeof v !== "object" || typeof v.block_type !== "string" || !v.data || typeof v.data !== "object" || Array.isArray(v.data)) throw new Error("shape");
            setError("");
            onChange({ block_type: v.block_type, title: v.title ?? null, body: v.body ?? null, data: v.data, teacher_only: !!v.teacher_only });
          } catch {
            setError("JSON no válido: necesita block_type (texto) y data (objeto).");
          }
        }}
      />
      {error && (
        <p role="alert" className="text-sm font-bold text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}
