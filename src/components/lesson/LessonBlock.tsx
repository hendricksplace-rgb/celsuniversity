import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { storageRefName, type SignedRefs } from "@/lib/storage";

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
  isStaff: boolean;
  /** original PDF ref → slug of its interactive e-book, when the viewer can read one */
  readers?: Record<string, string>;
  readLabel?: string;
};

const LINK_RE = /(storage:\/\/[^\s"'<>)\]]+|https?:\/\/[^\s"'<>)\]]+)/g;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac)$/i;
// Interactive block types that get their own players later.
const ACTIVITY_TYPES = new Set(["flashcard", "grammar", "quiz", "celstv_quiz"]);

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const settingsOf = (b: Block) => (b.data.settings && typeof b.data.settings === "object" ? (b.data.settings as Record<string, unknown>) : {});

/** Public videos are the one thing allowed to live outside (YouTube). Returns a privacy-friendly embed URL. */
function youtubeEmbed(url: string | null) {
  if (!url) return null;
  const m =
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function withDownload(url: string, name: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
}

export function LessonBlock({ block, signed, t, isStaff, readers, readLabel }: Props) {
  const type = block.block_type;
  const media = str(block.data.media_url);
  const settings = settingsOf(block);

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
  if (ebook)
    return (
      <EbookBlock
        refUrl={ebook}
        title={block.title ?? str(settings.title)}
        signed={signed}
        t={t}
        reader={readers?.[ebook] ? { slug: readers[ebook], label: readLabel ?? "" } : undefined}
      />
    );

  if (type === "video") {
    const yt = youtubeEmbed(media);
    if (yt) return <YouTube src={yt} title={block.title} />;
    const poster = str(block.data.thumbnail_url);
    return (
      <BlockCard title={block.title}>
        <Placeholder icon="🎬" text={t.videoSoon} poster={poster ? signed.get(poster) : undefined} />
      </BlockCard>
    );
  }

  if (type === "embed") {
    const src = str(settings.src) ?? str(block.body);
    const yt = youtubeEmbed(src);
    if (yt) return <YouTube src={yt} title={block.title} />;
    return (
      <BlockCard title={block.title}>
        <Placeholder icon="🔗" text={t.externalBlocked} />
      </BlockCard>
    );
  }

  if (type === "audio") {
    const url = media ? signed.get(media) : undefined;
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

  if (ACTIVITY_TYPES.has(type)) {
    return (
      <BlockCard title={block.title}>
        <Placeholder icon="✏️" text={t.activitySoon} />
      </BlockCard>
    );
  }

  // text (and anything unknown): plain text with links; storage links become signed file links.
  if (!str(block.body) && !block.title) return null;
  return (
    <BlockCard title={block.title}>{block.body && <Linkified text={block.body} signed={signed} t={t} />}</BlockCard>
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
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
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
}: {
  refUrl: string;
  title: string | null;
  signed: SignedRefs;
  t: Props["t"];
  reader?: { slug: string; label: string };
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
            <a href={url} target="_blank" rel="noopener" className={reader ? "t-btn-ghost" : "t-btn"}>
              📖 {t.openPdf}
            </a>
            <a href={withDownload(url, name)} className="t-btn-ghost">
              {t.download}
            </a>
          </div>
          {/* Most phone browsers can't show a PDF inline; there the buttons above are the viewer. */}
          <iframe
            src={`${url}#view=FitH`}
            title={title ?? name}
            className="hidden h-[75vh] w-full rounded-[var(--t-radius)] border border-[var(--t-border)] bg-white md:block"
          />
        </>
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
      <a href={url} target="_blank" rel="noopener" className="t-link">
        📄 {name}
      </a>
      <a href={withDownload(url, name)} className="t-muted text-xs underline">
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
