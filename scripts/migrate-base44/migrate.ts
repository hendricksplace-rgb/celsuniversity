/**
 * Base44 → Supabase migration for CelsU course content.
 *
 * Reads the Base44 app's catalog entities, copies every non-video file they reference
 * into Supabase Storage, rewrites the URLs, upserts the rows (keyed on legacy_id, so it
 * is safe to re-run) and writes a report comparing record counts.
 *
 *   npm run migrate:base44 -- --dry-run            # read + plan only, no writes
 *   npm run migrate:base44                         # full run
 *   npm run migrate:base44 -- --from-dir <dir>     # read <Entity>.json exports instead of the API
 *   npm run migrate:base44 -- --download-videos <dir>  # also save Base44-hosted videos locally
 *
 * Env (see .env.example): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * BASE44_APP_ID, BASE44_API_KEY. Optional: BASE44_API_URL, BASE44_AUTH_HEADER.
 *
 * File rules (from the project README):
 * - Files on Base44 (media.base44.com, base44.app/.../files/...) and Kajabi's CDN are copied.
 *   Course content goes to the private `course-media` bucket under `<course_id>/…` and the URL
 *   becomes `storage://course-media/<path>` (the app signs it at read time). Catalog art
 *   (course/program covers, module artwork, launcher icons) goes to `public-assets` and gets
 *   its public URL.
 * - Videos are never copied to Supabase. They are listed in the report so they can be moved
 *   to YouTube (public) or Mux/Bunny (paid).
 * - Other external embeds (gamma.app, designrr.page, …) are listed in the report as well.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------- config ----------

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const DRY_RUN = flag("dry-run");
const FROM_DIR = option("from-dir");
const VIDEO_DIR = option("download-videos");
const CONCURRENCY = Number(option("concurrency") ?? 6);
// Run from the repo root (npm run migrate:base44).
const OUT_DIR = join(process.cwd(), "scripts", "migrate-base44", "out");

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the real environment.
}

function env(name: string, required = true) {
  const value = process.env[name];
  if (required && !value) throw new Error(`Missing env var ${name}. See .env.example.`);
  return value ?? "";
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const B44_APP = env("BASE44_APP_ID");
const B44_URL = process.env.BASE44_API_URL ?? "https://app.base44.com";
const B44_AUTH_HEADER = process.env.BASE44_AUTH_HEADER ?? "api_key";

const COPY_HOSTS = [/^media\.base44\.com$/, /^base44\.app$/, /(^|\.)kajabi-cdn\.com$/];
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
const VIDEO_HOSTS = /(^|\.)(wistia\.com|wistia\.net|vimeo\.com|youtube\.com|youtu\.be)$/i;
const ALLOWED_EMBED_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;
const URL_RE = /https?:\/\/[^\s"'<>)\\\]]+/g;

// ---------- types ----------

type Rec = Record<string, unknown> & { id: string };
type Ctx = { bucket: "course-media"; courseId: string; moduleId?: string } | { bucket: "public-assets"; folder: string };

const ENTITIES = [
  "Program",
  "Course",
  "ProgramCourse",
  "Module",
  "Lesson",
  "ContentBlock",
  "Resource",
  "Evaluation",
  "EvaluationQuestion",
] as const;
type Entity = (typeof ENTITIES)[number];

const TABLE: Record<Entity, string> = {
  Program: "programs",
  Course: "courses",
  ProgramCourse: "program_courses",
  Module: "modules",
  Lesson: "lessons",
  ContentBlock: "content_blocks",
  Resource: "resources",
  Evaluation: "evaluations",
  EvaluationQuestion: "evaluation_questions",
};

// ---------- report ----------

const report = {
  startedAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  counts: {} as Record<string, { base44: number; fetched: number; written: number; supabase?: number }>,
  skipped: [] as { entity: string; legacy_id: string; reason: string }[],
  files: { planned: 0, copied: 0, alreadyThere: 0, failed: [] as { url: string; error: string }[] },
  videos: [] as { entity: string; legacy_id: string; title?: string; provider: string; url: string; saved?: string }[],
  externalEmbeds: [] as { entity: string; legacy_id: string; title?: string; host: string; url: string }[],
  leftoverLegacyUrls: [] as { table: string; legacy_id: string; url: string }[],
  notes: [] as string[],
};

// ---------- Base44 source ----------

async function b44(path: string) {
  const res = await fetch(`${B44_URL}/api/apps/${B44_APP}${path}`, {
    headers: { [B44_AUTH_HEADER]: env("BASE44_API_KEY") },
  });
  if (!res.ok) throw new Error(`Base44 ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function loadEntity(entity: Entity): Promise<{ items: Rec[]; total: number }> {
  if (FROM_DIR) {
    const file = join(FROM_DIR, `${entity}.json`);
    if (!existsSync(file)) throw new Error(`Missing export ${file}`);
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const items: Rec[] = Array.isArray(raw) ? raw : (raw.entities ?? raw.items);
    return { items, total: typeof raw.total === "number" ? raw.total : items.length };
  }
  const items: Rec[] = [];
  let cursor: string | null = null;
  do {
    const qs: string = cursor ? `cursor=${encodeURIComponent(cursor)}` : "limit=500&sort=created_date";
    const page = await b44(`/entities/${entity}/v2/list?${qs}`);
    items.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  const { count } = await b44(`/entities/${entity}/count`);
  return { items, total: count };
}

// ---------- files ----------

let supabase: SupabaseClient;
const existingMedia = new Set<string>();
const copies = new Map<string, Promise<string | null>>();
let active = 0;
const waiters: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function host(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isCopyable(url: string) {
  const h = host(url);
  if (!COPY_HOSTS.some((re) => re.test(h))) return false;
  // base44.app also serves the app itself; only its file endpoints are assets.
  return h !== "base44.app" || /\/api\/apps\/[^/]+\/files\//.test(url);
}

const pathOf = (url: string) => new URL(url).pathname;
const isVideo = (url: string) => VIDEO_EXT.test(pathOf(url)) || VIDEO_HOSTS.test(host(url));

function storagePath(url: string, ctx: Ctx) {
  const base = decodeURIComponent(pathOf(url).split("/").pop() || "file")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(-100);
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const folder = ctx.bucket === "course-media" ? ctx.courseId : ctx.folder;
  return `${folder}/${hash}_${base}`;
}

function replacement(ctx: Ctx, path: string) {
  return ctx.bucket === "public-assets"
    ? `${SUPABASE_URL}/storage/v1/object/public/public-assets/${path}`
    : `storage://course-media/${path}`;
}

function copyFile(url: string, ctx: Ctx): Promise<string | null> {
  const path = storagePath(url, ctx);
  const key = `${ctx.bucket}/${path}`;
  const cached = copies.get(key);
  if (cached) return cached;

  const job = (async () => {
    report.files.planned++;
    if (DRY_RUN) return replacement(ctx, path);
    if (existingMedia.has(key)) {
      report.files.alreadyThere++;
      return replacement(ctx, path);
    }
    return withSlot(async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`download ${res.status}`);
        const body = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        const { error } = await supabase.storage.from(ctx.bucket).upload(path, body, { contentType, upsert: true });
        if (error) throw error;
        const { error: rowError } = await supabase.from("media_files").upsert(
          {
            bucket: ctx.bucket,
            path,
            course_id: ctx.bucket === "course-media" ? ctx.courseId : null,
            module_id: ctx.bucket === "course-media" ? (ctx.moduleId ?? null) : null,
            mime_type: contentType,
            bytes: body.length,
            source_url: url,
          },
          { onConflict: "bucket,path" },
        );
        if (rowError) throw rowError;
        report.files.copied++;
        return replacement(ctx, path);
      } catch (e) {
        report.files.failed.push({ url, error: e instanceof Error ? e.message : String(e) });
        return null;
      }
    });
  })();
  copies.set(key, job);
  return job;
}

type Origin = { entity: Entity; legacy_id: string; title?: string };

async function saveVideo(url: string): Promise<string | undefined> {
  if (!VIDEO_DIR || DRY_RUN || !isCopyable(url)) return undefined;
  const file = join(VIDEO_DIR, decodeURIComponent(pathOf(url).split("/").pop() || "video"));
  if (existsSync(file)) return file;
  return withSlot(async () => {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    mkdirSync(VIDEO_DIR, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return file;
  });
}

const logged = new Set<string>();
/** Records each (record, url) once, even when the URL appears in several fields. */
function once(origin: Origin, url: string) {
  const key = `${origin.entity}:${origin.legacy_id}:${url}`;
  if (logged.has(key)) return false;
  logged.add(key);
  return true;
}

