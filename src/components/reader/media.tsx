"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cachedMediaUrl } from "@/lib/offline";

/** storage:// ref → signed URL, for every audio file the book uses. */
export const SignedUrls = createContext<Record<string, string>>({});

/** Plays from the offline cache when the file was downloaded, otherwise from the signed URL. */
export function useMediaSrc(url: string | undefined) {
  const [src, setSrc] = useState(url);
  useEffect(() => {
    setSrc(url);
    if (!url) return;
    let blobUrl: string | null = null;
    let live = true;
    cachedMediaUrl(url).then((b) => {
      blobUrl = b;
      if (b && live) setSrc(b);
    });
    return () => {
      live = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);
  return src;
}

export function useSignedRef(ref: string | null | undefined) {
  const signed = useContext(SignedUrls);
  return useMediaSrc(ref ? signed[ref] : undefined);
}
