"use client";

// CelsVideo: the episode on YouTube. Done at 90 % watched (or the button). Videos never download.
import { useCallback, useRef } from "react";
import { useYouTubeWatched } from "@/components/lesson/progress";
import { Empty, FinishButton, usePartShell } from "./PartShell";

export function VideoPart({ src, title, finishLabel }: { src: string | null; title: string; finishLabel: string }) {
  const { finish, t } = usePartShell();
  const ref = useRef<HTMLDivElement>(null);
  const onDone = useCallback(() => void finish(), [finish]);
  useYouTubeWatched(ref, !!src, onDone, "celsvideo");
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
