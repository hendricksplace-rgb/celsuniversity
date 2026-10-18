"use client";
// Last resort, when the root layout itself fails: it replaces the whole document, so it brings its own
// <html> and plain styles (the app's CSS may not have loaded).
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error, "boundary"), [error]);
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FFFFFF", color: "#1B1830" }}>
        <div role="alert" style={{ maxWidth: 420, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Algo salió mal.</h1>
          <p style={{ color: "#5E5A73", fontWeight: 600 }}>Ya nos avisaron y lo vamos a revisar. Puedes volver a intentarlo.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, border: 0, borderRadius: 999, background: "#D6006A", color: "#FFFFFF", padding: "12px 24px", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
          >
            Volver a intentar
          </button>
        </div>
      </body>
    </html>
  );
}
