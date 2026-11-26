export const URL_ = "https://pbpnhsgygwqxnkklhyuz.supabase.co";
const KEY = (process.env.SUPABASE_SECRET_KEY || "").replace(/[​\s]/g, "");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
export async function get(path) { const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H }); if (!r.ok) throw new Error(r.status + " " + await r.text()); return r.json(); }
export async function patch(path, body) { const r = await fetch(`${URL_}/rest/v1/${path}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.status + " " + await r.text()); return r.json(); }
export async function post(path, body) { const r = await fetch(`${URL_}/rest/v1/${path}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.status + " " + await r.text()); return r.json(); }
