"use client";
// Public pages and anything outside the student area.
import { ErrorScreen } from "@/components/errors/ErrorScreen";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] bg-white">
      <ErrorScreen error={error} reset={reset} home="/" />
    </main>
  );
}
