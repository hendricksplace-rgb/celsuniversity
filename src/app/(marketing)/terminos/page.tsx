import { LegalPage } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Términos de uso · CelsU",
  description: "Quién opera CelsU, cómo funcionan las compras y el acceso a los programas, y las reglas de tu cuenta.",
  alternates: { canonical: "/terminos" },
  openGraph: { title: "Términos de uso · CelsU", images: ["/site/celsu-logo.png"], locale: "es_MX" },
};

// Short version with only what is already true of the service. The full terms come from Cowork / legal.
export default function Terminos() {
  return (
    <LegalPage title="Términos de uso">
      <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-sm font-semibold text-[#6B4E00]">Estamos preparando el texto completo de los términos. Mientras tanto, esto es lo esencial.</p>

      <h2>Quién opera CelsU</h2>
      <p>CelsU (CelsUniversity) es un producto de Latin American Media, con sede en Aguascalientes, México.</p>
      <p>
        Contacto: <a href="mailto:hola@celstv.com">hola@celstv.com</a> · <a href="https://wa.link/n5kdfs">WhatsApp 449 497 5359</a> (lunes a viernes, 9:00–18:00, hora del
        centro de México).
      </p>

      <h2>Compras y acceso</h2>
      <ul>
        <li>Los precios se muestran en dólares estadounidenses (USD); el monto en pesos es solo una referencia.</li>
        <li>Los pagos los procesa Stripe. No guardamos el número completo de tu tarjeta.</li>
        <li>Cada compra te da acceso al programa por el periodo que indica el plan que elegiste.</li>
        <li>
          Tus pagos y recibos están en <a href="/app/cuenta/compras">Cuenta → Mis compras</a>.
        </li>
      </ul>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Cada cuenta es para una sola persona. No compartas tu acceso.</li>
        <li>Cuida tu contraseña; puedes cambiarla en Cuenta → Seguridad.</li>
        <li>Puedes eliminar tu cuenta cuando quieras desde Cuenta → Eliminar mi cuenta.</li>
      </ul>

      <h2>Tus datos</h2>
      <p>
        Cómo tratamos tus datos personales está en el <a href="/privacidad">Aviso de Privacidad</a>. Si tienes dudas, visita la{" "}
        <a href="/ayuda">página de ayuda</a> o escríbenos.
      </p>
    </LegalPage>
  );
}
