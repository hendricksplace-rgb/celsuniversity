"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LANG_COOKIE, isLang } from "@/lib/i18n/dictionaries";
import { safeNextPath } from "@/lib/safe-next";
import { SITE_URL } from "@/lib/site";
import { restoreLang } from "@/lib/i18n/restore";

const safeNext = (value: FormDataEntryValue | null) => safeNextPath(value);

/** Auth email links and OAuth return to SITE_URL (src/lib/site.ts), whatever host the request came from. */
async function siteUrl() {
  return SITE_URL;
}

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang");
  if (isLang(lang)) {
    (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ preferred_language: lang }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/entrar?error=invalid&next=${encodeURIComponent(next)}`);
  await restoreLang(supabase, data.user.id).catch(() => {});
  redirect(next);
}

/** A product code from /registro?plan=… (checked against public.products by handle_new_user / reservePlan). */
const planCode = (value: FormDataEntryValue | null) => {
  const v = String(value ?? "").trim();
  return /^[a-z0-9_]{1,60}$/.test(v) ? v : "";
};

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  // While purchases are closed, the plan the person picked (Matt, 2026-10-20): saved in the sign-up metadata;
  // the handle_new_user trigger copies it to profiles.requested_plan for staff.
  const plan = planCode(formData.get("plan"));
  const keep = plan ? `&plan=${plan}` : "";
  if (password.length < 8) redirect(`/registro?error=weakPassword${keep}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: {
      data: { display_name: String(formData.get("name") ?? "") || undefined, requested_plan: plan || undefined },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/app`,
    },
  });
  if (error) redirect(`/registro?error=generic${keep}`);
  // With email confirmation on, there is no session yet.
  if (!data.session) redirect(`/registro?sent=1${keep}`);
  redirect(plan ? `/registro?reservado=1${keep}` : "/app");
}

/**
 * Saves `plan` (an active product code) as the signed-in person's requested plan: profiles.requested_plan +
 * requested_plan_at on their own row (RLS: own profile; guard_profile_update only blocks evaluation, role and
 * organization fields). Staff then use "Dar acceso". "user" = not signed in, "plan" = unknown or inactive code.
 */
async function saveRequestedPlan(plan: string): Promise<"ok" | "user" | "plan" | "error"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "user";
  if (!plan) return "plan";
  const { data: product } = await supabase.from("products").select("code").eq("code", plan).eq("active", true).maybeSingle();
  if (!product) return "plan";
  const { error } = await supabase.from("profiles").update({ requested_plan: plan, requested_plan_at: new Date().toISOString() }).eq("id", user.id);
  return error ? "error" : "ok";
}

/** A signed-in person on /registro?plan=…: reserve that plan on their own profile (staff then use "Dar acceso"). */
export async function reservePlan(formData: FormData) {
  const plan = planCode(formData.get("plan"));
  const r = await saveRequestedPlan(plan);
  if (r === "user") redirect(`/registro${plan ? `?plan=${plan}` : ""}`);
  if (r === "plan") redirect(plan ? "/registro?error=generic" : "/app");
  if (r === "error") redirect(`/registro?error=generic&plan=${plan}`);
  redirect(`/registro?reservado=1&plan=${plan}`);
}

/**
 * "Solicitar acceso" on /app/planes while purchases are closed: the same request. Called from the client
 * (RequestAccess), which shows the confirmation in place. "user" = signed out.
 */
export async function requestPlanAccess(plan: string): Promise<"ok" | "user" | "error"> {
  const r = await saveRequestedPlan(planCode(plan));
  return r === "ok" || r === "user" ? r : "error";
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/entrar?error=generic");
  redirect(data.url);
}

/**
 * "¿Olvidaste tu contraseña?": always the same answer, so it never reveals whether the email has an
 * account. Called from the server so the PKCE verifier cookie lands in this browser; the link
 * returns to /nueva-contrasena with a code.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/nueva-contrasena` });
  }
  redirect("/recuperar?enviado=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
