import { redirect } from "next/navigation";

/** /admin/cursos is the short address of the course builder. */
export default function CoursesRedirect() {
  redirect("/app/admin/cursos");
}
