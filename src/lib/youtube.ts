// YouTube links → privacy-friendly embeds. Shared by the lesson player (server) and the CelsGLOBAL step player
// (client), so it has no server-only imports.

const YT_RE = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;

/** The video id of a YouTube link (youtu.be, watch, embed, shorts), or null. */
export const youtubeId = (url: string | null | undefined) => (url ? (YT_RE.exec(url)?.[1] ?? null) : null);

/**
 * Public videos are the one thing allowed to live outside (YouTube). youtube-nocookie keeps the student out of
 * YouTube's tracking; enablejsapi lets the lesson tracker read progress (90 % watched counts as done); playsinline
 * keeps iPhone from forcing full screen; rel=0 shows only this channel's videos at the end.
 */
export function youtubeEmbed(url: string | null | undefined, opts: { autoplay?: boolean } = {}) {
  const id = youtubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1${opts.autoplay ? "&autoplay=1" : ""}`;
}
