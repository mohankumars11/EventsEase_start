# SAMBRAMO — End-to-End Cloud Build Specification
Version: 1.0
Prepared: 27 October 2026
Purpose: Upload this folder/bundle to your cloud coding agent and instruct it to implement the requirements in the existing SAMBRAMO repository.

---

## 0. PRIMARY EXECUTION INSTRUCTION

You are the senior full-stack engineer responsible for implementing the SAMBRAMO 360° Occasion-to-Service Recommendation System end-to-end in the existing codebase.

**Do not merely describe a plan or return mockups. Inspect the repository, implement the feature, run tests, and report exactly what changed and what remains blocked.**

Before changing code:
1. Inspect the repository structure, package manager, framework, existing customer-app screens, navigation, design system, service/trade catalogue, API layer, database schema, authentication, booking flows, and current tests.
2. Identify the existing 34 canonical trades and existing 18-category / 438-occasion catalogue. Reuse existing implementations and IDs. Do not create duplicate or parallel catalogues if equivalent production data already exists.
3. If this project uses Supabase, inspect its current schema, migrations, RLS policies, Edge Functions, generated types, and environment-variable conventions. Use migrations and least-privilege policies; never expose service-role credentials to the client.
4. Write a short implementation plan in the repository before substantial edits, then proceed with implementation unless a real blocker requires user input.
5. Do not deploy to Vercel or another production environment unless explicitly requested. Do not make destructive database changes. Do not overwrite unrelated work.
6. Preserve existing working functionality, visual conventions, routes, and trade IDs. Make the feature production-ready, not a static prototype.

If a required value, provider capability, API key, or production account is unavailable, implement the safe integration boundary, document the exact missing input, and continue with all unblocked work. Never fake a successful booking, payment, notification, or database write.

## 1. PRODUCT GOAL

Build a reliable customer-facing journey that turns a selected occasion into a relevant, contextual, end-to-end set of event services, using SAMBRAMO's existing 34 service trades.

The experience must help customers plan from initial discovery through preparation, setup, event execution, guest departure, dismantling, and post-event follow-up. It must not blindly display all 34 trades for every occasion.

The recommendation system is a **configurable, explainable baseline**. Recommendations must adapt to the occasion, venue-provided facilities, guest count, event duration, indoor/outdoor setting, event format, travel, food and beverage needs, media/privacy preferences, accessibility, safety, budget, and services already booked or supplied.

## 2. BUNDLE FILES AND SOURCE OF TRUTH

Use these included files:
- `SAMBRAMO_360_Event_Service_Recommendation_Catalogue.xlsx`: structured workbook containing the 438 occasion map, 438 × 34 trade matrix, trade master, lifecycle checklist, recommendation rules, and category summary.
- `SAMBRAMO_438_Occasion_Service_Map.csv`: machine-readable per-occasion recommendation baseline.
- `SAMBRAMO-MASTER-EVENT-CATALOGUE.md`: readable master catalogue with category, occasion IDs, and original scene descriptions.
- `SAMBRAMO-IMAGE-PROMPTS.md`: original source taxonomy and scene prompts.
- `README.md`: this execution specification and handoff checklist.

The source has 18 categories, 438 occasions, and 34 trades. Preserve all original `occ-...` and `svc-...` identifiers. Do not silently rename or delete them. Names generated from IDs are convenience display labels where a separately curated label was unavailable; do not claim they are independently verified official names.

**Mapping quality note:** the supplied recommendations are a first-pass, rules-based baseline. Treat them as configurable defaults requiring product review, not as a claim that each occasion has been independently researched or that every event of the same name requires identical services. Make it easy for authorized admins to edit rules without code changes.

## 3. CUSTOMER EXPERIENCE REQUIREMENTS

Implement within the existing app structure and design system.

### 3.1 Occasion discovery
- Display the 18 existing occasion categories and their 438 occasions.
- Support search, category browsing, and selection of an occasion.
- Preserve category and occasion IDs through the entire journey.
- Support empty, loading, error, and retry states.
- Make the selection accessible with screen-reader labels, keyboard/focus support where relevant, and adequate touch targets.
- Avoid showing all 438 items in one overwhelming screen; use search, category drill-down, and efficient list rendering.

### 3.2 Event context capture
Before producing a final recommendation list, gather only the context needed to improve relevance. Support:
- event date/time and estimated duration;
- location/city and whether services need to travel;
- estimated guest count;
- venue type (home, hotel, banquet hall, school/campus, office, outdoor/public, destination, virtual/hybrid, other);
- whether a venue is already booked and which facilities it supplies;
- indoor/outdoor/mixed setting;
- event format (ceremony, meal, stage programme, concert, workshop/conference, procession, sports, virtual, etc.);
- food and beverage requirements;
- sound/AV, lighting, power, cooling, furniture/tent, parking, transport, storage and setup needs;
- media requirements and privacy/consent preferences;
- accessibility, child-safety, crowd-control, permits and other relevant risk considerations;
- budget range and customer priorities;
- services already booked, owned, included by venue, or not wanted.

