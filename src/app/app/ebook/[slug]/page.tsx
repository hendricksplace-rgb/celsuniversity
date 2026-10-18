import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ screen?: string }> };

/** /app/ebook/<slug>?screen=… (the name used in Cowork's specs) is the reader at /app/libros/<slug>. */
export default async function EbookAlias({ params, searchParams }: Props) {
  const { slug } = await params;
  const { screen } = await searchParams;
  redirect(`/app/libros/${encodeURIComponent(slug)}${screen ? `?screen=${encodeURIComponent(screen)}` : ""}`);
}