/** Rewrites every copyable URL inside a string; logs videos and foreign embeds. */
async function rewriteString(text: string, ctx: Ctx, origin: Origin): Promise<string> {
  // Longest first, so a URL that is a prefix of another is not replaced inside it.
  const urls = [...new Set(text.match(URL_RE) ?? [])].sort((a, b) => b.length - a.length);
  let out = text;
  for (const url of urls) {
    if (isVideo(url)) {
      const provider = isCopyable(url) ? "base44" : host(url);
      if (!ALLOWED_EMBED_HOSTS.test(host(url)) && once(origin, url)) {
        report.videos.push({ ...origin, provider, url, saved: await saveVideo(url) });
      }
      continue;
    }
    if (isCopyable(url)) {
      const next = await copyFile(url, ctx);
      if (next) out = out.split(url).join(next);
      continue;
    }
    if (origin.entity === "ContentBlock" && /\/embed|[?&]id=/.test(url) && !ALLOWED_EMBED_HOSTS.test(host(url)) && once(origin, url)) {
      report.externalEmbeds.push({ ...origin, host: host(url), url });
    }
  }
  return out;
}

async function rewrite<T>(value: T, ctx: Ctx, origin: Origin): Promise<T> {
  if (typeof value === "string") return (await rewriteString(value, ctx, origin)) as T;
  if (Array.isArray(value)) return (await Promise.all(value.map((v) => rewrite(v, ctx, origin)))) as T;
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [k, await rewrite(v, ctx, origin)] as const),
    );
    return Object.fromEntries(entries) as T;
  }
  return value;
}

