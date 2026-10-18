// Live preview in the lesson editor: the blocks as a student sees them, with the same components as
// the lesson page (LessonBlock). Teacher-only blocks are left out, as for students.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import { LessonBlock, partKind, type Block } from "@/components/lesson/LessonBlock";
import type { ThemeKey } from "@/lib/themes";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function PreviewBlocks({
  supabase,
  viewer,
  courseId,
  theme,
  blocks,
}: {
  supabase: Client;
  viewer: { user: { id: string }; isStaff: boolean };
  courseId: string;
  theme: ThemeKey;
  blocks: Block[];
}) {
  const { t } = await getDictionary();
  const visible = blocks.filter((b) => !b.teacher_only);
  const slugs = visible.map((b) => b.data?.ebook_slug).filter((v): v is string => typeof v === "string" && !!v);
  const [signed, { data: books }] = await Promise.all([
    signStorageRefs(supabase, collectStorageRefs(visible), { courseId, viewer, access: true }),
    slugs.length ? supabase.from("ebooks").select("slug, title").in("slug", slugs) : Promise.resolve({ data: [] as { slug: string; title: string }[] }),
  ]);
  const hidden = blocks.length - visible.length;
  const empty = visible.every((b) => partKind(b, false) === "none");
  return (
    <div data-theme={theme} className="t-panel space-y-5 rounded-2xl p-3 sm:p-4">
      {empty ? (
        <p className="t-card t-muted">{t.lesson.empty}</p>
      ) : (
        visible.map((block) => (
          <div key={block.id}>
            <LessonBlock
              block={block}
              signed={signed}
              t={t.lesson}
              activityT={t.activity}
              civicsT={t.civics}
              isStaff={false}
              books={Object.fromEntries((books ?? []).map((b) => [b.slug, b.title]))}
              answers={{}}
            />
          </div>
        ))
      )}
      {hidden > 0 && <p className="t-muted text-xs">{hidden === 1 ? "1 bloque solo para profesores no se muestra." : `${hidden} bloques solo para profesores no se muestran.`}</p>}
    </div>
  );
}
