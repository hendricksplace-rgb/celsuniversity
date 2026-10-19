# Week 7 – Finance for Non-Finance Professionals: notes

## Sources (all checked 2026-10-19)
1. Karen Berman & Joe Knight, "Are Your People Financially Literate?", HBR, Oct 2009: https://hbr.org/2009/10/are-your-people-financially-literate (the finding that U.S. managers averaged 38% on a basic financial-literacy test)
2. Rebecca Knight, "How to Improve Your Finance Skills (Even If You Hate Numbers)", HBR, Mar 31 2017: https://hbr.org/2017/03/how-to-improve-your-finance-skills-even-if-you-hate-numbers
3. SEC, Beginners' Guide to Financial Statements (2014, reviewed 2017): https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements
4. Money Staff, "What Is Return on Investment (ROI)?", Money via Nasdaq, Feb 10 2023: https://www.nasdaq.com/articles/what-is-return-on-investment-roi
5. Marshall Hargrave, "What is an invoice?…", QuickBooks, Aug 6 2026: https://quickbooks.intuit.com/accounting/what-is-an-invoice/
6. SBA Business Guide, Manage your finances: https://www.sba.gov/business-guide/manage-your-business/manage-your-finances
- Research model (a real company, not a made-up profile): Starbucks FY2025 press release, Form 8-K Ex. 99.1, Oct 29 2025: https://www.sec.gov/Archives/edgar/data/829224/000082922425000074/sbux-09282025xexhibit991.htm (revenue $37.2B, +3%; net earnings $1,856.4M; EPS down 51%; comparable sales down 1%; 40,990 stores; "Back to Starbucks" turnaround). Apple FY2025 numbers were also checked for the comparison (net sales $416.2B, net income $112.0B, 8-K Oct 30 2025) but are not shown in the UI.

## TED talks (talk pages checked on ted.com; embed.ted.com is blocked from the sandbox, so the embeds were not tested)
- Main: Anil Lamba, "The Balancing Act: Fun and Finance", TEDxBITSGoa, Jan 2020, about 15 min. Slug `anil_lamba_the_balancing_act_fun_and_finance`.
- Extra: Lokesh K Gurram, "Financial Education made Easy", TEDxNITRourkela, Mar 2021, about 15 min. Slug `lokesh_k_gurram_financial_education_made_easy`. This one is about personal finance in India: it fits the topic but is less closely tied to the workplace.

## Where the original lesson and the syllabus disagree
- Writing: the syllabus says "Monthly budget for your first 3 months in the U.S."; the original lesson is "Explaining ROI in an Email" ($8,000 campaign → $24,000 in sales, 120–150 words). **I followed the original.** The 3-month budget appears in the Capstone PARTS list, so it is a Capstone field (`budget_3_months`, not prefilled).
- Speaking: the syllabus says "Describe an invoice or financial summary"; the original has 3 roleplays (cut costs / ROI / P&L). I followed the original. Invoices are covered in the reading (habit 3) and in Capstone field `budget_invoice`.
- Reading: the syllabus says "How to read a budget". The original is the Carlos case. I kept Carlos and built the article around budgets, the P&L, ROI and invoices.
- The HBR link in the original (hbr.org/2017/01/why-financial-literacy-is-essential-for-managers) **could not be verified** (the fetch failed, and searches show no article with that title). It is not cited. It stays only in original.body_*/article_ref. The original YouTube link is not used either.

## Things Code must know
- **validate.py on reading.json reports 7 ERRORs, all under `$.vocab`**. The validator treats the vocab dict's keys (the terms themselves) as required fixed keys, so any week with different words will fail. With vocab swapped for week 1's, reading prints OK. Each of the 10 vocab entries has non-empty `d`/`es`/`ex` strings, and every `[[term]]` in the article matches a vocab key. Every other file prints OK.
- Reading has 1 original case (Carlos) split into 3 activities: c1 spot, c2 choose, c3 rewrite. Each carries one of the 3 original questions.
- Extra keys: research `field_label` (relabel the "Tu campo o puesto" input to "Company name"; `default_field`="Starbucks"; templates use `{field}` as the company name), `model.source_url`, `compare_q` (the 3 original "Compare" questions; show them in Paso 5 next to patterns), and video `ai_challenge` (the original's optional ChatGPT challenge).
- The research model is a REAL company. Do not label it "EJEMPLO FICTICIO"; use something like "EJEMPLO REAL · Starbucks FY2025". The analysis is 4–6 sentences (the original gives no count).
- Speaking reps are 3/3/3 = 9 tries (the original gives no count). Scene kinds are zoom / elevator / meeting; the mockup hardcodes week-1 scenes, so the text must come from the data.
- Feedback has a 6th statement ("3 finance roleplays", auto: speaking) that is not in the original 5. `goal_suggestions` starts with the 2 commitments from the original.
- Cross-refs: video.script_source_lesson_id = writing 5561cf32-…; speaking.vocab_from_lesson_id = reading dcb5b713-….
- No coach wording anywhere. Writing chip: "Se guarda en tu semana".
