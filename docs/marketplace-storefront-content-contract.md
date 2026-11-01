# Sambramo marketplace storefront: content contract

## Purpose
The partner preview and customer listing must use saved partner data. Visual fallbacks may be used for missing content, but the UI must never invent a portfolio image, rating, verification state, price, popularity claim, or business history.

## Data sources
- Partner identity and profile: `vendors` (`business_name`, `avatar_url`, `city`, `area`, `state`, `description`, `is_verified`, `verification_status`, `rating_avg`, `years_experience`).
- Customer profile fallback: `profiles.avatar_url` where the authorized public mapping supports it.
- Listing and per-trade profile data: `vendor_services` and `sambramo_listing_versions.profile` / `answers` for the corresponding listing version.
- Package name, description, tier, commercial inclusions and trade inputs: `sambramo_trade_packages`.
- Package prices and units: `sambramo_partner_price_books` linked by `vendor_service_id` and `offering_id`; never show partner take-home or platform fees.
- Optional extras: `sambramo_trade_package_addons` or the existing trade-specific pricing engine.
- Portfolio files: `partner_work` metadata plus signed objects from the private `partner-uploads` bucket.
- Booking, payment, cancellation, travel, minimum notice and add-on charges: saved package/listing terms and the existing booking flow.

## Display rules
1. Resolve private storage paths to short-lived signed URLs; do not persist signed URLs as source data.
2. Use a partner's actual avatar when available. Otherwise use a clean monogram/trade fallback; never substitute a random image from another trade.
3. A partner's own preview may show submitted media and clearly label its moderation state. Published customer content must only show media approved by the current public listing contract.
4. Do not show ratings/review counts, completed-event counts, experience years, or verification badges unless the source data supports each claim.
5. A package is only described as popular/featured when the saved record explicitly flags it; a name like “Signature” is not proof of popularity.
6. Package price, unit, duration, minimum quantity, inclusions, extras and terms must come from saved fields. Do not replace missing values with sample amounts.
7. The booking CTA in partner preview is a non-transactional preview. Live booking must continue to validate availability and final payable amount in the existing Sambramo flow.
8. The preview should label live/review/draft states and must not imply that an under-review version is already public.

## Required storefront inputs
- Profile: display/business name, partner avatar, trade name, service area, short description.
- Media: approved hero image, additional portfolio photos, video/audio/catalogue links where the trade supports them; moderation state per asset.
- Commercial: published package(s), exact customer-facing prices, units/duration, inclusions and explicit featured flags.
- Rates/catalogue: charge basis, minimum order/quantity, orderable items, extras and additional-unit/overtime charges when configured.
- Terms: booking mode, payment/advance policy, minimum notice, cancellation/rescheduling, travel and any additional fees.
- Trust: verified state and rating/review totals only when backed by their authoritative records.

## Read-only audit snapshot (13 October 2026)
- `vendors`: 230 rows; only 1 row had a non-empty `avatar_url`; all 230 had a city/area location.
- `profiles`: 21 rows; no non-empty `avatar_url` was present.
- `partner_work`: 9 files total (5 photos, 4 videos); all 9 were `under_review`, with no `live` items in the current dataset.
- `sambramo_trade_packages`: 30 rows; 27 under review and 3 archived, with no live packages in the current snapshot.
- `sambramo_listing_versions`: 8 rows; 7 under review and 1 archived, with no live listing version in the current snapshot.
- `sambramo_catering_packages`: 0 rows in the current snapshot.
- `sambramo_partner_price_books`: 392 active `partner_base_rate` rows and 28 draft package/base rows across the trades represented.

These counts are a point-in-time audit, not application constants. The preview must query live data and update automatically as partner content is approved or edited.

## Current input-collection behavior
The partner preview includes a compact readiness checklist and an avatar-upload control. Profile photos are stored in the `partner-avatars` bucket under the partner's own vendor ID path, and `vendors.avatar_url` stores the object path; the UI resolves a short-lived signed URL for rendering. Portfolio uploads remain in `partner-uploads` and retain their existing review workflow.
