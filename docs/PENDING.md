# Sambramo customer app — what is still pending

Last updated 27 Oct 2026, branch `feature/customer-app-masters`.

## Blocking launch

| # | Item | Why it blocks | Owner action |
|---|---|---|---|
| 1 | **Web deploy (owner decides when)** | Nothing is deployed from here — the customer app ships as an APK. Guest RSVP links (`/rsvp/…`) open in a browser only once the owner deploys this build to sambramoh.vercel.app; phones also need `/api/anchor` (today they reach the laptop API on Wi-Fi). | Owner's deploy |
| 2 | ~~Apply migration 191~~ | Applied 27 Oct; `check-rsvp-live.mjs` passes 17/17. | Done |
| 2b | ~~Apply migration 192~~ (guest care & style circles) | Applied 28 Oct; `check-guest-care-live.mjs` passes 19/19 and `check-rsvp-live.mjs` still passes 17/17. | Done |
| 2c | **Apply migration 193** (consent records, vouchers, city interest) | Until pasted: the OTP-time acceptance waits on the phone and is sent next launch; welcome vouchers live only on that phone; "notify me" for other cities is kept locally. | Paste `193_sambramo_consent_vouchers_city_interest.sql` |
| 2d | **Lawyer review + Grievance Officer** | `src/customer/data/policies.js` (terms, cancellation & refunds, privacy, supply rules) is a careful draft, not legal advice; the E-Commerce Rules 2020 require a named Grievance Officer in the app. | Review; fill `GRIEVANCE` |
| 2e | **25% welcome offer: who funds it** | Shown everywhere and issued as a real voucher, but not yet taken off the payment (`api/create-booking-payment.js`). Recommendation and the change needed: `docs/LAUNCH-OFFERS-AND-POLICIES.md`. | Decide; then wire it |
| 3 | **Razorpay live mode** | Only ₹1 test payments run today. | Activate account, live keys |
| 4 | **Phone OTP** | Email OTP until DLT registration (1–2 weeks). | DLT registration |
| 5 | **Listing data exposure** | `sambramo_listing_versions.answers` is public and holds caterers' FSSAI numbers and declarations. The app never shows them, but anyone with the anon key can read them. | Restrict columns / a view |
| 6 | **Remove synthetic + legacy data** | 340 test masters drive every list today. | One-command purge at launch |
| 7 | **Other unapplied migrations** | 130–134 (calendar), 144–150 (verification), 047/048 (heritage). | Paste SQL |

## Promised on screen but not yet real

| Item | Today | To build |
|---|---|---|
| 10% welcome offer | Text only; nothing discounts at checkout | Coupon engine: codes, eligibility (first booking), auto-apply, ledger |
| Celebration wallet | Shows ₹0; Add Money explains it is coming | Wallet ledger, top-up via Razorpay, refunds to wallet, gift cards |
| "Instant" / "ready on your date" | From the master's `instant` flag | Real availability calendar (needs 130–134) so instant means a free slot |
| Ratings & reviews | Seeded on test masters | Reviews from completed bookings only |

## Next features (customer)

1. **RSVP, round 2** — automatic reminders and bulk sending through the WhatsApp Business API (today the host taps Send per guest); gift wishlist; QR code check-in at the door; card designs/themes; a shared photo album after the event; guest travel and hotel lists for destination weddings.
2. **Chat with your master** — in-app messages with phone masking.
3. **Invoices & GST receipts** for every payment.
4. **Booking updates on WhatsApp** (accepted, on the way, delivered).
5. **Analytics** — the privacy-safe events in docs/sambramo-360/README.md §10.
6. **Admin screen for 360° rules** — the CLI workflow (`scripts/rules360.mjs`) exists; a UI does not.
7. **Package-level requirements** in briefs (hours of coverage, album type) — listings don't store these in a matchable form yet.
8. **Kannada and Hindi**.
9. **Dispute and support tickets** beyond WhatsApp/call.
10. **Images** — 309 occasion illustrations and a new hero image (OpenAI credit needed).

## Partner app (paused 22 Oct 2026)

ID verification, Razorpay payouts to partners, buttons audit, load test, database security review.

## Engineering

- The dev laptop (3.9 GB RAM) cannot reliably run `npm run build` alongside other apps; builds have crashed with out-of-memory. Build APKs in CI or on a bigger machine.
- No linter or type checker is configured.
