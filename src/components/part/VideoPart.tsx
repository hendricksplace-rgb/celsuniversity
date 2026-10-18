"use client";

// CelsVideo: the episode on YouTube (or a video file not moved yet). Done at 90 % watched, at the end
// of a file, or with the button. Videos never download.
import { useCallback, useRef } from "react";
import { useYouTubeWatched } from "@/components/lesson/progress";
import { Empty, FinishButton, usePartShell } from "./PartShell";

export function VideoPart({ src, file, title, finishLabel }: { src: string | null; file?: string | null; title: string; finishLabel: string }) {
  const { finish, t } = usePartShell();
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
  if (!src)
    return (
      <>
        <Empty text={t.videoSoon} />
        <FinishButton label={finishLabel} />
      </>
    );
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div ref={ref} className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
        <iframe src={src} title={title} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
      <FinishButton label={finishLabel} />
    </div>
  );
}