Use progressive disclosure: do not ask every question for every occasion. Ask conditional questions only when they change recommendations. Clearly mark optional questions and allow customers to continue with partial answers when safe.

### 3.3 Recommendation presentation
Classify every service in the matrix as one of:
- `CORE`: default shortlist for the occasion archetype; not a mandatory purchase.
- `CONDITIONAL`: show only when a relevant context trigger is true or after asking a targeted question.
- `OPTIONAL`: a customer-selectable upgrade or enhancement.
- `NOT_DEFAULT`: do not surface automatically, but keep searchable and available when appropriate.

The UI should:
- lead with the most relevant service shortlist, not all 34 trades;
- group recommendations by event lifecycle phase;
- explain briefly why each service is recommended;
- display whether the venue or an already-booked provider may cover it;
- let customers add, remove, save for later, or mark as already arranged;
- let customers change event context and refresh recommendations;
- show trade/service details and then navigate into the existing provider discovery/booking flow;
- distinguish “recommended” from “available”, “booked”, and “confirmed”. Never imply a provider is available until the actual availability system confirms it;
- avoid forced upsells, dark patterns, or false urgency.

### 3.4 360° lifecycle
Support these lifecycle phases, tailored to the occasion:
1. Discover and define event.
2. Plan and budget.
3. Book venue and primary suppliers.
4. Pre-event coordination and confirmation.
5. Logistics, procurement and transport.
6. Setup, installation and technical checks.
7. Guest arrival and event operations.
8. Main programme / ceremony / service delivery.
9. Food, hospitality and guest support.
10. Guest departure and transport/parking coordination.
11. Teardown, loading, return, cleanup and storage where applicable.
12. Payments, reviews, media delivery and post-event follow-up.

Do not show every phase as relevant to every event. Hide or deemphasize irrelevant phases while preserving the underlying lifecycle model.

## 4. SERVICE MASTER AND INTEGRATION RULES

The 34 canonical trades in the included source are:
1. `svc-anchor_mc`
2. `svc-bar_beverages`
3. `svc-bridal_makeup_hair`
4. `svc-cake_desserts`
5. `svc-catering_food`
6. `svc-dj_music`
7. `svc-decoration_floral`
8. `svc-end_to_end_event_logistics`
9. `svc-event_equipment_rental`
10. `svc-event_lighting`
11. `svc-event_materials_supplier`
12. `svc-gifts_favours`
13. `svc-guest_services`
14. `svc-invitation_printing`
15. `svc-live_entertainment`
16. `svc-loading_unloading_crew`
17. `svc-medium_large_goods_vehicle`
18. `svc-mehendi_artist`
19. `svc-mini_truck_pickup`
20. `svc-passenger_transport`
21. `svc-photography`
22. `svc-power_cooling`
23. `svc-priest_rituals`
24. `svc-safety_facilities`
25. `svc-security_services`
26. `svc-sound_av`
27. `svc-tent_furniture`
28. `svc-transportation`
29. `svc-trousseau_gift_packing`
30. `svc-valet_parking`
31. `svc-venue`
32. `svc-videography`
33. `svc-warehouse_storage`
34. `svc-wedding_planning`

Read the included workbook for the current customer-facing service labels, trade scope, lifecycle coverage and recommendation matrix. If the repository has a canonical trade catalogue, that live catalogue remains the system-of-record for actual service/provider IDs; reconcile the files with it instead of duplicating trades.

## 5. RECOMMENDATION ENGINE — FUNCTIONAL CONTRACT

Implement a deterministic recommendation service that can be tested without UI rendering.

### Input
`occasionId` (required), optional `categoryId`, and an `eventContext` object containing only known fields. Include selected/arranged services and venue-provided facilities.

### Output
For every relevant service:
- `tradeId`
- `status`: `CORE | CONDITIONAL | OPTIONAL | NOT_DEFAULT`
- `score` or stable priority (if implemented)
- `reasonCodes` and customer-readable `reason`
- `lifecyclePhases`
- `triggeredBy` (context fields/rules that caused inclusion)
- `coveredByVenue` / `alreadyArranged` / `customerExcluded` flags
- `requiresFollowUpQuestion` and question metadata when context is insufficient
- `ruleVersion` or equivalent traceability metadata

