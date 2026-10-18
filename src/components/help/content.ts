// Centro de ayuda (/ayuda). Copy approved in celsu-ayuda-privacidad.md. Answers are plain text;
// lines starting with "- " render as a list.
export type Faq = { q: string; a: string };
export type FaqGroup = { title: string; items: Faq[] };

export const HELP: FaqGroup[] = [
  {
    title: "Tu cuenta",
    items: [
      { q: "¿Cómo creo mi cuenta?", a: 'Toca "Crear cuenta", escribe tu nombre, tu correo y una contraseña de al menos 8 caracteres. Te enviaremos un correo para confirmar que es tuyo; toca el botón del correo y listo.' },
      { q: "No me llegó el correo de confirmación.", a: "Revisa tu carpeta de spam o promociones. El correo llega de hola@mail.celstv.com. Si en 10 minutos no aparece, escríbenos a hola@celstv.com." },
      { q: "Olvidé mi contraseña.", a: 'En la pantalla de entrar, toca "¿Olvidaste tu contraseña?" y te enviaremos un enlace para crear una nueva. El enlace vence en 1 hora.' },
      { q: "¿Puedo cambiar mi correo o mi nombre?", a: "Sí, desde Cuenta → Mis datos." },
    ],
  },
  {
    title: "La app",
    items: [
      {
        q: "¿Cómo descargo la app?",
        a: 'Toca "Descargar app", arriba en cualquier pantalla.\n- En Android, toca "Instalar".\n- En iPhone, abre la página en Safari, toca Compartir, luego "Agregar a inicio" y luego "Agregar".\n- Si abriste el enlace desde Instagram, Facebook o WhatsApp, primero ábrelo en Chrome o Safari.',
      },
      { q: "¿Ocupa mucho espacio?", a: "No. La app pesa menos de 1 MB. Solo ocupa más si descargas episodios para estudiar sin internet." },
      { q: "¿Puedo estudiar sin internet?", a: 'Sí. Toca "Descargar para usar sin conexión" en un episodio o libro. Se guarda todo menos el video, y la descarga dura 7 días. Se renueva sola cada vez que te conectas.' },
    ],
  },
  {
    title: "La evaluación de inglés",
    items: [
      { q: "¿Cuánto dura y cuánto cuesta?", a: "Es gratis y toma unos 15 minutos. Te recomendamos usar audífonos." },
      { q: "¿Cómo funciona?", a: "Se adapta a ti: si respondes bien, las preguntas suben de nivel, y si te cuestan, bajan. Al final te damos tu nivel de A1 a C2 y tu nivel en cada habilidad." },
      { q: "¿Puedo repetirla?", a: "Sí, a los 30 días, para medir tu avance de verdad." },
    ],
  },
  {
    title: "Pagos",
    items: [
      { q: "¿Cómo se paga?", a: "Con tarjeta de crédito o débito. El cobro es en dólares (USD), y te mostramos la referencia en pesos para que sepas cuánto es. Tu banco puede cobrar una comisión por compras en dólares." },
      { q: "¿Me dan factura o recibo?", a: "Te enviamos un recibo por correo al pagar. Si necesitas factura, responde ese correo con tus datos fiscales." },
      {
        q: "¿Tienen reembolsos?",
        a: "Sí. Puedes pedir el reembolso por cualquier motivo en las primeras 72 horas después de tu compra. Escribe a hola@celstv.com desde el correo de tu cuenta. Te devolvemos el pago a la misma tarjeta y tu acceso se cierra. Tu banco puede tardar de 5 a 10 días hábiles en reflejarlo. En CelsGLOBAL con pagos mensuales, te devolvemos el primer pago y cancelamos los demás.",
      },
    ],
  },
  {
    title: "Cursos y clases",
    items: [
      { q: "¿Tengo que seguir los cursos en orden?", a: "No. En CelsGLOBAL el orden es solo una sugerencia; puedes abrir cualquier etapa cuando quieras. En tu clase en vivo tu profesor también puede asignarte cursos." },
      {
        q: "¿Cuánto tiempo tengo acceso?",
        a: "Depende del programa, y cuenta desde el día de tu compra:\n- CelsTV: 1 año\n- CelsBSNS: 6 meses\n- CelsUS: 9 meses\n- CelsGLOBAL: 18 meses (también con pagos mensuales)\nEn un paquete, cada programa tiene su propio periodo de acceso.",
      },
      { q: "CelsUS: ¿me ayudan con mi trámite de ciudadanía?", a: "CelsUS te prepara para la entrevista y el examen cívico. No damos asesoría legal. Para preguntas sobre tu caso, consulta con un abogado de inmigración." },
    ],
  },
];

export const CONTACT_EMAIL = "hola@celstv.com";
