# Sambramo Partner Questionnaire Reconciliation v1.2

Baseline reviewed: Partner APK Build #155, commit `a68ae557988e14286448b360593d17dfea7f1dd8`.

## What was reviewed

- 34 canonical trades: 26 Events + 8 Logistics.
- 291 trade-specific questionnaire rows in the v1.1 workbook.
- `src/data/partnerSpecs.js`, `src/data/partnerServiceSpecs.js`, `src/data/partnerOperations.js`, `src/components/vendor/AddItemFlow.jsx`.
- Existing customer matching map and pricing model.

## Findings

1. **Transportation overlap is real.** E12 Transportation, L01 Mini Truck / Pickup, L02 Medium / Large Goods Vehicle and L03 Passenger Transport can overlap when a generic vehicle/transport label is used.
   - Keep E12's internal ID for data continuity, but customer-facing scope is **Event Cars & Guest Transfers**.
   - L01 owns small-goods movement.
   - L02 owns heavy/bulk goods movement.
   - L03 owns bus/tempo-traveller/group passenger movement, especially scheduled/multi-stop.
   - Do not hard-delete E12 until existing listings/bookings are migrated.

2. **Generic rental is too broad.** L04 Event Equipment Rental can overlap tents/furniture, lighting, AV, power/cooling and safety assets.
   - L04 is restricted to general reusable event-operations equipment.
   - Specialized assets remain owned by E10/E13/E17/E22/E23.

3. **Materials supplier needs a boundary.** L07 Event Materials Supplier can overlap invitations, gifts, food and trade-specific equipment.
   - L07 is restricted to bulk event materials, consumables and raw-material SKUs.

4. **End-to-End Event Logistics is an orchestrator, not a fallback match.**
   - L08 can bundle transport/storage/crew/setup, but matching must never send every logistics request to L08 merely because another trade is missing.

## Question reconciliation

The 291 rows were dispositioned as follows:

- 38 -> shared **Price Book** screen.
- 18 -> shared **Operations** screen.
- 6 -> **Verification / risk evidence**.
- 20 -> canonicalized/reused question concepts rather than duplicated implementations.
- 17 -> **conditional** trade questions.
- 192 -> retained as trade-specific capability/matching questions.

This leaves **229 trade-specific rows** after common-screen moves.

## Specific removals / moves

The following must not be repeatedly asked inside trade detail:

- `rate_card` -> Price Book.
- `lead_time` -> shared Operations.
- `travel` / service-area variants -> shared Operations/service area.
- `team_size` and related capacity concepts -> shared capacity/Operations where already represented.
- vehicle/operator documents -> Verification.
- FSSAI -> Verification.
- PSARA -> Verification.
- valet incident/damage process -> Risk/Verification.

## Canonical duplicate concepts

These concepts should use one reusable question component and canonical field, with trade-specific answer vocabularies:

- coverage duration -> `coverage_duration_options`
- duration options -> `duration_options`
- setup/soundcheck -> `setup_soundcheck_duration`
- travel -> `service_area`
- pricing model -> `pricing_model`
- rigging -> `rigging_capability`
- personalization -> `personalization_options`
- minimum order -> `minimum_order`
- loading support -> `loading_support`
- vehicle/operator documents -> `vehicle_compliance`

## Question wording corrections

The following were identified as semantically weak or ambiguous and are rewritten in the reconciliation workbook:

- Catering kitchen type -> **What food-handling setup can you support?**
- Mehendi “pairs of hands” -> **How many guests can your team serve in one session?**
- Venue “floating” capacity -> **What is your maximum standing capacity?**
- Logistics ownership -> **Which resources do you own, lease, or coordinate?**
- Invitation capacity -> **What quantity range can you fulfil per order?**
- Storage capacity -> **What total and available storage capacity can you accept?**
- Transportation scope -> **Which event transport jobs do you accept?**

## Partner app target flow

Preserve the current four navigation surfaces: **Jobs / Calendar / Earnings / More**.

The listing flow becomes:

1. Trade + offering
2. Capability & match profile
3. Operations & availability
4. Resources & inventory (only when applicable)
5. Price Book
6. Verification & evidence (only when applicable)
7. Review & publish

Catering keeps its dedicated sub-flow; its food model, cuisine, dietary and menu inputs must not be duplicated in generic trade detail.

## Customer app target flow

Customer navigation remains focused on **Events + Logistics**.

For a selected offering, ask only the demand fields required for matching/pricing. Typical determinants are date/time, location, quantity/guest count, duration, route, dimensions/load, resource needs, style/material, dietary/language/technical requirements and access constraints.

The customer pricing state remains:

- INSTANT_BOOK
- INSTANT_QUOTE
- PROVISIONAL_QUOTE
- QUOTE_ACTION_REQUIRED
- UNAVAILABLE

No rides tab/navigation is introduced at this stage.

## Acceptance tests

- No duplicate visible prompt within one partner listing flow.
- No trade-detail prompt repeats lead time or service area when shared Operations already captured it.
- No compliance document is collected as a normal capability question.
- Conditional questions are invisible until their triggering offering/capability is selected.
- E12 cannot match goods-movement jobs.
- L03 cannot be used as the default match for a single wedding car offering.
- L04 cannot match specialized AV/lighting/power/furniture/safety assets.
- L08 is not a fallback for an unmet trade match.
- Every published offering has a price unit, minimum/quantity rule where applicable, service area, availability and required evidence.