### Engine behavior
1. Load baseline status from the occasion-to-trade matrix.
2. Apply explicit context rules. Examples:
   - suppress venue booking if venue is already booked;
   - suppress duplicate sound, lighting, furniture, power/cooling or catering if the venue confirms it supplies those facilities;
   - consider sound/AV for speeches, stage programmes, conferences, performances or hybrid events;
   - consider lighting for evening, stage, performance, outdoor or low-light events;
   - consider tent/furniture and power/cooling for outdoor or temporary venues based on capacity and conditions;
   - consider passenger transport when destination, guest transfer, accessibility, late finish or remote venue context makes it useful;
   - consider goods vehicles, loading/unloading and storage when equipment, inventory, decor, large props or multi-day logistics require them;
   - consider safety facilities/security for public, high-attendance, alcohol-serving, high-energy or risk-sensitive events according to context and applicable local requirements;
   - consider photography/videography only in line with event type, budget and customer consent/privacy preferences;
   - consider priest/rituals for religious/traditional ceremonies when selected or relevant, without making assumptions that override the customer's preferences;
   - consider wedding planning, bridal makeup/hair, mehendi, trousseau packing and wedding-specific services only for relevant wedding occasions.
3. Avoid duplicate providers/services and services already included in a package.
4. Never upgrade `NOT_DEFAULT` solely because a keyword matched if a contradictory context flag exists.
5. Prefer explicit customer selections and venue facts over inferred defaults.
6. Return a short explanation for each recommendation and keep rules auditable.
7. Make rule weights and trigger mappings configurable through data/configuration rather than hardcoding all logic into UI components.
8. Validate unknown occasion/trade IDs and return useful errors.
9. Version rules and preserve an audit trail for admin edits.
10. Provide deterministic tests for representative occasions and conflicting context.

Do not use an LLM call as the sole recommendation engine. A future AI layer may suggest or explain options, but deterministic rules and customer-provided facts must control final inclusion and exclusion.

## 6. DATA MODEL / BACKEND

First reuse the repository's existing schema if it already models these entities. Otherwise implement an appropriate schema/migration for:
- `occasion_categories`
- `occasions`
- `service_trades`
- `occasion_trade_recommendations`
- `recommendation_rules`
- `lifecycle_phases` (or equivalent normalized configuration)
- `event_plans`
- `event_plan_services`
- `recommendation_rule_versions` or audit records

Suggested fields (adapt to conventions):
- Categories: `id`, `name`, `display_order`, `is_active`.
- Occasions: `id`, `category_id`, `name`, `scene_description`, `display_order`, `is_active`, timestamps.
- Trades: `id`, `customer_label`, `scope_description`, `is_active`.
- Baseline matrix: `occasion_id`, `trade_id`, `status`, `priority`, `reason`, `lifecycle_phases`, `rule_version`.
- Rules: `id`, `name`, `enabled`, `priority`, `conditions` (validated JSON/config), `actions`, `reason_template`, `version`, audit fields.
- Event plans: owner/customer, occasion, event context, status, timestamps.
- Plan services: plan, trade, recommendation status, user decision, provider/booking reference where supported, notes, timestamps.

Do not duplicate provider profile or booking tables if they already exist. Connect recommendations to existing provider discovery and booking entities using existing foreign keys and conventions.

### If using Supabase
- Use SQL migrations checked into the repository.
- Add indexes for category browsing, occasion search, matrix lookups and user-owned plans.
- Enable and verify RLS on customer-owned event plans and service selections.
- Public catalogue reads should expose only active, intended public fields.
- Admin-only rule editing must be protected by actual authorization and RLS, not just hidden UI.
- Never put service-role keys in client code or commit secrets.
- Keep generated database types synchronized if the project uses them.
- Include seed/import scripts that are idempotent and preserve IDs.
- Test RLS behavior for anonymous, authenticated customer and authorized admin roles.

## 7. API / DOMAIN SERVICE

Follow existing API conventions. If no convention exists, implement domain functions and endpoints equivalent to:
- `GET /occasion-categories`
- `GET /occasions?categoryId=&q=&cursor=`
- `GET /service-trades`
- `POST /recommendations/preview`
- `POST /event-plans`
- `GET /event-plans/:id`
- `PATCH /event-plans/:id`
- `POST /event-plans/:id/services`
- `PATCH /event-plans/:id/services/:serviceId`
- `DELETE /event-plans/:id/services/:serviceId`
- admin-only endpoints for recommendation-rule review and publishing, if needed.

Use schema validation at boundaries, safe pagination, stable error shapes, authorization checks, and structured logging. Avoid returning private partner data from recommendation endpoints.

## 8. ADMIN CONFIGURATION

Where an admin interface fits the current product architecture, allow authorized staff to:
- review and edit per-occasion trade status;
- edit reasons and priority;
- configure context triggers and lifecycle phases;
- preview recommendations for a test context;
- publish a new rule version;
- see change history and rollback where feasible.

