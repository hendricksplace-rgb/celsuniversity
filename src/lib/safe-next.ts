const BASE = "http://celsu.invalid";

/**
 * Where to go after sign-in: only paths on this site. Resolving against a dummy origin catches
 * tricks a prefix check misses ("/\evil.com", "/\tevil.com" are read by browsers as "//evil.com").
 */
export function safeNextPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
