// PARKED (Matt, 2026-10-18): no Kajabi access, so no import. Current students sign up themselves and staff
// grant access in Admin → Estudiantes (docs/after-launch.md). Kept in case an export turns up.
//
// Student migration: Kajabi export (+ Base44, if it has students) → Supabase Auth + enrollments.
//
//   node --env-file=.env.local scripts/migrate-students.mjs --kajabi <people.csv> [--kajabi-offers <offers.csv>]
//        [--base44 <base44.json>] [--out <plan.json>]                                 # dry run (default)
//   MIGRATION_APPROVED=yes node --env-file=.env.local scripts/migrate-students.mjs ... --apply   # only after Matt approves
//
// Dry run only READS (Supabase profiles, to flag students already here) and prints the plan. --apply
// is refused unless MIGRATION_APPROVED=yes. Apply creates each auth user with email_confirm=true and
// NO email of any kind (auth.admin.createUser sends nothing; no invite, no magic link), sets
// profiles.legacy_id, and inserts enrollments with source='migration'.
//
// Sources
// - Kajabi "People" export (CSV): Name, Email, Products/Offers, Created At …; optional "Offers" or
//   "Purchases" export with one row per purchase (Email, Offer/Product, Created At/Purchased At,
//   Status, Expires/Access end). Headers are matched loosely (see COL).
// - Base44 (JSON from scripts/migrate-students-extract.md): { users:[{id,email,full_name}],
//   profiles:[{user_id,email,display_name,role}], enrollments:[{user_id,course_id,program_id,status}],
//   courses:[{id,title}], programs:[{id,title}] }.
// Merge rule: one student per normalized email (trim + lowercase). Kajabi wins for name, offers and
// dates (it's where students bought); Base44 only adds a legacy id and any program not in Kajabi.
// Access end date: the export's own end date when present; otherwise purchase date + the months the
// matching product grants today (public.products.grants), flagged "estimated".
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const APPLY = args.includes("--apply");
if (APPLY && process.env.MIGRATION_APPROVED !== "yes") {
  console.error("Refusing --apply: Matt must approve the migration first (set MIGRATION_APPROVED=yes).");
  process.exit(1);
}

// What each Kajabi offer / Base44 program lands in. Order matters: first match wins.
const TARGETS = [
  { re: /global|ipd|international|profesional|pro[\s-]?tn|tn\b/i, program: "international-professional-development", months: 18, label: "CelsGLOBAL" },
  { re: /bsns|business|negocios|e4b/i, course: "english-for-business", months: 6, label: "CelsBSNS" },
  { re: /\bus\b|celsus|ciudadan|citizenship|civics/i, course: "celsus-para-ciudadania", months: 9, label: "CelsUS" },
  { re: /celstv|generation|\btv\b|e4og|ingl[eé]s para la vida/i, course: "celstv-english-for-our-generation", months: 12, label: "CelsTV" },
  { re: /finanzas/i, course: "finanzas-personales-en-estados-unidos", months: 18, label: "Finanzas (CelsGLOBAL)" },
  { re: /resume|cv/i, course: "from-cv-to-u-s-resume-a-step-by-step-guide", months: 18, label: "Resume (CelsGLOBAL)" },
  { re: /interview|entrevista/i, course: "crack-the-u-s-interview-code", months: 18, label: "Interview (CelsGLOBAL)" },
];
const COL = {
  email: /^e-?mail/i,
  name: /^(full )?name|^nombre/i,
  first: /^first/i,
  last: /^last/i,
  offers: /products?|offers?|producto|oferta|course/i,
  created: /created|purchased|joined|fecha/i,
  end: /expir|access.?end|ends?\b|vence|fin/i,
  status: /status|estado/i,
};

// Minimal RFC 4180 CSV parser (quotes, commas and newlines inside quotes).
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [head = [], ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
const pick = (row, re) => Object.entries(row).find(([k, v]) => re.test(k) && v)?.[1] ?? "";
const normEmail = (e) => (e ?? "").trim().toLowerCase();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const date = (s) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
const addMonths = (d, m) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};
function target(offer) {
  return TARGETS.find((t) => t.re.test(offer)) ?? null;
}

// ---- Read sources ----
const students = new Map(); // email → student
const noEmail = [];
const duplicates = [];
const unknownOffers = new Map();
const counts = { kajabiRows: 0, kajabiOfferRows: 0, base44Users: 0, base44Students: 0 };

