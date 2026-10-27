import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { collectStorageRefs, storageRefName, type SignedRefs } from "@/lib/storage";
import { fileHref } from "@/lib/file-href";
import { Activity } from "./activities/Activity";
import { ResponseBox } from "./ResponseBox";

export type Block = {
  id: string;
  block_type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  teacher_only: boolean;
};

type Props = {
  block: Block;
  signed: SignedRefs;
  t: Dictionary["lesson"];
  activityT: Dictionary["activity"];
  civicsT: Dictionary["civics"];
  isStaff: boolean;
  /** original PDF ref → slug of its interactive e-book, when the viewer can read one */
  readers?: Record<string, string>;
  /** e-book slug → title, for the cards that open the interactive e-book (data.ebook_slug) */
  books?: Record<string, string>;
  /** block id → the viewer's saved "Tu respuesta" (data.response_field) */
  answers?: Record<string, string>;
  readLabel?: string;
};

const LINK_RE = /(storage:\/\/[^\s"'<>)\]]+|https?:\/\/[^\s"'<>)\]]+)/g;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac)$/i;
// Interactive block types with their own players (activities/).
const ACTIVITY_TYPES = new Set(["flashcard", "grammar", "quiz", "celstv_quiz"]);

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
export const settingsOf = (b: Block) => (b.data.settings && typeof b.data.settings === "object" ? (b.data.settings as Record<string, unknown>) : {});

/** Public videos are the one thing allowed to live outside (YouTube). Returns a privacy-friendly embed URL. */
export function youtubeEmbed(url: string | null) {
  if (!url) return null;
  const m =
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  // enablejsapi: the lesson tracker listens for the player's progress (90 % watched counts as done).
  // playsinline keeps iPhone from forcing full screen; rel=0 shows only this channel's videos at the end.
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1` : null;
}

/**
 * Media still on Wistia plays straight from its delivery link until it moves (videos may live outside;
 * see README). Storage refs resolve through the signed map.
 */
export function directMedia(url: string | null, signed: SignedRefs) {
  if (!url) return null;
  if (/^https:\/\/embed-ssl\.wistia\.com\/deliveries\//.test(url)) return url;
  // A direct .mp4 link (a video hosted outside, e.g. Bunny or Mux) plays as a file.
  if (/^https:\/\/[^\s?#]+\.mp4(?:[?#]|$)/i.test(url)) return url;
  return url.startsWith("storage://") ? (signed.get(url) ?? null) : null;
}

/** Vimeo links ("vimeo.com/<id>" or "vimeo.com/<id>/<hash>" for unlisted videos) as a privacy-friendly embed. */
export function vimeoEmbed(url: string | null) {
  if (!url) return null;
  const m = /vimeo\.com\/(?:video\/)?(\d{6,})(?:\/([0-9a-f]{6,}))?/i.exec(url) ?? null;
  if (!m) return null;
  const h = m[2] ?? new URL(url, "https://vimeo.com").searchParams.get("h");
  return `https://player.vimeo.com/video/${m[1]}?dnt=1${h ? `&h=${h}` : ""}`;
}

/** YouTube or Vimeo embed URL for a video link, or null. */
export const videoEmbed = (url: string | null) => youtubeEmbed(url) ?? vimeoEmbed(url);

/** Only this block's signed URLs go to the browser. */
export function urlsFor(value: unknown, signed: SignedRefs) {
  const out: Record<string, string> = {};
  for (const ref of collectStorageRefs(value)) {
    const url = signed.get(ref);
    if (url) out[ref] = url;
  }
  return out;
}

/**
 * How a block counts toward finishing the lesson (see ./progress.tsx), or "none" when it renders
 * nothing for this viewer. Mirrors the branches of LessonBlock below.
 */
export function partKind(block: Block, isStaff: boolean): "none" | "seen" | "video" | "activity" {
  const type = block.block_type;
  const settings = settingsOf(block);
  if (type === "teacher_guide" || block.teacher_only) return isStaff && type !== "teacher_guide" ? "seen" : "none";
  if (block.data.response_field === true) return "activity";
  const ebook = str(block.data.ebook_pdf) ?? (type === "flipbook" ? str(settings.pdfUrl) : null);
  if (ebook) return type === "flipbook" && Array.isArray(settings.pages) && settings.pages.length > 0 ? "activity" : "seen";
  if (type === "video") {
    // A video with no file yet ("Video próximamente") is not something to finish.
    const src = str(block.data.media_url);
    return videoEmbed(src) || (src && (src.startsWith("storage://") || directMedia(src, new Map()))) ? "video" : "none";
  }
  if (type === "embed") return videoEmbed(str(settings.src) ?? str(block.body)) ? "video" : "seen";
  if (type === "evaluation") return /^[0-9a-f-]{36}$/i.test(str(block.data.evaluation_id) ?? "") ? "seen" : "none";
  if (ACTIVITY_TYPES.has(type)) {
    const data = block.data.settings;
    const empty = Array.isArray(data) ? !data.length : !data || typeof data !== "object";
    return empty ? "seen" : "activity";
  }
  if (["audio", "image", "file", "pdf", "download"].includes(type) || str(block.data.media_url)) return "seen";
  return !str(block.body) && !block.title ? "none" : "seen";
}

export function LessonBlock({ block, signed, t, activityT, civicsT, isStaff, readers, readLabel, books, answers }: Props) {
  const type = block.block_type;
  const media = str(block.data.media_url);
  const settings = settingsOf(block);

  // A card that opens the interactive e-book at this lesson's screen (when the viewer can read it).
  const bookSlug = str(block.data.ebook_slug);
  if (bookSlug && books?.[bookSlug]) {
    const screen = str(block.data.ebook_screen);
    return (
      <BlockCard title={block.title}>
        <Link
          href={`/app/libros/${bookSlug}${screen ? `?screen=${encodeURIComponent(screen)}` : ""}`}
          className="group flex items-center gap-4 rounded-[var(--t-radius)] border border-[var(--t-border)] p-3 transition hover:border-[var(--t-accent)]"
        >
          <span
            aria-hidden
            className="grid h-[104px] w-[78px] shrink-0 place-items-center rounded-md p-2 text-center text-[11px] font-extrabold leading-tight text-white shadow-md"
            style={{ background: "linear-gradient(160deg, var(--t-accent), #1B1830)" }}
          >
            {books[bookSlug]}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="t-heading block text-lg leading-snug">{books[bookSlug]}</strong>
            {screen && <span className="t-muted block text-sm">{t.ebookAt}</span>}
            <span className="t-btn mt-2 inline-flex">📖 {t.openEbook}</span>
          </span>
        </Link>
      </BlockCard>
    );
  }

  if (type === "teacher_guide") {
    if (!isStaff) return null;
    return (
      <BlockCard title={block.title ?? t.teacherGuide} badge={t.staffOnly}>
        <div
          className="t-prose"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.body ?? "", SANITIZE) }}
        />
      </BlockCard>
    );
  }

  // E-books: designrr embeds converted to PDFs, and CelsBook flipbooks.
  const ebook = str(block.data.ebook_pdf) ?? (type === "flipbook" ? str(settings.pdfUrl) : null);
  if (ebook) {
    const title = block.title ?? str(settings.title);
    // CelsBooks have page images: a page-by-page viewer instead of the inline PDF.
    const pages = type === "flipbook" && Array.isArray(settings.pages) && settings.pages.length > 0;
    return (
      <EbookBlock
        refUrl={ebook}
        title={title}
        signed={signed}
        t={t}
        reader={readers?.[ebook] ? { slug: readers[ebook], label: readLabel ?? "" } : undefined}
        viewer={
          pages ? (
            <Activity
              type="flipbook"
              settings={settings}
              urls={urlsFor(settings.pages, signed)}
              t={activityT}
              seed={block.id}
              title={title ?? ""}
            />
          ) : undefined
        }
      />
    );
  }

  if (type === "video") {
    const yt = videoEmbed(media);
    if (yt) return <YouTube src={yt} title={block.title} />;
    const poster = str(block.data.thumbnail_url);
    const file = directMedia(media, signed);
    if (file)
      return (
        <BlockCard title={block.title}>
          <video controls playsInline preload="metadata" src={file} poster={poster ? signed.get(poster) : undefined} className="aspect-video w-full rounded-[var(--t-radius)] bg-black" />
        </BlockCard>
      );
    return (
      <BlockCard title={block.title}>
        <Placeholder icon="🎬" text={t.videoSoon} poster={poster ? signed.get(poster) : undefined} />
      </BlockCard>
    );
  }

  if (type === "embed") {
    const src = str(settings.src) ?? str(block.body);
    const yt = videoEmbed(src);
    if (yt) return <YouTube src={yt} title={block.title} />;
    return (
      <BlockCard title={block.title}>
        <Placeholder icon="🔗" text={t.externalBlocked} />
      </BlockCard>
    );
  }

  if (type === "audio") {
    const url = directMedia(media, signed);
    return (
      <BlockCard title={block.title}>
        {url ? (
          <audio controls preload="none" src={url} className="w-full" />
        ) : (
          <Placeholder icon="🎧" text={t.audioSoon} />
        )}
        {str(block.body) && !/placeholder/i.test(block.body!) && <Linkified text={block.body!} signed={signed} t={t} />}
      </BlockCard>
    );
  }

  if (type === "image") {
    const url = media ? signed.get(media) : undefined;
    return (
      <BlockCard title={block.title}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs; next/image would cache them
          <img src={url} alt={block.title ?? ""} className="mx-auto max-h-[70vh] w-auto rounded-[var(--t-radius)]" />
        ) : (
          <Placeholder icon="🖼️" text={t.unavailable} />
        )}
      </BlockCard>
    );
  }

  // Generic file / PDF blocks.
  if (["file", "pdf", "download"].includes(type) || (media && !IMAGE_EXT.test(media) && !AUDIO_EXT.test(media) && media.startsWith("storage://"))) {
    return (
      <BlockCard title={block.title}>
        {media ? <FileLink refUrl={media} signed={signed} t={t} /> : <Placeholder icon="📄" text={t.unavailable} />}
      </BlockCard>
    );
  }

  // CelsUS 2025 civics exams: the exam itself runs on its own page.
  if (type === "evaluation") {
    const evaluationId = str(block.data.evaluation_id);
    if (!evaluationId || !/^[0-9a-f-]{36}$/i.test(evaluationId)) return null;
    return (
      <BlockCard title={block.title ?? civicsT.title}>
        <p className="t-muted text-sm">{civicsT.sub}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/examen-civico/${evaluationId}`} className="t-btn">
            {civicsT.blockCta} →
          </Link>
          <Link href="/app/examen-civico" className="t-btn-ghost">
            {civicsT.allExams}
          </Link>
        </div>
      </BlockCard>
    );
  }

  if (ACTIVITY_TYPES.has(type)) {
    const data = block.data.settings;
    const empty = Array.isArray(data) ? !data.length : !data || typeof data !== "object";
    const badge = type === "flashcard" ? activityT.flashcards : type === "grammar" ? activityT.grammar : activityT.quiz;
    const heading = block.title ?? (type === "grammar" ? str(settings.title) : null);
    return (
      <BlockCard title={heading} badge={badge}>
        {empty ? (
          <Placeholder icon="✏️" text={t.activitySoon} />
        ) : (
          <Activity type={type} settings={data} urls={urlsFor(data, signed)} t={activityT} seed={block.id} />
        )}
      </BlockCard>
    );
  }

  // text (and anything unknown): plain text with links; storage links become signed file links.
  // Activities (data.response_field) add the student's answer box.
  if (!str(block.body) && !block.title) return null;
  return (
    <BlockCard title={block.title}>
      {block.body && <Linkified text={block.body} signed={signed} t={t} />}
      {block.data.response_field === true && (
        <ResponseBox
          blockId={block.id}
          initial={answers?.[block.id] ?? ""}
          t={{ answer: t.answer, placeholder: t.answerPlaceholder, saving: t.answerSaving, saved: t.answerSaved, error: t.answerError }}
        />
      )}
    </BlockCard>
  );
}

function BlockCard({ title, badge, children }: { title?: string | null; badge?: string; children: React.ReactNode }) {
  return (
    <section className="t-card t-card-accent space-y-3">
      {(title || badge) && (
        <header className="flex flex-wrap items-center gap-2">
          {title && <h2 className="t-heading text-lg">{title}</h2>}
          {badge && <span className="t-badge">{badge}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

function Placeholder({ icon, text, poster }: { icon: string; text: string; poster?: string }) {
  return (
    <div
      className="relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--t-radius)] border border-dashed border-[var(--t-border)] bg-cover bg-center p-6 text-center"
      style={poster ? { backgroundImage: `url(${poster})` } : undefined}
    >
      {poster && <div className="absolute inset-0 bg-black/55" />}
      <span className="relative text-3xl" aria-hidden>
        {icon}
      </span>
      <p className={`relative text-sm ${poster ? "text-white" : "t-muted"}`}>{text}</p>
    </div>
  );
}

function YouTube({ src, title }: { src: string; title: string | null }) {
  return (
    <BlockCard title={title}>
      <div className="aspect-video w-full overflow-hidden rounded-[var(--t-radius)]">
        <iframe
          src={src}
          title={title ?? "YouTube"}
          className="h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </BlockCard>
  );
}

function EbookBlock({
  refUrl,
  title,
  signed,
  t,
  reader,
  viewer,
}: {
  refUrl: string;
  title: string | null;
  signed: SignedRefs;
  t: Props["t"];
  reader?: { slug: string; label: string };
  viewer?: React.ReactNode;
}) {
  const url = signed.get(refUrl);
  const name = storageRefName(refUrl);
  return (
    <BlockCard title={title ?? t.ebook}>
      {url ? (
        <>
          <div className="flex flex-wrap gap-2">
            {reader && (
              <Link href={`/app/libros/${reader.slug}`} className="t-btn">
                ✨ {reader.label}
              </Link>
            )}
            <a href={fileHref(refUrl)} target="_blank" rel="noopener" className={reader ? "t-btn-ghost" : "t-btn"}>
              📖 {t.openPdf}
            </a>
            <a href={fileHref(refUrl, true)} className="t-btn-ghost">
              {t.download}
            </a>
          </div>
          {viewer ?? (
            // Most phone browsers can't show a PDF inline; there the buttons above are the viewer.
            <iframe
              src={`${url}#view=FitH`}
              title={title ?? name}
              className="hidden h-[75vh] w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-white md:block"
            />
          )}
        </>
      ) : viewer ? (
        viewer
      ) : (
        <Placeholder icon="📕" text={t.unavailable} />
      )}
    </BlockCard>
  );
}

function FileLink({ refUrl, signed, t }: { refUrl: string; signed: SignedRefs; t: Props["t"] }) {
  const url = signed.get(refUrl);
  const name = storageRefName(refUrl);
  if (!url) return <span className="t-muted text-sm">📄 {name} · {t.unavailable}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a href={fileHref(refUrl)} target="_blank" rel="noopener" className="t-link">
        📄 {name}
      </a>
      <a href={fileHref(refUrl, true)} className="t-muted text-xs underline">
        {t.download}
      </a>
    </span>
  );
}

/** Plain-text bodies (most migrated text blocks): keep line breaks, turn URLs into links. */
function Linkified({ text, signed, t }: { text: string; signed: SignedRefs; t: Props["t"] }) {
  const parts = text.split(LINK_RE);
  return (
    <p className="whitespace-pre-line leading-relaxed">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith("storage://")) return <FileLink key={i} refUrl={part} signed={signed} t={t} />;
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="t-link break-all">
            {part}
          </a>
        );
      })}
    </p>
  );
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "h5", "p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li",
    "blockquote", "table", "thead", "tbody", "tr", "th", "td", "a", "span", "div", "code", "pre",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
  allowedSchemes: ["https", "mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
};
