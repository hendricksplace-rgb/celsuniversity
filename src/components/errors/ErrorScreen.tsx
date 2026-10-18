"use client";
// The friendly screen the error boundaries show: the error is reported once, and the student can try again.
import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export function ErrorScreen({ error, reset, home = "/app" }: { error: Error & { digest?: string }; reset: () => void; home?: string }) {
  useEffect(() => {
    reportError(error.digest ? Object.assign(new Error(`${error.message} (digest ${error.digest})`), { stack: error.stack }) : error, "boundary");
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-[#FFE3F0] text-3xl">
        😕
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-[#1B1830]">Algo salió mal.</h1>
      <p className="mt-2 font-semibold text-[#5E5A73]">Ya nos avisaron y lo vamos a revisar. Puedes volver a intentarlo.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#D6006A] px-6 py-3 font-extrabold text-white transition hover:bg-[#B0005A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6006A]"
        >
          Volver a intentar
        </button>
        <Link href={home} className="rounded-full px-6 py-3 font-extrabold text-[#1B1830] ring-1 ring-[#E4DEEA] transition hover:bg-[#F7F5FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6006A]">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
