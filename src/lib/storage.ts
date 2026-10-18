import "server-only";
import type { Client } from "@/lib/supabase/types";
import { canAccessCourse } from "@/lib/access";

/**
 * Course files are stored as `storage://<bucket>/<path>` references (see the Base44 migration).
 * They are turned into URLs here, on the server, only for viewers allowed to see them.
 */
export const STORAGE_REF_RE = /storage:\/\/([a-z0-9-]+)\/([^\s"'<>)\]]+)/g;

/** Signed URLs are short-lived; a lesson page re-signs on every load. */
export const SIGNED_URL_TTL_SECONDS = 600;

export type SignedRefs = Map<string, string>;

export function collectStorageRefs(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const m of value.matchAll(STORAGE_REF_RE)) out.add(m[0]);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStorageRefs(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectStorageRefs(v, out));
  }
  return out;
}

export function parseStorageRef(ref: string) {
  const m = /^storage:\/\/([a-z0-9-]+)\/(.+)$/.exec(ref);
  return m ? { bucket: m[1], path: m[2] } : null;
}

/** File name for display: drops the `<hash>_` prefixes the migration added. */
export function storageRefName(ref: string) {
  const name = decodeURIComponent(ref.split("/").pop() ?? "archivo");
  return name.replace(/^([0-9a-f]{9,10}_)+/, "");
}

/**
 * Resolves refs for one course. Anything the viewer may not read is left out of the map,
 * so callers render it as unavailable.
 * - public-assets: public URL, no check.
 * - course-media: path must be inside `<courseId>/` and the viewer must have course access.
 * - user-uploads: only the viewer's own `<userId>/` folder.
 */
export async function signStorageRefs(
  supabase: Client,
  refs: Iterable<string>,
  opts: { courseId: string; viewer: { user: { id: string }; isStaff: boolean } | null; access?: boolean },
): Promise<SignedRefs> {
  const out: SignedRefs = new Map();
  const toSign = new Map<string, string[]>(); // bucket → paths
  const refOf = new Map<string, string>(); // `${bucket}/${path}` → ref
  let access = opts.access;

  for (const ref of refs) {
    const parsed = parseStorageRef(ref);
    if (!parsed) continue;
    const { bucket, path } = parsed;
    if (bucket === "public-assets") {
      out.set(ref, supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      continue;
    }
    if (bucket === "course-media") {
      if (!path.startsWith(`${opts.courseId}/`)) continue;
      access ??= await canAccessCourse(supabase, opts.viewer, opts.courseId);
      if (!access) continue;
    } else if (bucket === "user-uploads") {
      if (!opts.viewer || !path.startsWith(`${opts.viewer.user.id}/`)) continue;
    } else {
      continue;
    }
    toSign.set(bucket, [...(toSign.get(bucket) ?? []), path]);
    refOf.set(`${bucket}/${path}`, ref);
  }

  for (const [bucket, paths] of toSign) {
    // Signed with the viewer's own session: Storage RLS checks access a second time.
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) continue;
    for (const item of data) {
      if (item.signedUrl && item.path) out.set(refOf.get(`${bucket}/${item.path}`)!, item.signedUrl);
    }
  }
  return out;
}
