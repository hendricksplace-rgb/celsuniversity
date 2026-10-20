// While purchases are closed (src/lib/enroll.ts PURCHASES_OPEN), no page may show a checkout (Matt, 2026-10-20 item 2):
// the /comprar/* pages send people to the program's plans instead.
import "server-only";
import { redirect } from "next/navigation";
import { PURCHASES_OPEN, appPlansHref, enrollHref } from "@/lib/enroll";
import type { ProgramKey } from "@/lib/purchase-programs";
import { createClient } from "@/lib/supabase/server";

/** Purchases closed: signed in → /app/planes (request access); signed out → /inscribirme (evaluation or plans). Open: nothing. */
export async function closedPurchaseRedirect(programa: ProgramKey, plan?: string) {
  if (PURCHASES_OPEN) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? appPlansHref(programa, plan) : enrollHref(programa, plan));
}
