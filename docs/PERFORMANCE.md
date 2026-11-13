# Performance check (Phase 7, 13 Nov 2026)

Measured on a database with **10,000 organisations, 50,000 contacts (Thai + English names), 30,000 activities, 3,000 opportunities, 20,000 newsletter consents**. Median of 3 runs after warm-up, development laptop-class container.

| Screen / query | ms |
|---|---|
| Organisations list | 32 |
| Organisation search — Thai "พลังงาน" | 23 |
| Organisation search — English "energy hold" | 16 |
| Contacts list, page 40 | 19 |
| Contact search by email fragment | 67 |
| Contacts opted in to newsletter | 20 |
| Activities (partner, with confidentiality filter) | 9 |
| Opportunities table / board | 7 / 22 |
| Pipeline summary (all deals) | 29 |
| Global search (Thai) | 13 |
| Dashboard queries | 4–5 each |
| Duplicate check (trigram) | 54 |
| Report: open pipeline | 44 |
| Report: activity by person | 278 |
| Report: PDPA mailing list, 20,000 rows | 332 |
| Import plan, 5,000 contacts vs 50,000 existing | ~300 |
| Excel export, 20,000 rows | ~1,200 (963 KB) |
| PDF export, 1,000 rows (cap) | ~21,000 |

All screens are well inside a 1-second budget. **PDF exports are capped at 1,000 rows** (the PDF says so and points to Excel for the full list); typical PDFs (< 200 rows) take ~3 s. Rendering Thai and Latin in one cell is the main PDF cost, so cells without Thai use the Latin face only.

Re-run: create `bdcrm_perf`, run `prisma migrate deploy` and `db:seed -- --demo` against it, load `scripts/perf-data.sql`, then `npm run perf`.
