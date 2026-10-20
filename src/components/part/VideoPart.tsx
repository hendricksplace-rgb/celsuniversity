"use client";

// CelsVideo: the episode on YouTube or Vimeo (or a video file not moved yet). Done at 90 % watched, at the end
// of a file, or with the button. Videos never download.
import { useCallback, useRef } from "react";
import { useYouTubeWatched } from "@/components/lesson/progress";
import Link from "next/link";
import { FinishButton, usePartShell } from "./PartShell";

export function VideoPart({ src, file, title, finishLabel }: { src: string | null; file?: string | null; title: string; finishLabel: string }) {
  const { finish, t, episodeHref } = usePartShell();
  const ref = useRef<HTMLDivElement>(null);
  const onDone = useCallback(() => void finish(), [finish]);
  useYouTubeWatched(ref, !!src, onDone, "celsvideo");
  if (!src && file)
    return (
      <div className="mt-4 flex flex-1 flex-col">
        <video controls playsInline preload="metadata" src={file} title={title} onEnded={onDone} className="aspect-video w-full rounded-3xl bg-black shadow-2xl" />
        <FinishButton label={finishLabel} />
      </div>
    );
  // No video yet: nothing to watch, so nothing to finish (the part isn't recorded and doesn't count).
  if (!src)
    return (
      <>
        <div className="my-auto rounded-3xl bg-white/[.07] p-6 text-center text-white/85" role="status">
          <p className="text-3xl" aria-hidden>
            🎬
          </p>
          <p className="mt-2 text-lg font-extrabold text-white">{t.videoSoonTitle}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">{t.videoSoon}</p>
        </div>
        <Link
          href={episodeHref}
          className="kit-focus-light mt-6 block w-full rounded-2xl bg-white/15 px-5 py-3.5 text-center text-base font-extrabold text-white transition hover:bg-white/25"
        >
          {t.back}
        </Link>
      </>
    );
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div ref={ref} className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
        <iframe src={src} title={title} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture" allowFullScreen />
      </div>
      <FinishButton label={finishLabel} />
    </div>
  );
}
