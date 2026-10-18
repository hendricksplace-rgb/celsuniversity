import { C, CheckList, FAQ, FeatureList, PersonaBanner, PriceCard, SalesFooter, SectionTitle, StickyCTA, Testimonials, mxnRate } from "@/components/sales/Sales";

export const metadata = { title: "CelsTV · English For Our Generation", description: "32 episodios cinematográficos para aprender inglés como realmente lo hablamos." };

type Props = { searchParams: Promise<{ name?: string; level?: string; goal?: string }> };

const EPS = [
  { n: "01", t: "Introductions", bg: "linear-gradient(160deg,#F5178C,#8f0d55)" },
  { n: "06", t: "Let's Eat", bg: "linear-gradient(160deg,#5B8DEF,#2b4a9e)" },
  { n: "10", t: "Let's Go Shopping", bg: "linear-gradient(160deg,#35C3F0,#146a8a)" },
  { n: "14", t: "Road Trip", bg: "linear-gradient(160deg,#6DC067,#2f6b2b)" },
  { n: "12", t: "Music and Me", bg: "linear-gradient(160deg,#FFC531,#9e7208)", dark: true },
  { n: "15", t: "Goals and Dreams", bg: "linear-gradient(160deg,#8b5cf6,#4c2a8f)" },
];

const FEATURES = [
  { icon: "🎬", title: "CelsVideo", desc: "El episodio central: situaciones reales, inglés auténtico de hoy, nada de frases anticuadas.", bg: "rgba(245,23,140,.2)" },
  { icon: "🃏", title: "CelsCards", desc: "El vocabulario del episodio en tarjetas interactivas que se adaptan a ti.", bg: "rgba(91,141,239,.2)" },
  { icon: "🔊", title: "Funics + CelsAudio", desc: "Nuestro método fonético único: mejora tu pronunciación y ritmo, y entrena tu oído.", bg: "rgba(53,195,240,.2)" },
  { icon: "🧠", title: "Cuestionarios y práctica", desc: "Gramática y vocabulario interactivos que refuerzan lo que acabas de ver.", bg: "rgba(109,192,103,.2)" },
  { icon: "🏆", title: "XP, rachas e insignias", desc: "Cada episodio suma puntos. Tu racha te espera mañana.", bg: "rgba(255,197,49,.2)" },
];

const WHO = [
  <>Quieres <b>conversar con confianza</b>: trabajo, viajes, amigos, redes.</>,
  <>Estás empezando o llevas años &ldquo;atorado&rdquo; en el mismo nivel.</>,
  <>Los cursos tradicionales te aburren: aprendes mejor con <b>historias y video</b>.</>,
  <>Tienes 15 minutos al día y un teléfono. Es todo lo que necesitas.</>,
];

const TESTIMONIALS = [
  { quote: "Es como ver YouTube, pero estoy aprendiendo inglés real. Nunca pensé que aprender un idioma pudiera ser tan adictivo.", who: "Ana G., Ciudad de México" },
  { quote: "Finalmente entiendo lo que la gente quiere decir cuando habla rápido. CelsTV me entrenó para escuchar inglés natural, no solo inglés de libro de texto.", who: "Luis P., Bogotá" },
];

const FAQ_ITEMS = [
  { q: "¿Necesito un nivel mínimo?", a: "No. La evaluación gratuita te coloca en el episodio correcto para tu nivel, desde principiante total." },
  { q: "¿Puedo verlo en mi teléfono?", a: "Sí: CelsTV está diseñado primero para tu teléfono. También funciona en tablet y computadora." },
  { q: "¿Y si quiero inglés para mi trabajo?", a: "Mira CelsBSNS, nuestro programa de inglés profesional de 10 semanas, o el paquete CelsTV + CelsBSNS con los dos juntos por $150 USD." },
];

const INCLUDES = [
  "32 episodios cinematográficos completos",
  "CelsVideo, CelsCards, Funics y CelsAudio",
  "Práctica interactiva de gramática y vocabulario",
  "XP, rachas, insignias y evaluaciones de avance",
  "Empiezas exactamente en tu nivel (según tu evaluación)",
  "100% en tu teléfono, a tu ritmo",
];

