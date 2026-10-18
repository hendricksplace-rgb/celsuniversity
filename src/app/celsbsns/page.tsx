import { BundleCard, C, CheckList, FAQ, FeatureList, PersonaBanner, PriceCard, SalesFooter, SectionTitle, StickyCTA, Testimonials, mxnRate } from "@/components/sales/Sales";

export const metadata = { title: "CelsBSNS · English for Business", description: "Inglés profesional en 10 semanas: reuniones, entrevistas y presentaciones." };

type Props = { searchParams: Promise<{ name?: string; level?: string; goal?: string }> };

const WEEKS = [
  "Professional Communication & Capstone Launch",
  "Business Etiquette & Workplace Culture",
  "Management and Leadership",
  "Human Resources & Hiring",
  "Organizational Structures & Roles",
  "Business Ethics & Conduct",
  "Finance for Non-Finance Professionals",
  "Marketing & Brand Communication",
  "Project Management & Productivity",
  "Interview Prep & Career Goals",
];

const FEATURES = [
  { icon: "🎤", title: "Entrevistas que convencen", desc: "Articula tus logros, responde preguntas difíciles y negocia con confianza: la semana 10 completa es Interview Prep.", bg: "rgba(91,141,239,.2)" },
  { icon: "📧", title: "Correos y juntas de nivel internacional", desc: "Escribe correos que obtienen respuestas y lidera reuniones con claridad.", bg: "rgba(255,197,49,.2)" },
  { icon: "📊", title: "Inglés financiero y estratégico", desc: "Habla de resultados, ROI y KPIs con precisión: Finance for Non-Finance Professionals.", bg: "rgba(109,192,103,.2)" },
  { icon: "📄", title: "Revisión de currículum con IA", desc: "Nuestra herramienta Resume Review evalúa tu currículum en 6 categorías y te lo devuelve reescrito al estilo U.S.", bg: "rgba(245,23,140,.2)" },
  { icon: "🎓", title: "Certificación de CelsUniversity", desc: "Certificado oficial al completar el programa.", bg: "rgba(53,195,240,.2)" },
];

const WHO = [
  <>
    <b>Profesionales en crecimiento</b>: ya trabajas y quieres ascender o roles con exposición internacional.
  </>,
  <>
    <b>Recién graduados</b>: necesitas diferenciarte en un mercado laboral competitivo.
  </>,
  <>
    <b>Emprendedores</b>: buscas clientes, socios o inversionistas internacionales.
  </>,
];

const TESTIMONIALS = [
  { quote: "Usé lo que aprendí para conseguir mi primer trabajo con una empresa estadounidense. Ahora trabajo remotamente para una startup en San Francisco.", who: "Daniel R., Desarrollador de Software" },
  { quote: "CelsBSNS me ayudó a escribir correos profesionales y hablar con seguridad en reuniones. Ahora lidero presentaciones con equipos globales.", who: "Sofía M., Gerente de Marketing" },
];

const FAQ_ITEMS = [
  { q: "¿Por qué se requiere B2?", a: "El programa se imparte en inglés profesional real: correos corporativos, casos de estudio y presentaciones auténticas. Con B2 lo aprovechas al máximo; con menos, te frustras. Por eso existe el paquete: CelsTV te lleva ahí." },
  { q: "¿Mi evaluación dijo B1: puedo entrar directo?", a: "Te recomendamos el paquete CelsTV + CelsBSNS por $150: avanzas con CelsTV y entras a CelsBSNS cuando estés listo. Además ahorras $48." },
  { q: "¿Funciona en el teléfono?", a: "Sí, todo CelsU está diseñado primero para tu teléfono." },
];

const INCLUDES = [
  "Programa completo de 10 semanas + Recursos Adicionales",
  "Video-lecciones, tareas y quizzes con retroalimentación",
  "Resume Review con IA incluido",
  "Certificación oficial de CelsUniversity",
  "Diseñado para nivel B2 en adelante",
];

export default async function CelsBSNSPage({ searchParams }: Props) {
  const p = await searchParams;
  const rate = await mxnRate();
  return (
    <div className="mx-auto max-w-2xl space-y-1">
      <PersonaBanner name={p.name} level={p.level} goal={p.goal} />
      <div className="pt-4">
        <span className="inline-block rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider" style={{ background: "rgba(91,141,239,.25)", color: C.blue }}>
          English for Business
        </span>
        <h1 className="mt-2.5 text-5xl font-extrabold leading-none text-white">
          Cels<span style={{ color: C.blue }}>BSNS</span>
        </h1>
        <p className="mt-2 text-lg font-extrabold leading-snug text-white">Construido para la nueva generación de profesionales. 💼</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#A9A4C0]">
          Comunícate con confianza en <b className="text-white">reuniones, entrevistas y presentaciones</b>. En 10 semanas, CelsBSNS convierte tu inglés en tu ventaja profesional.
        </p>
      </div>

      <SectionTitle>¿Para quién es CelsBSNS?</SectionTitle>
      <CheckList items={WHO} />
      <p className="mt-3 px-1 text-xs font-bold text-[#A9A4C0]">📌 Nivel requerido: B2 en adelante. ¿Aún no llegas? El paquete de abajo es tu ruta. ⬇️</p>

      <SectionTitle>Las 10 semanas del programa</SectionTitle>
      <div className="card mt-3">
        <ol>
          {WEEKS.map((w, i) => (
            <li key={w} className="relative border-b border-white/5 py-2.5 pl-10 text-[13.5px] font-bold leading-snug text-white last:border-0">
              <span className="absolute left-0 top-2.5 text-base font-extrabold" style={{ color: C.blue }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {w}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs font-bold text-[#A9A4C0]">Cada semana: video-lecciones de 15–20 min + tareas de lectura, escritura y expresión oral + quiz con retroalimentación.</p>
      </div>

      <SectionTitle>Lo que te llevas</SectionTitle>
      <FeatureList features={FEATURES} />
      <SectionTitle>Lo que dicen los estudiantes</SectionTitle>
      <Testimonials items={TESTIMONIALS} />
      <SectionTitle>Tu plan</SectionTitle>
      <PriceCard label="CelsBSNS · English for Business" amount={99} includes={INCLUDES} cta="Empezar con CelsBSNS: $99 →" color={C.blue} plan="celsbsns" rate={rate} />
      <BundleCard rate={rate} />
      <SectionTitle>Preguntas frecuentes</SectionTitle>
      <FAQ items={FAQ_ITEMS} />
      <SalesFooter product="celsbsns" />
      <StickyCTA label="Empezar con CelsBSNS: $99 →" color={C.blue} plan="celsbsns" />
    </div>
  );
}
