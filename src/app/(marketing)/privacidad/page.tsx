import { LegalPage } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Aviso de Privacidad · CelsU",
  description: "Cómo Latin American Media trata tus datos personales en CelsU: qué recabamos, para qué, con quién los compartimos y cómo ejercer tus derechos ARCO.",
  alternates: { canonical: "/privacidad" },
  openGraph: { title: "Aviso de Privacidad · CelsU", images: ["/site/celsu-logo.png"], locale: "es_MX" },
};

// Text: celsu-ayuda-privacidad.md (Cowork). It is a draft pending review by a Mexican data-protection
// lawyer; the legal name, address and date are filled in after that review.
const PROVIDERS = [
  ["Supabase", "Base de datos, cuentas y archivos"],
  ["Vercel", "Alojamiento de la app"],
  ["Resend", "Envío de correos"],
  ["Stripe", "Procesamiento de pagos"],
  ["OpenAI", "Transcripción de tu grabación de voz en la evaluación"],
  ["Anthropic", "Calificación de tu escritura y tu voz"],
];

export default function Privacidad() {
  return (
    <LegalPage title="Aviso de Privacidad Integral">
      <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-sm font-semibold text-[#6B4E00]">Versión preliminar · en revisión legal.</p>

      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        Latin American Media, en Aguascalientes, México (&quot;Latin American Media&quot;, &quot;CelsU&quot; o &quot;nosotros&quot;), es responsable del tratamiento
        de tus datos personales cuando usas la app y el sitio de CelsU (celstv.com y celsuniversity.vercel.app).
      </p>
      <p>
        Contacto de privacidad: <a href="mailto:hola@celstv.com">hola@celstv.com</a>
      </p>

      <h2>2. Qué datos recabamos</h2>
      <ul>
        <li>
          <strong>Identificación y contacto:</strong> nombre, correo electrónico y foto de perfil si inicias sesión con Google.
        </li>
        <li>
          <strong>Tu cuenta y tu aprendizaje:</strong> la contraseña, guardada cifrada (nunca la vemos); tu nivel de inglés y tus respuestas de la evaluación; el
          texto que escribes y la grabación de voz de la sección &quot;Hablar&quot;; tu avance, XP, racha y medallas; tus respuestas en los libros interactivos,
          incluido tu Plan de Acción, que solo tú puedes ver.
        </li>
        <li>
          <strong>Pago:</strong> nombre del titular, últimos 4 dígitos de la tarjeta, monto y fecha. <strong>No guardamos el número completo de tu tarjeta.</strong> Lo
          procesa Stripe.
        </li>
        <li>
          <strong>Uso técnico:</strong> tipo de dispositivo y navegador, y la fecha y hora de acceso. Esto se usa para que la app funcione y sea segura.
        </li>
      </ul>
      <p>No pedimos datos personales sensibles. Si en un ejercicio escribes algo personal, se usa solo para darte retroalimentación.</p>

      <h2>3. Para qué usamos tus datos</h2>
      <p>
        <strong>Finalidades necesarias</strong> (sin ellas no podemos darte el servicio):
      </p>
      <ol className="ml-5 list-decimal space-y-1">
        <li className="!list-decimal">Crear y administrar tu cuenta.</li>
        <li className="!list-decimal">Darte acceso a los programas que compraste y guardar tu avance.</li>
        <li className="!list-decimal">Calificar tu evaluación de inglés, incluida la revisión de tu escritura y tu voz con herramientas de inteligencia artificial.</li>
        <li className="!list-decimal">Procesar tus pagos y enviarte recibos.</li>
        <li className="!list-decimal">Enviarte correos necesarios: confirmación de cuenta, acceso y avisos del servicio.</li>
        <li className="!list-decimal">Atender tus dudas y solicitudes.</li>
      </ol>
      <p>
        <strong>Finalidades adicionales</strong> (puedes negarte y seguirás teniendo el servicio):
      </p>
      <ol className="ml-5 list-decimal space-y-1">
        <li className="!list-decimal">Enviarte recomendaciones y seguimiento después de tu evaluación.</li>
        <li className="!list-decimal">Enviarte novedades y promociones de CelsU.</li>
        <li className="!list-decimal">Mejorar nuestros cursos con estadísticas de uso.</li>
      </ol>
      <p>
        <strong>Cómo negarte a las finalidades adicionales:</strong> toca &quot;Darme de baja&quot; en cualquier correo, apágalas en{" "}
        <a href="/app/cuenta/preferencias">Cuenta → Preferencias</a>, o escribe a <a href="mailto:hola@celstv.com">hola@celstv.com</a>.
      </p>

      <h2>4. Con quién compartimos tus datos</h2>
      <p>Usamos proveedores que tratan tus datos por cuenta nuestra y solo para darte el servicio. Algunos están en Estados Unidos.</p>
      <div className="overflow-x-auto rounded-xl bg-white shadow-[0_0_0_1px_#ECEAF2]">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="text-[#0F0D1E]">
              <th className="px-4 py-2.5 font-extrabold">Proveedor</th>
              <th className="px-4 py-2.5 font-extrabold">Para qué</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map(([name, what]) => (
              <tr key={name} className="border-t border-[#F1EEF5]">
                <td className="px-4 py-2.5 font-bold text-[#0F0D1E]">{name}</td>
                <td className="px-4 py-2.5">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>No vendemos tus datos. Solo los compartiremos con autoridades cuando una ley lo exija.</p>

      <h2>5. Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
      <p>Tienes derecho a:</p>
      <ul>
        <li>
          <strong>Acceder</strong> a tus datos;
        </li>
        <li>
          <strong>Rectificarlos</strong> si son incorrectos;
        </li>
        <li>
          <strong>Cancelarlos</strong> (pedir que los borremos);
        </li>
        <li>
          <strong>Oponerte</strong> a su uso para ciertas finalidades;
        </li>
        <li>
          <strong>revocar tu consentimiento</strong>.
        </li>
      </ul>
      <p>
        <strong>Para ejercerlos</strong>, escribe a <a href="mailto:hola@celstv.com?subject=Derechos%20ARCO">hola@celstv.com</a> con el asunto &quot;Derechos ARCO&quot;
        e incluye:
      </p>
      <ul>
        <li>tu nombre y el correo de tu cuenta;</li>
        <li>qué derecho quieres ejercer y sobre qué datos;</li>
        <li>un documento que acredite tu identidad, o la de tu representante.</li>
      </ul>
      <p>Te responderemos en los plazos que marca la ley.</p>
      <p>
        También puedes borrar tu cuenta desde <a href="/app/cuenta/eliminar">Cuenta → Eliminar mi cuenta</a>.
      </p>

      <h2>6. Menores de edad</h2>
      <p>CelsU está pensado para personas mayores de 18 años. Si eres menor, tu madre, padre o tutor debe crear la cuenta o autorizarla.</p>

      <h2>7. Cookies y almacenamiento en tu dispositivo</h2>
      <p>La app guarda en tu dispositivo:</p>
      <ul>
        <li>tu sesión;</li>
        <li>tus preferencias;</li>
        <li>las descargas para estudiar sin internet.</li>
      </ul>
      <p>No usamos cookies de publicidad de terceros.</p>

      <h2>8. Cambios a este aviso</h2>
      <p>Si cambiamos este aviso, publicaremos la nueva versión en esta página con su fecha. Si el cambio es importante, también te avisaremos por correo.</p>

      <h2>9. Autoridad</h2>
      <p>Si crees que se violaron tus derechos, puedes acudir a la autoridad de protección de datos personales.</p>
    </LegalPage>
  );
}
