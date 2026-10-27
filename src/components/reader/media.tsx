"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cachedMediaUrl } from "@/lib/offline";
import { reportError } from "@/lib/report-error";

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

/**
 * A stored picture that keeps working however long the page stays open (C-009): the offline copy when saved,
 * otherwise /app/archivo (signed on request). One retry on error; then `fallback` shows and the failure is logged.
 * `signedUrl` only says the page may use the file and is the offline cache key.
 */
export function FreshImg({
  storageRef,
  signedUrl,
  alt,
  className,
  fallback = null,
  onLoad,
}: {
  storageRef: string | null | undefined;
  signedUrl: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
}) {
  const src = useFreshMedia(storageRef, signedUrl ?? undefined);
  const [tries, setTries] = useState(0);
  if (!src || tries > 1) return <>{fallback}</>;
  const url = tries && !src.startsWith("blob:") ? `${src}&retry=${tries}` : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private storage file, signed on request
    <img
      key={url}
      src={url}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={() => {
        if (tries === 1) reportError(`Image did not load: ${storageRef}`);
        setTries((n) => n + 1);
      }}
    />
  );
}
