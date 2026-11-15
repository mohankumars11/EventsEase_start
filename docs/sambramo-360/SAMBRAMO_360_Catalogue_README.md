# SAMBRAMO Customer App — 360° Event-to-Service Recommendation Catalogue

- 438 occasion rows and 438 unique original occasion IDs.
- 34 canonical trade IDs from the saved Sambramo master file.
- The workbook includes a per-occasion shortlist, 438 × 34 trade matrix, trade master, lifecycle checklist and recommendation trigger rules.

## Recommendation labels
- **CORE**: default shortlist for this event archetype; not a forced purchase.
- **CONDITIONAL**: recommend only after asking context (venue facilities, guest count, indoor/outdoor, program, travel).
- **OPTIONAL**: customer-selectable upgrade.
- **NOT DEFAULT**: do not surface automatically, but keep searchable.

This is a rules-based baseline, not a claim that every event of the same name needs identical vendors. Personalize by venue, guest count, budget, duration, format, travel, food, accessibility, culture, safety and customer selections. Suppress services already supplied by the venue or another booked partner.

Customer-facing occasion names are formatted from original IDs where the source did not have a separate name field; original `occ-...` IDs and scene prompts are retained.