// ---------- helpers ----------

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d);
const bool = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const status = (v: unknown) => (v === "published" ? "published" : "draft");

function parseJson(v: unknown): unknown {
  if (typeof v !== "string" || v.trim() === "") return v ?? null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function compact<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "")) as T;
}

const usedSlugs = new Set<string>();
function slugify(title: string) {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "item";
  let slug = base;
  for (let i = 2; usedSlugs.has(slug); i++) slug = `${base}-${i}`;
  usedSlugs.add(slug);
  return slug;
}

const ids: Record<string, Map<string, string>> = {};

/** Upserts on legacy_id and records legacy → uuid. In dry-run, invents uuids. */
async function upsert(entity: Entity, rows: Record<string, unknown>[]) {
  const table = TABLE[entity];
  const map = (ids[table] ??= new Map());
  if (DRY_RUN) {
    rows.forEach((r) => map.set(r.legacy_id as string, randomUUID()));
  } else {
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await supabase
        .from(table)
        .upsert(rows.slice(i, i + 200), { onConflict: "legacy_id" })
        .select("id, legacy_id");
      if (error) throw new Error(`${table}: ${error.message}${hint(table, error.message)}`);
      data!.forEach((r) => map.set(r.legacy_id, r.id));
    }
  }
  report.counts[entity].written = rows.length;
}

function hint(table: string, message: string) {
  if (table === "courses" && message.includes("courses_layout_check")) {
    return "\n  → Apply supabase/migrations/20261017230000_course_layouts.sql first (Base44 uses more orbit styles).";
  }
  return "";
}

function need(entity: Entity, rec: Rec, table: string, legacy: unknown, field: string) {
  const id = typeof legacy === "string" ? ids[table]?.get(legacy) : undefined;
  if (!id) report.skipped.push({ entity, legacy_id: rec.id, reason: `${field} ${String(legacy)} not found` });
  return id;
}

// ---------- main ----------

