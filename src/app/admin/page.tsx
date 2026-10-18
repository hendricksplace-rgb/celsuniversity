import { redirect } from "next/navigation";

/** /admin is the short address; the admin area lives inside the student-area shell. */
export default function AdminRedirect() {
  redirect("/app/admin");
}
