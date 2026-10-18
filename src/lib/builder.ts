// Course builder (/app/admin/cursos): the block types staff can add, and the data shape each one
// writes. The shapes are the ones the student components read (components/lesson/LessonBlock.tsx).

export type BuilderBlock = {
  id: string;
  block_type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  teacher_only: boolean;
  sort_order: number;
};

export type BlockPreset = {
  key: string;
  label: string;
  icon: string;
  /** What's stored in content_blocks.block_type. */
  type: string;
  data: Record<string, unknown>;
  body?: string;
  title?: string;
};

export const BLOCK_PRESETS: BlockPreset[] = [
  { key: "text", label: "Texto", icon: "📝", type: "text", data: {}, body: "" },
  { key: "video", label: "Video (YouTube, Vimeo o MP4)", icon: "🎬", type: "video", data: { media_url: "" } },
  { key: "audio", label: "Audio", icon: "🎧", type: "audio", data: { media_url: "" } },
  { key: "image", label: "Imagen", icon: "🖼️", type: "image", data: { media_url: "" } },
  { key: "embed", label: "Insertar (enlace)", icon: "🔗", type: "embed", data: { settings: { src: "", height: 600 } } },
  { key: "ebook", label: "Tarjeta de e-book", icon: "📖", type: "text", data: { ebook_slug: "", ebook_screen: "" }, title: "E-book" },
  {
    key: "quiz",
    label: "Quiz",
    icon: "❓",
    type: "quiz",
    data: { settings: [{ question: "", options: ["", ""], correct: 0, explanation: "" }] },
  },
  { key: "activity", label: "Actividad con respuesta", icon: "✍️", type: "text", data: { response_field: true }, body: "" },
];

/** Which form edits this block. */
export function formKind(b: Pick<BuilderBlock, "block_type" | "data">): string {
  if (typeof b.data.ebook_slug === "string") return "ebook";
  if (b.block_type === "text" && b.data.response_field === true) return "activity";
  if (["text", "video", "audio", "image", "embed", "quiz"].includes(b.block_type)) return b.block_type;
  return "json";
}

export const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_PRESETS.map((p) => [p.key, p.label]));
BLOCK_LABEL.json = "Otro (solo JSON)";

export type QuizQuestion = { question: string; options: string[]; correct: number; explanation?: string };

/** Course media files go in `<courseId>/builder/…` so students with access to the course can open them. */
export const MAX_UPLOAD_MB = 50;
export const mediaPath = (courseId: string, name: string) =>
  `${courseId}/builder/${crypto.randomUUID().slice(0, 8)}-${name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "archivo"}`;

export const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado" };