async function main() {
  console.log(`Base44 → Supabase ${DRY_RUN ? "(dry run)" : ""}${FROM_DIR ? ` from ${FROM_DIR}` : ""}`);
  if (!DRY_RUN) {
    supabase = createClient(SUPABASE_URL, env("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("media_files").select("bucket, path").range(from, from + 999);
      if (error) throw error;
      data.forEach((r) => existingMedia.add(`${r.bucket}/${r.path}`));
      if (data.length < 1000) break;
    }
  }

  const src = {} as Record<Entity, Rec[]>;
  for (const entity of ENTITIES) {
    const { items, total } = await loadEntity(entity);
    src[entity] = items.filter((r) => !r.is_sample);
    report.counts[entity] = { base44: total, fetched: items.length, written: 0 };
    console.log(`  read ${entity}: ${items.length}/${total}`);
  }
  const titleOf = (r: Rec) => str(r.title) ?? str(r.label) ?? undefined;
  const origin = (entity: Entity, r: Rec): Origin => ({ entity, legacy_id: r.id, title: titleOf(r) });

  // Programs and courses: catalog art is public.
  const catalogRows: Record<string, unknown>[] = [];
  for (const entity of ["Program", "Course"] as const) {
    const rows = await Promise.all(
      src[entity].map(async (r) => ({
        legacy_id: r.id,
        slug: slugify(String(r.title ?? r.id)),
        title: String(r.title ?? "Untitled"),
        description: str(r.description),
        accent_color: str(r.accent_color) ?? "#F5178C",
        cover_art_url: await rewrite(str(r.cover_art_url), { bucket: "public-assets", folder: "covers" }, origin(entity, r)),
        status: status(r.status),
        sort_order: num(r.order),
        ...(entity === "Course" ? { layout: str(r.orbit_style) ?? "standard" } : {}),
      })),
    );
    await upsert(entity, rows);
    catalogRows.push(...rows);
  }

  const pcRows = [];
  for (const r of src.ProgramCourse) {
    const program_id = need("ProgramCourse", r, "programs", r.program_id, "program_id");
    const course_id = need("ProgramCourse", r, "courses", r.course_id, "course_id");
    if (!program_id || !course_id) continue;
    pcRows.push({
      legacy_id: r.id,
      program_id,
      course_id,
      sort_order: num(r.order),
      is_launcher: bool(r.is_launcher),
      launcher_label: str(r.launcher_label),
      icon_url: await rewrite(str(r.icon_url), { bucket: "public-assets", folder: "icons" }, origin("ProgramCourse", r)),
    });
  }
  await upsert("ProgramCourse", pcRows);

  const moduleCourse = new Map<string, string>(); // module uuid → course uuid
  const modRows = [];
  for (const r of src.Module) {
    const course_id = need("Module", r, "courses", r.course_id, "course_id");
    if (!course_id) continue;
    modRows.push({
      legacy_id: r.id,
      course_id,
      title: String(r.title ?? "Untitled"),
      description: str(r.description),
      artwork_url: await rewrite(str(r.artwork_url), { bucket: "public-assets", folder: "modules" }, origin("Module", r)),
      kind: str(r.type) ?? "lesson_week",
      status: status(r.status),
      sort_order: num(r.order),
    });
  }
  await upsert("Module", modRows);
  for (const r of modRows) moduleCourse.set(ids.modules.get(r.legacy_id)!, r.course_id);

  const lessonRows = [];
  for (const r of src.Lesson) {
    const module_id = need("Lesson", r, "modules", r.module_id, "module_id");
    if (!module_id) continue;
    lessonRows.push({
      legacy_id: r.id,
      module_id,
      title: String(r.title ?? "Untitled"),
      lesson_type: str(r.lesson_type) ?? "text",
      icon: str(r.icon),
      accent_color: str(r.accent_color),
      xp_reward: num(r.xp_reward, 50),
      status: status(r.status),
      teacher_only: r.visibility === "teacher_only",
      sort_order: num(r.order),
    });
  }
  await upsert("Lesson", lessonRows);
  const lessonModule = new Map(lessonRows.map((r) => [ids.lessons.get(r.legacy_id)!, r.module_id]));

  const blockRows = [];
  for (const r of src.ContentBlock) {
    const lesson_id = need("ContentBlock", r, "lessons", r.lesson_id, "lesson_id");
    if (!lesson_id) continue;
    const moduleId = lessonModule.get(lesson_id)!;
    const ctx: Ctx = { bucket: "course-media", courseId: moduleCourse.get(moduleId)!, moduleId };
    const o = origin("ContentBlock", r);
    blockRows.push({
      legacy_id: r.id,
      lesson_id,
      block_type: String(r.block_type ?? "text"),
      title: str(r.title),
      body: await rewrite(str(r.content), ctx, o),
      data: await rewrite(
        compact({ settings: parseJson(r.settings), media_url: str(r.media_url), thumbnail_url: str(r.thumbnail_url) }),
        ctx,
        o,
      ),
      teacher_only: r.block_type === "teacher_only",
      sort_order: num(r.order),
    });
  }
  await upsert("ContentBlock", blockRows);

  const resRows = [];
  for (const r of src.Resource) {
    const module_id = need("Resource", r, "modules", r.module_id, "module_id");
    if (!module_id) continue;
    const ctx: Ctx = { bucket: "course-media", courseId: moduleCourse.get(module_id)!, moduleId: module_id };
    const o = origin("Resource", r);
    const fileUrl = str(r.file_url) ?? (r.resource_type !== "link" ? str(r.url) : null);
    const stored = fileUrl && isCopyable(fileUrl) && !isVideo(fileUrl) ? await rewrite(fileUrl, ctx, o) : null;
    const file_path = stored?.startsWith("storage://course-media/") ? stored.slice("storage://course-media/".length) : null;
    resRows.push({
      legacy_id: r.id,
      module_id,
      label: String(r.label ?? "Resource"),
      label_es: str(r.label_es),
      description: str(r.description),
      resource_type: ["pdf", "link", "file"].includes(String(r.resource_type)) ? r.resource_type : "file",
      file_path,
      // Keep a URL only when it is not the file we just copied.
      url: file_path && (str(r.url) === fileUrl || !str(r.url)) ? null : await rewrite(str(r.url), ctx, o),
      sort_order: num(r.order),
    });
  }
  await upsert("Resource", resRows);

  const evalRows = [];
  for (const r of src.Evaluation) {
    const module_id = r.module_id ? need("Evaluation", r, "modules", r.module_id, "module_id") : null;
    evalRows.push({
      legacy_id: r.id,
      module_id: module_id ?? null,
      title: String(r.title ?? "Evaluation"),
      language: r.language === "es" ? "es" : "en",
      bank_size: num(r.bank_size, 128),
      exam_question_count: num(r.exam_question_count, 20),
      pass_count: num(r.pass_count, 12),
      has_audio: bool(r.has_audio),
      large_text: bool(r.large_text),
      sort_order: num(r.order),
    });
  }
  await upsert("Evaluation", evalRows);
  // Second pass: evaluations that are subsets of another evaluation.
  // Base44 also uses tags here (e.g. "128_asterisked"); only real evaluation ids become FKs.
  for (const r of src.Evaluation.filter((e) => str(e.source_subset_of))) {
    const parent = ids.evaluations.get(String(r.source_subset_of));
    if (!parent) {
      report.notes.push(`Evaluation ${r.id}: source_subset_of "${r.source_subset_of}" is a tag, not an evaluation; left empty.`);
    } else if (!DRY_RUN) {
      const { error } = await supabase.from("evaluations").update({ source_subset_of: parent }).eq("legacy_id", r.id);
      if (error) throw error;
    }
  }
  const evalModule = new Map(evalRows.map((r) => [ids.evaluations.get(r.legacy_id)!, r.module_id]));

  const qRows = [];
  for (const r of src.EvaluationQuestion) {
    const evaluation_id = need("EvaluationQuestion", r, "evaluations", r.evaluation_id, "evaluation_id");
    if (!evaluation_id) continue;
    const moduleId = evalModule.get(evaluation_id) ?? undefined;
    const courseId = moduleId ? moduleCourse.get(moduleId) : undefined;
    const ctx: Ctx = courseId
      ? { bucket: "course-media", courseId, moduleId }
      : { bucket: "public-assets", folder: "evaluations" };
    qRows.push({
      legacy_id: r.id,
      evaluation_id,
      question_type: str(r.question_type),
      question_text: String(r.question_text ?? ""),
      answer_text: str(r.answer_text),
      explanation: str(r.explanation),
      is_asterisked: bool(r.is_asterisked),
      sort_order: num(r.order),
      data: await rewrite(
        compact({
          accepted_answers: str(r.accepted_answers),
          options: parseJson(r.options_json),
          correct: parseJson(r.correct_json),
          need_count: typeof r.need_count === "number" ? r.need_count : null,
          left: parseJson(r.left_json),
          right: parseJson(r.right_json),
          items: parseJson(r.items_json),
          buckets: parseJson(r.buckets_json),
          audio: parseJson(r.audio_json),
          audio_url: str(r.audio_url),
        }),
        ctx,
        origin("EvaluationQuestion", r),
      ),
    });
  }
  await upsert("EvaluationQuestion", qRows);

  // Anything still pointing at Base44/Kajabi (other than videos) is a failed copy.
  const written: [string, Record<string, unknown>[]][] = [
    ["programs/courses", catalogRows],
    ["content_blocks", blockRows],
    ["resources", resRows],
    ["evaluation_questions", qRows],
    ["modules", modRows],
    ["program_courses", pcRows],
  ];
  for (const [table, rows] of written) {
    for (const row of rows) {
      for (const url of JSON.stringify(row).match(URL_RE) ?? []) {
        if (isCopyable(url) && !isVideo(url)) {
          report.leftoverLegacyUrls.push({ table, legacy_id: row.legacy_id as string, url });
        }
      }
    }
  }

  if (!DRY_RUN) {
    for (const entity of ENTITIES) {
      const { count, error } = await supabase
        .from(TABLE[entity])
        .select("*", { count: "exact", head: true })
        .not("legacy_id", "is", null);
      if (error) throw error;
      report.counts[entity].supabase = count ?? 0;
    }
  }

  writeReport();
}

function writeReport() {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  const lines = [
    `# Base44 → Supabase migration ${report.dryRun ? "(dry run)" : ""}`,
    "",
    `Started ${report.startedAt}`,
    "",
    "## Record counts",
    "",
    "| Entity | Base44 | Read | Written | In Supabase | OK |",
    "| --- | ---: | ---: | ---: | ---: | :---: |",
    ...Object.entries(report.counts).map(([e, c]) => {
      const ok = c.supabase === undefined ? c.written === c.base44 : c.supabase === c.base44;
      return `| ${e} | ${c.base44} | ${c.fetched} | ${c.written} | ${c.supabase ?? "—"} | ${ok ? "✅" : "❌"} |`;
    }),
    "",
    "## Files",
    "",
    `- Unique files to copy: **${report.files.planned}**`,
    `- Copied this run: ${report.files.copied}`,
    `- Already in Storage: ${report.files.alreadyThere}`,
    `- Failed: ${report.files.failed.length}`,
    `- Legacy URLs left in migrated rows: ${report.leftoverLegacyUrls.length}`,
    ...report.files.failed.slice(0, 50).map((f) => `  - ${f.url} — ${f.error}`),
    "",
    `## Videos needing a host (${report.videos.length})`,
    "",
    "Not copied to Supabase, by rule. Public → YouTube, paid → Mux/Bunny.",
    "",
    "| Provider | Count |",
    "| --- | ---: |",
    ...Object.entries(countBy(report.videos, (v) => v.provider)).map(([p, n]) => `| ${p} | ${n} |`),
    "",
    `## External embeds that break the self-contained rule (${report.externalEmbeds.length})`,
    "",
    "| Host | Count |",
    "| --- | ---: |",
    ...Object.entries(countBy(report.externalEmbeds, (v) => v.host)).map(([h, n]) => `| ${h} | ${n} |`),
    "",
    `## Notes (${report.notes.length})`,
    "",
    ...report.notes.map((n) => `- ${n}`),
    "",
    `## Skipped records (${report.skipped.length})`,
    "",
    ...report.skipped.slice(0, 100).map((s) => `- ${s.entity} ${s.legacy_id}: ${s.reason}`),
    "",
    "Full lists (every video, embed and failure) are in `report.json`.",
  ];
  writeFileSync(join(OUT_DIR, "report.md"), lines.join("\n"));
  console.log(lines.slice(4, 18).join("\n"));
  console.log(`\nReport: ${join(OUT_DIR, "report.md")}`);
}

function countBy<T>(items: T[], key: (t: T) => string) {
  return items.reduce<Record<string, number>>((acc, i) => ((acc[key(i)] = (acc[key(i)] ?? 0) + 1), acc), {});
}

main().catch((e) => {
  console.error(e);
  try {
    writeReport();
  } catch {}
  process.exit(1);
});
