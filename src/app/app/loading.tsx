// Shown inside the app shell while a student page loads (course data comes from the database on each visit).
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="h-9 w-2/3 max-w-sm animate-pulse rounded-xl bg-[#ECE7F2] motion-reduce:animate-none" />
      <div aria-hidden className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-3xl bg-white p-4 shadow-[0_0_0_1px_#EFE6F2]">
            <div className="aspect-video animate-pulse rounded-2xl bg-[#F1EDF5] motion-reduce:animate-none" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#F1EDF5] motion-reduce:animate-none" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#F1EDF5] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
