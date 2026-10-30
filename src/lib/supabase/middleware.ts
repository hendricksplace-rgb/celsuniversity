import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";
import { REMEMBER_COOKIE, authCookieOptions, withRemember } from "./cookies";

// Paths that need a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ["/app"];

// The old production address (C-037): students only ever get one domain's cookies, so it 308s to SITE_URL.
// Preview deployments (celsuniversity-git-…vercel.app) are left alone.
const OLD_HOSTS = ["celsuniversity.vercel.app"];
const SITE = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;

/**
 * The only place the session is refreshed (C-037): getUser() once per request, and every cookie it writes goes
 * onto the response. Server Components, route handlers and server actions read the session, never refresh it.
 * A transient Auth failure (network, 5xx) never counts as signed out: the page renders and the browser client
 * retries; only a missing or revoked session sends /app/* to /entrar.
 */
export async function updateSession(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  if (SITE && OLD_HOSTS.includes(host) && host !== SITE.host) {
    const to = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE);
    return NextResponse.redirect(to, 308);
  }

  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions(request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, withRemember(options, remember)));
        // Cache-Control: private, no-store on a refresh, so no CDN ever serves one student's cookies to another.
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getUser(): it refreshes the session.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !transient(error) && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/entrar";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

/** Auth was unreachable or failed on its side (no status, 5xx, 429): not a reason to sign anyone out. */
function transient(error: { status?: number; name?: string } | null) {
  if (!error || error.name === "AuthSessionMissingError") return false;
  return !error.status || error.status >= 500 || error.status === 429;
}
