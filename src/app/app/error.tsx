"use client";
// Student area: the error shows inside the app shell, so the navigation still works.
import { ErrorScreen } from "@/components/errors/ErrorScreen";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} home="/app" />;
}