If building an admin UI is out of scope for the existing repository, create a documented, validated configuration format plus a safe import/export workflow. Do not make rules editable by unauthenticated customers.

## 9. VISUAL / UX QUALITY

- Follow the existing SAMBRAMO design system; if the repository confirms the brand tokens, use the established royal-amethyst purple and white visual language.
- Keep the interface clean, compact, aligned, responsive and mobile-first.
- Avoid excessive blank space, giant cards, redundant carousels, or showing every service as equal priority.
- Use meaningful hierarchy, short labels, helpful reasons, clear selected states and accessible contrast.
- Reuse existing icons, trade imagery, cards, typography, navigation and booking components when available.
- Do not create fake provider profiles, fake prices, fake ratings, fake availability or fake booking confirmations.
- Include skeleton/loading, empty, error, retry, offline/slow-network and partial-context states.

## 10. ANALYTICS AND PRIVACY

Where analytics exist, record privacy-conscious events such as:
- category/occasion viewed and selected;
- context question answered/skipped;
- recommendation shown, added, dismissed or marked already arranged;
- event plan saved;
- service details opened;
- transition to existing booking flow.

Do not log sensitive free-text or exact personal details unnecessarily. Honor existing consent and privacy mechanisms. Media-related services should respect consent preferences.

## 11. TESTING AND ACCEPTANCE CRITERIA

The feature is not complete until the cloud agent runs and reports available tests, linting, type checks and builds.

### Catalogue integrity
- Exactly 18 category records and 438 unique occasion IDs are imported/available, unless the live repository has a newer authoritative catalogue; if so, report reconciliation differences.
- All 34 canonical trade IDs are preserved and mapped.
- No duplicate occasion or trade IDs.
- Every recommendation matrix row references a valid occasion and trade.
- Import/seed process can run repeatedly without duplicates or destructive overwrites.

### Recommendation correctness
- Every recommendation has a valid status.
- Venue-provided or already-arranged services are suppressed or marked covered.
- Conditional services are not shown as unconditional defaults when their trigger is unmet.
- Customer exclusions are respected.
- Relevant services remain searchable even when not default.
- Reasons are concise, user-readable and traceable to a rule.
- Unknown IDs and invalid contexts produce useful validation errors.

### Representative scenario tests
Create tests for at least:
1. Small home birthday with venue at home and no stage programme.
2. First birthday at a banquet hall where venue includes sound, lighting, furniture and catering.
3. Traditional wedding ceremony with rituals and multiple related events.
4. Outdoor evening concert with stage, sound, lighting, guest transport and safety context.
5. Corporate conference with presentations and hybrid/AV requirements.
6. School annual day using school facilities, with conditional rental and safety services.
7. Virtual/hybrid business event.
8. Destination wedding with outstation logistics.
9. Memorial gathering with respectful, non-festive defaults.
10. Public festival with crowd/permission/safety considerations.
11. Customer who has already booked a photographer and excludes videography.
12. Event with unknown or incomplete optional context.

### Security / reliability
- Customers cannot read or edit another customer's event plans.
- Only authorized admins can change global rules.
- No secret credentials committed.
- No false booking/availability success.
- Relevant migrations and rollback notes exist.
- Failure states are handled without losing user input.

### Delivery report
At completion, return:
- summary of implemented behavior;
- key files added/changed;
- migrations and seed/import commands;
- tests/build/lint/typecheck results with actual outcomes;
- screenshots or a concise UI walkthrough if supported;
- remaining blockers and required environment variables;
- any discrepancies between supplied catalogue and live repository;
- explicit confirmation that no production deployment was performed.

## 12. IMPLEMENTATION ORDER

1. Repository reconnaissance and report.
2. Reconcile the live catalogue with the provided 18/438/34 source files.
3. Add/adjust schema and idempotent seed/import process.
4. Implement deterministic recommendation domain service and unit tests.
5. Add API/domain integration.
6. Build customer occasion browsing and context capture.
7. Build recommendation results grouped by lifecycle phase.
8. Connect service detail and existing booking flows.
9. Add admin configuration or documented safe config import/export.
10. Run full test/build/lint/type checks; fix regressions.
11. Document setup, data import, rule tuning and test scenarios.
12. Deliver the implementation report; do not deploy.

## 13. FINAL NON-NEGOTIABLES

- Build in the existing repository, not a throwaway demo.
- Preserve existing working behavior and canonical IDs.
- No deployment without explicit approval.
- No fabricated providers, prices, availability, payment or bookings.
- No destructive database reset.
- Keep rules deterministic, configurable, explainable and testable.
- If unable to finish a step, state the blocker precisely and complete all independent steps.
