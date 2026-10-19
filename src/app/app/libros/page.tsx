import { redirect } from "next/navigation";

/** The bookshelf lives on Mis cursos ("Mis libros" filter); /app/libros only had /app/libros/[slug]. */
export default function LibrosIndex() {
  redirect("/app/cursos?f=books");
}
