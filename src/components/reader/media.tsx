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

/** Opens a stored file through /app/archivo, which signs it when the browser asks for it. */
export const fileRoute = (ref: string) => `/app/archivo?ref=${encodeURIComponent(ref)}`;

/**
 * A stored file for <audio> or <img>: the offline copy when it was downloaded, otherwise /app/archivo. The URLs
 * signed when the page loaded are dead after 10 minutes, so a page reached later in a long book would get a 400
 * from Storage (C-004). `signedUrl` only says the page may use the file (undefined → no player, no image).
 */
export function useFreshMedia(ref: string | null | undefined, signedUrl: string | undefined) {
  const src = useMediaSrc(signedUrl);
  if (!ref || !signedUrl) return undefined;
  return src?.startsWith("blob:") ? src : fileRoute(ref);
}

export function useSignedRef(ref: string | null | undefined) {
  const signed = useContext(SignedUrls);
  return useFreshMedia(ref, ref ? signed[ref] : undefined);
}
