"use client";
// Sends a browser error to public.client_errors (log_client_error: 20 per session a day). Shown to
// staff on /app/admin/errores. Repeats of the same error on the same page are sent once.
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "celsu-error-session";
const sent = new Set<string>();

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

// Browser extensions, cross-origin scripts and benign browser warnings: not our bugs.
const NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i, /chrome-extension:|moz-extension:|safari-(web-)?extension:/i, /Non-Error promise rejection captured/i, /AbortError/i];

export function reportError(error: unknown, kind: "error" | "unhandledrejection" | "boundary" = "error") {
  const err = error instanceof Error ? error : null;
  const message = (err?.message ?? (typeof error === "string" ? error : JSON.stringify(error) ?? "")).slice(0, 1000) || "Error sin mensaje";
  const stack = err?.stack ?? null;
  if (NOISE.some((re) => re.test(message) || (stack && re.test(stack)))) return;
  const route = window.location.pathname;
  const key = `${route}|${message}`;
  if (sent.has(key) || sent.size >= 20) return;
  sent.add(key);
  void createClient()
    .rpc("log_client_error", { p_session_id: sessionId(), p_route: route, p_message: message, p_stack: stack ?? undefined, p_user_agent: navigator.userAgent, p_kind: kind })
    .then(
      () => undefined,
      () => undefined,
    );
}
