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

- [ ] Audit the existing customer plan, 360° engine, matching and resolver contracts.
- [ ] Connect the plan UI to the 360° engine and improve lifecycle/reason/status presentation.
- [ ] Complete contextual venue preferences and customer inventory sourcing behavior.
- [ ] Implement a separate restaurant trade contract across registry, customer UI, listing facets and booking resolution. Do not route restaurant orders through catering.
- [ ] Add regression tests for occasion recommendations, venue coverage, synthetic visibility, restaurant separation and checkout persistence.
- [ ] Run all validation and fix failures.
- [ ] Build and publish a fresh customer-only Android APK.

## Explicit exclusions

- No edits to the original branch.
- No partner APK or partner app redesign.
- No production migration application, rule publication, live vendor creation, payment or booking simulation.
- No fabricated listings, menus, rates, availability or partner responses.
