// App emails (emails/app/*.html + emails/manifest.json) sent through Resend.
// Templates live in the private Storage bucket 'email-templates' (uploaded from the repo by
// scripts/upload-email-templates.mjs) so a copy change doesn't need a function redeploy.
// Every send is logged in public.email_outbox; dedupe_key makes each email go out at most once.
// Without RESEND_API_KEY nothing leaves: the row is stored with status 'stubbed'.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type ManifestEntry = { id: string; file: string; subject: string; from_name: string; from_email: string; marketing: boolean; variables: string[] };
type Template = ManifestEntry & { html: string };

export const siteUrl = () => (Deno.env.get("SITE_URL") ?? "https://celsuniversity.vercel.app").replace(/\/$/, "");
const functionsUrl = () => `${Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "")}/functions/v1`;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

let cache: { at: number; templates: Map<string, Template> } | null = null;

async function templates(admin: SupabaseClient) {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.templates;
  const read = async (path: string) => {
    const { data, error } = await admin.storage.from("email-templates").download(path);
    if (error || !data) throw new Error(`email template ${path}: ${error?.message ?? "missing"}`);
    return await data.text();
  };
  const manifest = JSON.parse(await read("manifest.json")) as { emails: ManifestEntry[] };
  const app = manifest.emails.filter((e) => e.file.startsWith("app/"));
  const map = new Map<string, Template>();
  await Promise.all(app.map(async (e) => map.set(e.id, { ...e, html: await read(e.file) })));
  cache = { at: Date.now(), templates: map };
  return map;
}

export async function hasTemplate(admin: SupabaseClient, id: string) {
  return (await templates(admin)).has(id);
}

/** Fills {{variables}}. Values are HTML-escaped, except the ones named *_html (built by us). */
function fill(text: string, vars: Record<string, string>, html: boolean) {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, k: string) => {
    const v = vars[k] ?? "";
    return html && !k.endsWith("_html") ? esc(v) : v;
  });
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", middot: "·" };

/** Plain-text version: links become "text (url)", blocks become lines. */
export function htmlToText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, "") // hidden preheader
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      return label && label !== href ? `${label} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : m))
    .replace(/[͏‌­]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const helpUrls = () => ({ ayuda_url: `${siteUrl()}/ayuda`, privacidad_url: `${siteUrl()}/privacidad` });

export type SendInput = {
  template: string;
  to: string;
  vars: Record<string, string>;
  /** One send per key, ever: e.g. `receipt:<order id>`. */
  dedupeKey: string;
  leadId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  /** Lead's unsubscribe token: required for marketing emails. */
  unsubscribeToken?: string | null;
};

/**
 * "duplicate": already sent under this key. "failed": Resend refused it for good (e.g. a bad
 * address); it isn't retried. Temporary failures (network, 429, 5xx) throw and free the key, so
 * the next run tries again.
 */
export async function sendTemplate(admin: SupabaseClient, input: SendInput): Promise<"sent" | "stubbed" | "duplicate" | "failed"> {
  const tpl = (await templates(admin)).get(input.template);
  if (!tpl) throw new Error(`unknown email template ${input.template}`);

  const vars: Record<string, string> = { ...helpUrls(), ...input.vars };
  const headers: Record<string, string> = {};
  if (tpl.marketing) {
    if (!input.unsubscribeToken) throw new Error(`${input.template} is marketing: unsubscribe token required`);
    const t = encodeURIComponent(input.unsubscribeToken);
    vars.baja_url = `${siteUrl()}/desuscribir?t=${t}`;
    vars.preferencias_url = vars.baja_url; // the only preference today is opting out
    // RFC 8058 one-click: mail apps POST "List-Unsubscribe=One-Click" here, no page involved.
    headers["List-Unsubscribe"] = `<${functionsUrl()}/send-email?unsubscribe=${t}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const missing = tpl.variables.filter((v) => vars[v] === undefined);
  if (missing.length) throw new Error(`${input.template}: missing ${missing.join(", ")}`);

  const subject = fill(tpl.subject, vars, false);
  const html = fill(tpl.html, vars, true);
  const text = htmlToText(html);
  const key = Deno.env.get("RESEND_API_KEY");

  const { data: row, error } = await admin
    .from("email_outbox")
    .insert({ template: tpl.id, kind: tpl.id, to_email: input.to, subject, html, status: key ? "sending" : "stubbed", dedupe_key: input.dedupeKey, lead_id: input.leadId ?? null, user_id: input.userId ?? null, order_id: input.orderId ?? null })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(error.message);
  }
  if (!key) return "stubbed";

  const fail = async (error: string, retry: boolean) => {
    await admin.from("email_outbox").update({ status: "failed", error, ...(retry ? { dedupe_key: null } : {}) }).eq("id", row.id);
    if (retry) throw new Error(`Resend: ${error}`);
    console.error("email refused", input.template, error);
    return "failed" as const;
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": input.dedupeKey.slice(0, 256) },
    body: JSON.stringify({
      from: `${tpl.from_name} <${tpl.from_email}>`,
      to: [input.to],
      subject,
      html,
      text,
      headers,
      ...(Deno.env.get("EMAIL_REPLY_TO") ? { reply_to: Deno.env.get("EMAIL_REPLY_TO") } : {}),
      tags: [{ name: "template", value: tpl.id.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    }),
  }).catch((e: Error) => e);
  if (res instanceof Error) return await fail(res.message, true);
  const out = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return await fail(`${res.status} ${out.message ?? ""}`.trim(), res.status === 429 || res.status >= 500);
  await admin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), resend_id: out.id ?? null }).eq("id", row.id);
  return "sent";
}

/** USD → MXN for the "≈ $X MXN" lines. Null when the rate service is down. */
let rate: { at: number; mxn: number } | null = null;
export async function mxnRate() {
  if (rate && Date.now() - rate.at < 12 * 3600_000) return rate.mxn;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(4000) });
    const mxn = ((await r.json()) as { rates?: { MXN?: number } }).rates?.MXN;
    if (mxn) rate = { at: Date.now(), mxn };
    return mxn ?? null;
  } catch {
    return null;
  }
}

/** "$1,850" (rounded to 50, like the design), or "" without a rate. */
export async function mxn(usd: number) {
  const r = await mxnRate();
  return r ? `$${(Math.round((usd * r) / 50) * 50).toLocaleString("en-US")}` : "";
}

export const firstName = (s: string | null | undefined) => (s ?? "").trim().split(/\s+/)[0] || "";
