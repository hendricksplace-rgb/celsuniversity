import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

// Email links in the token_hash form: ?token_hash=…&type=recovery|signup|email_change|invite|magiclink&next=/…
// Unlike /auth/callback (PKCE code), these work in ANY browser, so a reset link opened in Gmail's in-app
// browser or on another device still works. The Supabase email templates point here (docs/stripe-live.md
// switch-day list; e.g. Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nueva-contrasena).
const TYPES: EmailOtpType[] = ["recovery", "signup", "email_change", "invite", "magiclink", "email"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next") ?? (type === "recovery" ? "/nueva-contrasena" : "/app"));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // Expired or already used: the reset page explains it and offers a new link.
  if (type === "recovery") return NextResponse.redirect(`${origin}/nueva-contrasena?error=expired`);
  return NextResponse.redirect(`${origin}/entrar?error=generic`);
}