export default async function CelsTVPage({ searchParams }: Props) {
  const p = await searchParams;
  const rate = await mxnRate();
  return (
    <div className="mx-auto max-w-2xl space-y-1">
      <PersonaBanner name={p.name} level={p.level} goal={p.goal} />
      <div className="pt-4">
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#A9A4C0]">English For Our Generation</span>
        <h1 className="mt-2.5 text-5xl font-extrabold leading-none text-white">
          Cels<span style={{ color: C.pink }}>TV</span>
        </h1>
        <p className="mt-2 text-lg font-extrabold leading-snug text-white">Aprende inglés como realmente lo hablamos. 🎬</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#A9A4C0]">
          32 episodios cinematográficos con historias, cultura, música y diversión. No enseñamos con libros de texto aburridos: <b className="text-white">enseñamos a través de experiencias.</b>
        </p>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 py-4">
        {EPS.map((ep) => (
          <div key={ep.n} className="relative flex h-[180px] w-[132px] shrink-0 flex-col justify-end overflow-hidden rounded-2xl p-3" style={{ background: ep.bg, color: ep.dark ? "#241335" : "#fff" }}>
            <span className="absolute left-3 top-2 text-3xl font-extrabold opacity-35">{ep.n}</span>
            <span className="text-[13px] font-extrabold leading-tight">{ep.t}</span>
            <span className="text-[11px] font-bold opacity-75">Episodio {Number(ep.n)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["7K+", "Estudiantes activos", C.pink],
          ["4.8/5", "Calificación promedio", C.yellow],
          ["32", "Episodios completos", C.cyan],
        ].map(([v, l, c]) => (
          <div key={l} className="card !p-3.5 text-center">
            <b className="block text-xl" style={{ color: c }}>
              {v}
            </b>
            <span className="text-[11px] font-extrabold text-[#A9A4C0]">{l}</span>
          </div>
        ))}
      </div>

      <SectionTitle>El método OEM</SectionTitle>
      <div className="card mt-3">
        <p className="text-[13.5px] font-bold leading-relaxed text-[#A9A4C0]">No es memorización mecánica: es aprendizaje natural, como aprendiste tu primer idioma.</p>
        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          {[
            ["👀", "Observa", "Lecciones cortas y cinematográficas, como tu serie favorita."],
            ["🎮", "Participa", "Quizzes, juegos y retos que se sienten como diversión."],
            ["🗣️", "Domina", "Habla y responde en conversaciones reales, y lo recuerdas."],
          ].map(([e, h, d]) => (
            <div key={h} className="rounded-2xl bg-white/10 p-3.5 text-center">
              <span className="text-xl">{e}</span>
              <b className="block text-sm text-white">{h}</b>
              <p className="mt-1 text-[11.5px] font-bold leading-snug text-[#A9A4C0]">{d}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>¿Para quién es CelsTV?</SectionTitle>
      <CheckList items={WHO} />
      <SectionTitle>Cada episodio es una órbita completa</SectionTitle>
      <FeatureList features={FEATURES} />
      <SectionTitle>Lo que dicen los estudiantes</SectionTitle>
      <Testimonials items={TESTIMONIALS} />
      <SectionTitle>Tu plan</SectionTitle>
      <PriceCard label="CelsTV · English For Our Generation" amount={99} includes={INCLUDES} cta="Empezar con CelsTV: $99 →" color={C.pink} plan="celstv" rate={rate}>
        <p className="mt-2.5 text-center text-xs font-bold text-[#A9A4C0]">💡 ¿Tu meta es profesional? Mira el paquete CelsTV + CelsBSNS por $150 y ahorra $48.</p>
      </PriceCard>
      <SectionTitle>Preguntas frecuentes</SectionTitle>
      <FAQ items={FAQ_ITEMS} />
      <SalesFooter product="celstv" />
      <StickyCTA label="Empezar con CelsTV: $99 →" color={C.pink} plan="celstv" />
    </div>
  );
}
