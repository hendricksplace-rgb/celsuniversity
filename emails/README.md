# CelsU email templates (14)

These are the production versions of the 14 emails Matt approved on the design board. They are built to work in email clients: table layout, inline styles, 600 px wide and adapted for phones, a hidden preheader, and Outlook fallbacks. All of them are in Spanish.

## Files

- `supabase/` holds the 3 Supabase Auth templates. They are **already installed** in Supabase (Authentication → Emails → Templates) and use Supabase's Go template syntax (`{{ .ConfirmationURL }}`, `{{ .Data.display_name }}`).
  - `confirm.html` → Confirm signup
  - `magic-link.html` → Magic Link
  - `reset-password.html` → Reset Password
- `app/` holds the 11 emails the app sends itself, through Resend from an Edge Function. They use `{{variable}}` placeholders.
- `manifest.json` lists, for each email: subject, preheader, sender, reply_to, trigger and variables.
- `preview/` has every email filled with sample data, so you can open it in a browser.

## Sender

- **From:** `CelsU <hola@mail.celstv.com>`. Program emails use the sender name `CelsTV · CelsU`, `CelsBSNS · CelsU`, and so on; the manifest has the right `from_name` for each email.
- **Domain:** `mail.celstv.com` is verified in Resend.
- **Reply-to:** `hola@celstv.com` on every email. That inbox receives mail through Google Workspace.

## Images

The images are public in the Supabase bucket `email-assets`:

`https://pbpnhsgygwqxnkklhyuz.supabase.co/storage/v1/object/public/email-assets/`

The files are `celsu-u.png`, `celstv-e.png`, `celsbsns.png`, `celsus.jpg`, `celsglobal.png` and `lam.png`.

## Sending the app emails

1. Load the HTML file and its entry in the manifest.
2. Replace every `{{variable}}` in both the HTML and the subject. **HTML-escape the values.**
3. Send through Resend with `from`, `reply_to`, `to`, `subject` and `html`. Include a plain-text version as well; you can generate it from the HTML.

**Variables in every app email:**
- `nombre`: the student's first name.
- `boton_url`: where the main button goes.
- `ayuda_url` and `privacidad_url`: `/ayuda` and `/privacidad` (content in `celsu-ayuda-privacidad.md`).
- `app_url` (welcome emails only): `/app?instalar=1`, which opens the install sheet.

**Marketing emails** (`eval-d1`, `eval-d3`, `eval-d7`, `eval-d30`) also use `preferencias_url` and `baja_url`:
- `baja_url` must be a one-click unsubscribe link with a signed token.
- Send the headers `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Never send to someone who unsubscribed.
- Stop the d1/d3/d7 follow-ups as soon as the student buys.

**Evaluation results** (`eval-results`) uses these variables:
- `nivel`: A1–C2.
- `nivel_nombre`: for example, Intermedio.
- `nivel_texto`: a short description of the level.
- One level and one whole-number percentage (0–100) per skill: `vocabulario_nivel`/`_pct`, `auditiva_nivel`/`_pct`, `lectura_nivel`/`_pct`, `escritura_nivel`/`_pct`, `oral_nivel`/`_pct`.
- `escala_html`: the A1–C2 row with the student's level highlighted. `scale_html()` in the generator is the reference for how to build it.
- `oferta_titulo`, `oferta_texto`, `oferta_precio`, `oferta_mxn`: the recommended offer.

**Follow-ups:** `eval-d1` uses `nivel` and `siguiente_nivel`; `eval-d30` uses `nivel`.

**Receipt** (`receipt`) uses `programa`, `programa_corto`, `acceso`, `total`, `total_mxn`, `ultimos4`, `fecha` and `folio`. Send it from the Stripe webhook after the payment is confirmed.

## Triggers

| Email | Trigger |
|---|---|
| eval-results | Right after the English evaluation |
| eval-d1, eval-d3, eval-d7 | 1, 3 and 7 days after the evaluation, only if the student hasn't bought |
| eval-d30 | 30 days after the evaluation, to everyone |
| welcome-* | On purchase, one per program (`welcome-bundle` for CelsTV + CelsBSNS) |
| receipt | When the payment is confirmed |
