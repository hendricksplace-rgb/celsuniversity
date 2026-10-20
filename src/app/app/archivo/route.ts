import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";
import { parseStorageRef, signStorageRefs, storageRefName, SIGNED_URL_TTL_SECONDS } from "@/lib/storage";

// Opens or downloads a private file (/app/archivo?ref=storage://<bucket>/<path>[&dl=1]): signed on the server, at
// click time, with the viewer's own session, then a redirect. Links on a page never expire this way (a URL signed
// when the page loaded is dead after 10 minutes, and Storage answers 400).
// - course-media: `<courseId>/…`, with access to that course (signStorageRefs).
// - user-uploads, resumes, submissions: the viewer's own `<userId>/` folder (staff: any, Storage RLS decides).
const OWN_BUCKETS = new Set(["user-uploads", "resumes", "submissions"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname, search } = request.nextUrl;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) return NextResponse.redirect(`${origin}/entrar?next=${encodeURIComponent(pathname + search)}`);

  const ref = searchParams.get("ref") ?? "";
  const parsed = parseStorageRef(ref);
  if (!parsed) return new NextResponse("Not found", { status: 404 });
  const { bucket, path } = parsed;
  const download = searchParams.get("dl") === "1" ? storageRefName(ref) : null;

  let url: string | null = null;
  if (bucket === "course-media" || bucket === "public-assets") {
    const courseId = path.split("/")[0] ?? "";
    url = (await signStorageRefs(supabase, [ref], { courseId, viewer })).get(ref) ?? null;
    if (url && download) url = `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(download)}`;
  } else if (OWN_BUCKETS.has(bucket) && (viewer.isStaff || path.startsWith(`${viewer.user.id}/`))) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS, download ? { download } : undefined);
    url = data?.signedUrl ?? null;
  }
  if (!url) return new NextResponse("No disponible", { status: 404, headers: { "cache-control": "no-store" } });
  const res = NextResponse.redirect(url, 302);
  res.headers.set("cache-control", "no-store");
  return res;
}