function upsert(email, from, fields) {
  const s = students.get(email);
  if (!s) {
    students.set(email, { email, name: fields.name ?? "", sources: [from], offers: [], legacyId: fields.legacyId ?? null });
    return students.get(email);
  }
  if (!s.sources.includes(from)) s.sources.push(from);
  else duplicates.push({ email, from, resolved: "merged into one student (offers combined, latest end date kept)" });
  if (from === "kajabi" && fields.name) s.name = fields.name; // Kajabi wins for the name
  if (!s.name && fields.name) s.name = fields.name;
  if (fields.legacyId && !s.legacyId) s.legacyId = fields.legacyId;
  return s;
}
function addOffer(s, from, offer, created, end, status) {
  for (const part of offer.split(/[;|]|,(?=\s*[A-Z])/).map((x) => x.trim()).filter(Boolean)) {
    const t = target(part);
    if (!t) {
      unknownOffers.set(part, (unknownOffers.get(part) ?? 0) + 1);
      (s.unknown ??= []).push(part);
      continue;
    }
    s.offers.push({ from, offer: part, target: t, created: date(created), end: date(end), status: status || "active" });
  }
}

const kajabiPath = opt("--kajabi");
if (kajabiPath) {
  for (const r of parseCsv(readFileSync(kajabiPath, "utf8"))) {
    counts.kajabiRows++;
    const email = normEmail(pick(r, COL.email));
    const name = pick(r, COL.name) || [pick(r, COL.first), pick(r, COL.last)].filter(Boolean).join(" ");
    if (!validEmail(email)) {
      noEmail.push({ source: "kajabi", name });
      continue;
    }
    const s = upsert(email, "kajabi", { name });
    addOffer(s, "kajabi", pick(r, COL.offers), pick(r, COL.created), pick(r, COL.end), pick(r, COL.status));
  }
}
const offersPath = opt("--kajabi-offers");
if (offersPath) {
  for (const r of parseCsv(readFileSync(offersPath, "utf8"))) {
    counts.kajabiOfferRows++;
    const email = normEmail(pick(r, COL.email));
    if (!validEmail(email)) {
      noEmail.push({ source: "kajabi-offers", name: pick(r, COL.name) });
      continue;
    }
    const s = students.get(email) ?? upsert(email, "kajabi", { name: pick(r, COL.name) });
    addOffer(s, "kajabi", pick(r, COL.offers), pick(r, COL.created), pick(r, COL.end), pick(r, COL.status));
  }
}
const base44Path = opt("--base44");
if (base44Path) {
  const b = JSON.parse(readFileSync(base44Path, "utf8"));
  const titles = new Map([...(b.courses ?? []), ...(b.programs ?? [])].map((x) => [x.id, x.title]));
  const userEmail = new Map((b.users ?? []).map((u) => [u.id, u.email]));
  counts.base44Users = (b.users ?? []).length;
  for (const p of b.profiles ?? []) {
    if (!["student", "individual_student"].includes(p.role)) continue; // staff move by hand
    counts.base44Students++;
    const email = normEmail(p.email || userEmail.get(p.user_id));
    if (!validEmail(email)) {
      noEmail.push({ source: "base44", name: p.display_name ?? "" });
      continue;
    }
    const s = upsert(email, "base44", { name: p.display_name, legacyId: p.user_id });
    for (const e of (b.enrollments ?? []).filter((x) => x.user_id === p.user_id && x.status === "active")) {
      // Kajabi wins: a Base44 program is only added when Kajabi has nothing for that course.
      const offer = titles.get(e.course_id ?? e.program_id) ?? "";
      const t = target(offer);
      if (t && s.offers.some((o) => o.target.label === t.label)) continue;
      addOffer(s, "base44", offer, e.created_date, null, "active");
    }
  }
}

// ---- Plan ----
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY?.replace(/[​-‍⁠﻿]/g, "").trim();
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required (local .env.local only)");
const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: existing, error: pe } = await admin.from("profiles").select("id, email");
if (pe) throw pe;
const already = new Map((existing ?? []).map((p) => [normEmail(p.email), p.id]));
const { data: courses } = await admin.from("courses").select("id, slug");
const { data: programs } = await admin.from("programs").select("id, slug");
const courseId = new Map((courses ?? []).map((c) => [c.slug, c.id]));
const programId = new Map((programs ?? []).map((p) => [p.slug, p.id]));
const now = new Date();
// Access length per program comes from what the product grants today (public.products.grants, the longest
// grant wins); TARGETS' months are only the fallback (the CelsGLOBAL courses bought on their own).
const { data: products } = await admin.from("products").select("grants").eq("active", true);
for (const t of TARGETS) {
  const months = (products ?? [])
    .flatMap((p) => (Array.isArray(p.grants) ? p.grants : []))
    .filter((g) => (t.course && g.course === t.course) || (t.program && g.program === t.program))
    .map((g) => g.months);
  if (months.length) t.months = Math.max(...months);
}

