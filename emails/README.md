# CelsU email templates (14)

These are production versions of the 14 emails Matt approved on the design board. They are built to work in email clients: table layout, inline styles, a 600 px width that adapts to phones, a hidden preheader, and Outlook fallbacks. Every email is in Spanish.

## Files

- `supabase/`: 3 Supabase Auth templates, already in Supabase's Go-template syntax (`{{ .ConfirmationURL }}`, `{{ .Data.display_name }}`, `{{ .SiteURL }}`).
  - `confirm.html` → Confirm signup
  - `magic-link.html` → Magic Link
  - `reset-password.html` → Reset Password
- `app/`: 11 emails the app sends itself, through Resend, from an Edge Function. They use `{{variable}}` placeholders.
- `manifest.json`: the subject, preheader, sender, trigger and variable list for each email.
- `preview/`: every email filled with sample data, so you can look at it in a browser.

## Sender

`CelsU <hola@mail.celstv.com>`. Program emails use `CelsTV · CelsU`, `CelsBSNS · CelsU`, and so on; the manifest gives the exact `from_name` for each. The domain `mail.celstv.com` is set up in Resend.

**Reply-to:** the receipt email says "Responde a este correo", so set `reply_to` to a real inbox. Matt will confirm which address.

## Images

The images load from the public Supabase bucket `email-assets`:

`https://pbpnhsgygwqxnkklhyuz.supabase.co/storage/v1/object/public/email-assets/`

The files are `celsu-u.png`, `celstv-e.png`, `celsbsns.png`, `celsus.jpg`, `celsglobal.png` and `lam.png`.

## App emails: how to send

1. Load the HTML file and the manifest entry.
2. Replace every `{{variable}}` in the HTML and in the subject. **HTML-escape the values.**
3. Send through Resend: `from`, `to`, `subject`, `html`. Also send a plain-text version, which can be generated from the HTML.

Variables that every app email uses:

- `nombre`: the student's first name.
- `boton_url`: where the main button goes.
- `ayuda_url`, `privacidad_url`.

Marketing emails (`eval-d1`, `eval-d3`, `eval-d7`, `eval-d30`) also use `preferencias_url` and `baja_url`.

- **Unsubscribe is required.** `baja_url` must be a one-click unsubscribe link with a signed token. Also send the headers `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Don't send these emails to anyone who unsubscribed.
- Stop the follow-up sequence (d1, d3, d7) as soon as the student buys.

### Evaluation results (`eval-results`)

- `nivel`: the overall level, A1 to C2.
- `nivel_nombre`: the level's name, for example Intermedio.
- `nivel_texto`: one sentence about what the level means.
- For each skill, a level and a whole-number percent from 0 to 100: `vocabulario_nivel`/`_pct`, `auditiva_nivel`/`_pct`, `lectura_nivel`/`_pct`, `escritura_nivel`/`_pct`, `oral_nivel`/`_pct`.
- `escala_html`: the A1–C2 scale. Build it with the student's level highlighted; the reference function is `scale_html()` in the generator.
- The recommended offer: `oferta_titulo`, `oferta_texto`, `oferta_precio`, `oferta_mxn`.

### Follow-ups

`eval-d1` uses `nivel` and `siguiente_nivel`. `eval-d30` uses `nivel`.

### Receipt (`receipt`)

The receipt uses `programa`, `programa_corto`, `acceso`, `total`, `total_mxn`, `ultimos4`, `fecha` and `folio`.

Send it from the Stripe webhook after the payment is confirmed.

### When each email goes out

| Email | Trigger |
|---|---|
| eval-results | Right after the English evaluation |
| eval-d1, eval-d3, eval-d7 | 1, 3 and 7 days after the evaluation, only if the student hasn't bought |
| eval-d30 | 30 days after the evaluation, to everyone |
| welcome-* | On purchase, one per program (`welcome-bundle` for CelsTV + CelsBSNS) |
| receipt | When the payment is confirmed |

## Supabase Auth setup (dashboard)

1. **Authentication → Emails → SMTP Settings → Enable custom SMTP:**
   - Host `smtp.resend.com`, port `465`, user `resend`.
   - Password: the Resend API key.
   - Sender email `hola@mail.celstv.com`, sender name `CelsU`.
2. **Authentication → Emails → Templates:** paste each file from `supabase/` and use the subject from the manifest.
