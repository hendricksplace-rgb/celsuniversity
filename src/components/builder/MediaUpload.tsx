"use client";

// Upload a file to the course-media bucket with a progress bar. It goes straight to Storage with the
// admin's own session (Storage RLS: course_media_admin), so the server never handles the file.
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";
import { MAX_UPLOAD_MB, mediaPath } from "@/lib/builder";
import { btn } from "./ui";

export function MediaUpload({ courseId, accept, onUploaded }: { courseId: string; accept: string; onUploaded: (ref: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`El archivo pesa ${(file.size / 1048576).toFixed(0)} MB; el límite es ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Tu sesión expiró. Vuelve a entrar.");
      return;
    }
    const { url, key } = supabaseEnv();
    const path = mediaPath(courseId, file.name);
    setPct(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${url}/storage/v1/object/course-media/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setPct(null);
      if (xhr.status >= 200 && xhr.status < 300) onUploaded(`storage://course-media/${path}`);
      else setError(xhr.status === 413 ? `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.` : "No se pudo subir el archivo.");
    };
    xhr.onerror = () => {
      setPct(null);
      setError("No se pudo subir el archivo. Revisa tu conexión.");
    };
    xhr.send(file);
  };

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <button type="button" className={btn.ghost} disabled={pct !== null} onClick={() => inputRef.current?.click()}>
        ⬆️ {pct !== null ? "Subiendo…" : "Subir archivo"}
      </button>
      <span className="ml-2 text-xs font-semibold text-[#6B6680]">Máximo {MAX_UPLOAD_MB} MB</span>
      {pct !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-[#F1EDF5]" role="progressbar" aria-label="Subiendo archivo" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#D6006A] transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}
