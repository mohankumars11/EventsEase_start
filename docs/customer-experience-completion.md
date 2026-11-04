# Customer experience completion — AI-implementation

Branch: `AI-implementation`
Scope: customer Android app and customer-facing APIs only. Partner app is excluded.
Production database changes: migrations may be authored and tested, but not applied without explicit approval.

## Acceptance gates

1. **Occasion recommendations are the source of truth.** The customer event-plan screen must render the deterministic 360° engine output for the selected occasion and current event context, not a parallel legacy `needsFor` shortlist. CORE, CONDITIONAL, OPTIONAL and NOT_DEFAULT must have distinct presentation and customer controls. Each recommendation must show its reason and lifecycle phase. Venue-covered, already-arranged, excluded and later states must remain distinct.
2. **Context changes recalculate.** Guest count, time/duration, venue and its facilities, indoor/outdoor setting, event format, food, privacy, access, budget and customer decisions must be carried into the recommendation input. Unknown answers must not be treated as true.
3. **Inventory is real.** Availability and prices must come only from eligible non-synthetic LIVE listings and existing quote/booking resolvers. Empty supply must offer sourcing/concierge, never sample vendors or invented availability.
4. **Restaurant is a separate trade.** Add a canonical `restaurant` trade end-to-end without silently reusing catering as the restaurant resolver. Include customer discovery/order requirements and a dedicated partner listing schema contract. Any production DB migration must be reviewed and explicitly approved before application.
5. **Checkout and saved plans remain coherent.** Event plan decisions, restaurant orders, booking references and customer-facing lifecycle state must persist without overwriting booking-linked rows.
6. **Android build is reproducible.** Run the full customer test suite, 360° catalogue checks, API checks, web build, native asset checks, route smoke tests and customer-only Gradle APK build. Verify the APK artifact and release asset before sharing.

## Work sequence

- [x] Audit the existing customer plan, 360° engine, matching and resolver contracts.
- [x] Reorganise customer plan recommendations by lifecycle and show recommendation labels/reasons in compact actionable rows.
- [x] Ask conditional recommendation follow-ups in the plan and update the engine context as answers change.
- [x] Add Fast & Simple (best-fit) versus I want control (compare eligible masters) booking preference.
- [x] Add Best fit / Budget conscious / Premium experience ranking preference to live matching.
- [x] Add price-free, service-specific coverage scopes (photo/video 2/4/6h; DJ 2/3/4h; anchor 2/4/6h with script in the longest scope; entertainment/makeup/mehendi 1/2/3h).
- [x] Freeze selected coverage hours and supported add-ons into matching/booking requests for server revalidation.
- [x] Add a separate restaurant-order sourcing screen and remove restaurant from the catering kitchen-type selector/matcher.
- [ ] Implement the live restaurant trade contract across canonical registry, partner listing, catalogue, delivery availability, pricing and booking resolution. Customer screen is deliberately transparent that live restaurant inventory is not connected yet.
- [ ] Add/finish regression tests for all new customer behavior and verify current validation.
- [ ] Run all validation and fix failures.
- [ ] Build and publish a fresh customer-only Android APK after implementation is complete.

## Known dependency

The customer app has a separate restaurant-order request screen, but the repository's live registry and booking engine still have 34 trades and no restaurant-specific listing/menu/availability resolver. A genuinely bookable restaurant trade needs its partner onboarding/listing contract and server-side order resolver. The prior implementation scope excluded partner-app changes, so this part cannot be called end-to-end complete while that exclusion remains. No fake restaurant listings or prices are shown.

## Explicit exclusions

- No edits to the original branch.
- No partner APK or partner app redesign.
- No production migration application, rule publication, live vendor creation, payment or booking simulation.
- No fabricated listings, menus, rates, availability or partner responses.
