"use client";
// Mounted once in the root layout: uncaught errors and rejected promises go to /app/admin/errores.
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Errors from scripts on other origins (players, extensions) carry no usable detail.
      if (e.filename && !e.filename.startsWith(window.location.origin)) return;
      reportError(e.error ?? e.message, "error");
    };
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason, "unhandledrejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