const plan = [...students.values()].map((s) => {
  // One enrollment per landing course/program: the latest end date wins.
  const byTarget = new Map();
  for (const o of s.offers) {
    const end = o.end ?? (o.created ? addMonths(o.created, o.target.months) : null);
    const prev = byTarget.get(o.target.label);
    if (!prev || (end && (!prev.end || end > prev.end))) byTarget.set(o.target.label, { ...o, end, estimated: !o.end });
  }
  const enrollments = [...byTarget.values()].map((o) => ({
    label: o.target.label,
    course: o.target.course ?? null,
    program: o.target.program ?? null,
    starts_at: o.created?.toISOString() ?? null,
    expires_at: o.end?.toISOString() ?? null,
    end_estimated: o.estimated,
    expired: !!o.end && o.end < now,
    status: /cancel|refund|inactive/i.test(o.status) ? "cancelled" : "active",
  }));
  const flags = [];
  if (already.has(s.email)) flags.push("already in Supabase");
  if (!enrollments.length) flags.push("no mappable program");
  if (enrollments.some((e) => e.end_estimated)) flags.push("end date estimated");
  if (enrollments.some((e) => !e.expires_at)) flags.push("no end date");
  if (enrollments.length && enrollments.every((e) => e.expired)) flags.push("all access expired");
  if (s.sources.length > 1) flags.push("in Kajabi and Base44");
  if (s.unknown?.length) flags.push("unknown product: " + [...new Set(s.unknown)].join(", "));
  return { ...s, offers: undefined, enrollments, flags, existingUserId: already.get(s.email) ?? null };
});

const summary = {
  mode: APPLY ? "apply" : "dry-run",
  // Batch 4 §3: matched (already has a CelsU account), new (account to create), unknown product (at least one
  // Kajabi product we can't map), expired (every access already ended).
  matched: plan.filter((p) => p.existingUserId).length,
  new: plan.filter((p) => !p.existingUserId && p.enrollments.length).length,
  unknownProduct: plan.filter((p) => p.unknown?.length).length,
  expired: plan.filter((p) => p.flags.includes("all access expired")).length,
  accessMonths: Object.fromEntries(TARGETS.map((t) => [t.label, t.months])),
  sources: counts,
  students: plan.length,
  matchedKajabiAndBase44: plan.filter((p) => p.sources.length > 1).length,
  duplicates: duplicates.length,
  noEmail: noEmail.length,
  alreadyInSupabase: plan.filter((p) => p.existingUserId).length,
  perLanding: plan
    .flatMap((p) => p.enrollments)
    .reduce((acc, e) => {
      const k = e.label;
      acc[k] ??= { enrollments: 0, active: 0, expired: 0, estimatedEnd: 0 };
      acc[k].enrollments++;
      acc[k][e.expired ? "expired" : "active"]++;
      if (e.end_estimated) acc[k].estimatedEnd++;
      return acc;
    }, {}),
  unknownOffers: Object.fromEntries(unknownOffers),
};
writeFileSync(opt("--out") ?? "migration-plan.json", JSON.stringify({ summary, plan, duplicates, noEmail }, null, 1));
console.log(JSON.stringify(summary, null, 2));

// ---- Apply (never in dry run) ----
if (APPLY) {
  const totals = { accountsCreated: 0, accountsReused: 0, enrollmentsCreated: 0, enrollmentsSkipped: 0, errors: 0 };
  for (const p of plan) {
    if (p.flags.includes("no mappable program")) continue;
    let uid = p.existingUserId;
    if (!uid) {
      // No password and no email: createUser with email_confirm does not invite or notify. Students set a
      // password with "¿Olvidaste tu contraseña?" or the moving email's link (sent later, only with approval).
      const { data, error } = await admin.auth.admin.createUser({ email: p.email, email_confirm: true, user_metadata: { display_name: p.name } });
      if (error) {
        console.error("createUser", p.email, error.message);
        totals.errors++;
        continue;
      }
      uid = data.user.id;
      totals.accountsCreated++;
    } else totals.accountsReused++;
    if (p.legacyId) await admin.from("profiles").update({ legacy_id: p.legacyId }).eq("id", uid);
    for (const e of p.enrollments) {
      const row = {
        user_id: uid,
        course_id: e.course ? courseId.get(e.course) : null,
        program_id: e.program ? programId.get(e.program) : null,
        enrollment_type: "individual",
        status: e.status,
        source: "migration",
        starts_at: e.starts_at,
        expires_at: e.expires_at,
      };
      // Safe to re-run: an enrollment this migration already created is not added twice.
      let dup = admin.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("source", "migration");
      dup = row.course_id ? dup.eq("course_id", row.course_id) : dup.eq("program_id", row.program_id);
      const { count } = await dup;
      if (count) {
        totals.enrollmentsSkipped++;
        continue;
      }
      const { error } = await admin.from("enrollments").insert(row);
      if (error) {
        console.error("enrollment", p.email, e.label, error.message);
        totals.errors++;
      } else totals.enrollmentsCreated++;
    }
  }
  console.log("Applied.", JSON.stringify(totals));
}
