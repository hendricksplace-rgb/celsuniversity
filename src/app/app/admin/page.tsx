import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";

export const metadata = { title: "Admin · CelsU" };

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

export default async function AdminHome() {
  const viewer = (await getViewer(await createClient()))!;
  if (!isAdminRole(viewer.role)) notFound();
  const links = [
    { href: "/app/admin/equipo", title: "Equipo y roles", text: viewer.role === "super_admin" ? "Quién es administrador, profesor o estudiante. Tú cambias los roles." : "Quién es administrador, profesor o estudiante." },
    { href: "/app/admin/estudiantes", title: "Estudiantes", text: "Busca a un estudiante y dale acceso a su programa (los estudiantes actuales se registran solos)." },
    { href: "/app/admin/cursos", title: "Cursos", text: "Constructor de cursos: módulos, lecciones y bloques, con vista previa e historial." },
    { href: "/app/admin/libros", title: "Libros", text: "Revisa y publica los libros interactivos." },
    { href: "/app/admin/salud", title: "Salud del contenido", text: "Lecciones vacías, videos en Wistia o faltantes, episodios sin imagen, quizzes sin audio, e-books sin publicar." },
    { href: "/app/admin/errores", title: "Errores", text: "Lo que falló en la app y en el servidor en los últimos 7 días, agrupado por mensaje." },
    { href: "/app/admin/bajas", title: "Solicitudes de eliminación", text: "Quién pidió borrar su cuenta y cuándo se completó (ARCO)." },
    { href: "/app/admin/entregas", title: "Entregas por revisar", text: "Las tareas de CelsBSNS que los estudiantes entregaron a su coach." },
    { href: "/app/clases", title: "Clases", text: "Las clases y sus tareas asignadas." },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Admin</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={`block h-full rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 motion-reduce:transition-none ${focus}`}>
              <h2 className="text-lg font-extrabold">{l.title}</h2>
              <p className="mt-1 text-sm font-semibold text-[#6B6680]">{l.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
