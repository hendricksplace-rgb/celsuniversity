// Leaves the test student as the next run expects it: no saved answer, default preferences; removes
// the throwaway buyers created by the purchase test.
import { existsSync, readFileSync } from "node:fs";
import { CREDS_FILE, admin } from "./env";

export default async function globalTeardown() {
  if (!existsSync(CREDS_FILE)) return;
  const db = admin();
  const { userId } = JSON.parse(readFileSync(CREDS_FILE, "utf8")) as { userId: string };
  await db.from("lesson_answers").delete().eq("user_id", userId);
  await db.from("user_preferences").upsert({ user_id: userId, email_promotions: true, text_size: "normal", sound_effects: true }, { onConflict: "user_id" });
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  // Purchase-test buyers (delivered+e2e-buyer-…@resend.dev; older runs used @example.com). E2E_KEEP_BUYERS=1
  // keeps them for a dashboard refund check (e2e/purchase.spec.ts).
  if (process.env.E2E_KEEP_BUYERS !== "1")
    for (const u of list.users.filter((x) => /^(delivered\+)?e2e-buyer-\d+@(example\.com|resend\.dev)$/.test(x.email ?? ""))) await db.auth.admin.deleteUser(u.id);
}
