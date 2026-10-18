// Creates (or refreshes) the dedicated test student, enrolls it in the courses the tests open, and
// stores a signed-in session for the tests (e2e/.auth/student.json). Idempotent; touches only
// @example.com test accounts.
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { AUTH_FILE, BASE_URL, COURSES, CREDS_FILE, PUBLISHABLE_KEY, STUDENT_EMAIL, SUPABASE_URL, admin } from "./env";

export async function ensureUser(email: string, name: string, password: string) {
  const db = admin();
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    // email_confirm: no confirmation email is sent.
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
    if (error || !data.user) throw new Error(`create ${email}: ${error?.message}`);
    user = data.user;
  } else {
    await db.auth.admin.updateUserById(user.id, { password });
  }
  await db.from("profiles").update({ display_name: name }).eq("id", user.id);
  return user.id;
}

/** The @supabase/ssr session cookies for a password sign-in, as Playwright storage state. */
export async function sessionState(email: string, password: string) {
  const jar: { name: string; value: string }[] = [];
  const sb = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, { cookies: { getAll: () => [], setAll: (c) => void jar.push(...c) } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  const url = new URL(BASE_URL);
  return {
    cookies: jar.map((c) => ({ name: c.name, value: c.value, domain: url.hostname, path: "/", expires: -1, httpOnly: false, secure: url.protocol === "https:", sameSite: "Lax" as const })),
    origins: [],
  };
}

export default async function globalSetup() {
  if (!PUBLISHABLE_KEY) throw new Error("SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) is required");
  const db = admin();
  const password = process.env.E2E_PASSWORD || randomBytes(18).toString("base64url");
  const id = await ensureUser(STUDENT_EMAIL, "E2E Estudiante", password);

  const { data: courses } = await db.from("courses").select("id, slug").in("slug", COURSES);
  for (const c of courses ?? []) {
    const { data: has } = await db.from("enrollments").select("id").eq("user_id", id).eq("course_id", c.id).eq("status", "active").maybeSingle();
    if (!has) await db.from("enrollments").insert({ user_id: id, course_id: c.id, status: "active", source: "e2e" });
  }
  // Default preferences, so the preference test starts from a known state.
  await db.from("user_preferences").upsert({ user_id: id, email_promotions: true, text_size: "normal", sound_effects: true }, { onConflict: "user_id" });

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(await sessionState(STUDENT_EMAIL, password)));
  writeFileSync(CREDS_FILE, JSON.stringify({ email: STUDENT_EMAIL, password, userId: id }));
}
