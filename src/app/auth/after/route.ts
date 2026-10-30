import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { restoreLang } from "@/lib/i18n/restore";

/**
 * Called by the sign-in screen right after a password or email-code sign-in in the browser: the language saved
 * on the profile comes back on this device. A route handler, not a server action, because a server action that
 * sets a cookie refreshes the page, which would cut the welcome screen short.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await restoreLang(supabase, user.id).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
