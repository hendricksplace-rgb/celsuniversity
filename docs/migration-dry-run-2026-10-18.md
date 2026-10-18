# Student migration: dry run (2026-10-18)

Nothing was written anywhere: no Supabase rows, no auth users, no Base44 or Kajabi changes, no emails.
The only Supabase access was read-only (`profiles`, `courses`, `programs`).

## Result: the student list isn't available yet

| Source | What was found | Students usable |
|---|---|---|
| **Base44** (CelsU app `6a4cfadfe1f30bc41a96d740`) | 4 users, all staff (Matt, René, Ludo, Alex). 14 `UserProfile` rows: 3 staff and 11 seeded **demo** profiles (5 "students", e.g. `student1`, `pending_igm_*`), none of them with an email. 5 `Enrollment` rows, all on Matt's account or a demo class. `Enrollment` has no access-end field. | **0** |
| **Kajabi export** | Not found: not in the session uploads, the repo or Google Drive (Drive only has the Kajabi course videos and a 2024 sales sheet, `Celstv_US_Sales`, which is not a member export). | **0** (missing) |
| **Supabase** (today) | 8 profiles (test and staff accounts), 23 enrollments from `admin-setup` / `smoke-test`; no `legacy_id` set. | — |

Dry-run counts (Base44 only, `scripts/migrate-students.mjs --base44 …`):

| Count | Value |
|---|---|
| Students in the plan | 0 |
| Matched in Base44 and Kajabi | 0 |
| Duplicates | 0 |
| Students with no email | 5 (all Base44 demo profiles: skipped) |
| Already in Supabase | 0 |
| Landing per program | none |

So the ~132 current students live in **Kajabi**, and the migration needs Kajabi's export to run.

## What's needed from Matt / Cowork

1. **Kajabi exports** (Kajabi → Contacts/People → Export, and Sales/Offers → Export as CSV):
   - People: name, email, products/offers, created date.
   - Offers or purchases: email, offer, purchase date, status, and the access end date if the offer has one.
2. **Offer names → programs.** The script maps by keywords (below). Any offer it can't map is listed as "unknown" in the dry run for Matt to assign.
3. **End dates.** When the export has no end date, the script estimates it as purchase date + what the product grants today (CelsTV 12 months, CelsBSNS 6, CelsUS 9, CelsGLOBAL 18) and flags it "end date estimated". Matt to confirm that rule, or provide real end dates.
4. **Already-expired students**: migrate them as `active` with a past `expires_at` (they'd see "Tu acceso terminó" and can renew), or leave them out? The plan flags them "all access expired"; nothing is decided by the script.

## The script

`scripts/migrate-students.mjs`

- **Default is a dry run.** It reads the input files plus Supabase `profiles` (to flag students who are already here) and writes the full plan to `--out` (keep it in the scratchpad; it holds personal data).
- **`--apply` is refused** unless `MIGRATION_APPROVED=yes` is set. Apply:
  - creates each auth user with `email_confirm: true` and **sends no email** (no invite or magic link);
  - sets `profiles.legacy_id` (Base44 id);
  - inserts one enrollment per landing course or program with `source='migration'`, `starts_at` and `expires_at`.
- **Merge rules:**
  - Email is the key (trimmed, lowercased).
  - Rows with the same email merge into one student (counted as duplicates).
  - Kajabi wins for name, offers and dates.
  - Base44 only adds its legacy id and a program Kajabi doesn't have.
  - Per landing program, the latest end date wins.
- **Skipped:** students with no valid email (listed); staff profiles (moved by hand); offers that map to nothing (listed).
- **Mapping (first match wins):**

| Offer contains | Lands in |
|---|---|
| global, IPD, international, profesional, Pro TN, TN | program `international-professional-development` (CelsGLOBAL) |
| BSNS, business, negocios, E4B | course `english-for-business` |
| US, CelsUS, ciudadanía, citizenship, civics | course `celsus-para-ciudadania` |
| CelsTV, generation, TV, E4OG | course `celstv-english-for-our-generation` |
| finanzas / resume, CV / interview, entrevista | the CelsGLOBAL courses (only if bought on their own) |

**Logic check:** I ran it on a synthetic 5-row CSV (fake addresses, scratchpad only). It merged a duplicate email, normalized the case and spaces of an email, flagged the row with no email, listed an unmapped "Webinar gratis" offer, estimated the missing end dates, and kept the export's own end date where it had one.

**To run it once the exports arrive:**

```
node --env-file=.env.local scripts/migrate-students.mjs \
  --kajabi people.csv --kajabi-offers offers.csv --base44 base44.json --out /tmp/…/migration-plan.json
```

The Base44 input (`base44.json`) is a JSON of `users`, `profiles`, `enrollments`, `courses` and `programs` exported from the Base44 app's entities. Today it holds no real students.
