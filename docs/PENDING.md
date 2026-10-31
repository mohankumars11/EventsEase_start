# Sambramo customer app — what is still pending

Last updated 31 Oct 2026, branch `feature/customer-app-masters`.

## Blocking launch

| # | Item | Why it blocks | Owner action |
|---|---|---|---|
| 1 | **Web deploy (owner decides when)** | Nothing is deployed from here — the customer app ships as an APK. Guest RSVP links (`/rsvp/…`) open in a browser only once the owner deploys this build to sambramoh.vercel.app; phones also need `/api/anchor` (today they reach the laptop API on Wi-Fi). | Owner's deploy |
| 2 | ~~Apply migration 191~~ | Applied 27 Oct; `check-rsvp-live.mjs` passes 17/17. | Done |
| 2b | ~~Apply migration 192~~ (guest care & style circles) | Applied 28 Oct; `check-guest-care-live.mjs` passes 19/19 and `check-rsvp-live.mjs` still passes 17/17. | Done |
| 2c | **Apply migration 196 — SECURITY, urgent** | 195 (the new cancellation ladder) is live. Testing it showed a signed-out caller could cancel ANY booking line by its id (081's guard went NULL for a caller with no session, and anon had EXECUTE). 196 requires a session, makes the guard NULL-proof, limits quotes to the customer / accepted master / staff, and revokes anon. Verify with `node --env-file=.env scripts/check-cancel-security-live.mjs` → all good. | Paste `196_cancel_only_your_own_booking.sql` |
| 2c2 | **Apply migration 197 — request → accept → pay** | Checkout now SENDS requests: each master gets one exclusive request with a reply-by time (30 min if the event is within 2 days, 2 h within a week, else 6 h, never ending 22:00–08:00 IST); a decline or lapse hops to the next priced backup by itself (pg_cron, every minute), and the customer pays from My Bookings once a master accepts. Until 197 is pasted the server falls back to the old instant hold, so nothing breaks — but the new flow is off. | Paste `197_request_then_accept_then_pay.sql`; then the 089 cron URL must point at the new deployment |
| 2d | **Lawyer review + Grievance Officer** | `src/customer/data/policies.js` (terms, cancellation & refunds, privacy, supply rules) is a careful draft, not legal advice; the E-Commerce Rules 2020 require a named Grievance Officer in the app. | Review; fill `GRIEVANCE` |
| 2e | **Deploy the API before taking real payments** | List pricing, offers at checkout and the per-trade advance live in `api/` (create-booking-payment, anchorBook, accept-custom-quote, bookingCapture, routeTransfers). The APK uses the laptop server, but Razorpay's webhook goes to production, which still runs the OLD capture code: it would size a Route partner's on-hold transfer on the quote, not on what the customer owes. `confirm-payment` (new code) records the offer either way. | Deploy (owner) |
| 2f | **Invoicing model and GST, with a CA** | Customer price = partner price + Sambramo margin (`api/_lib/listPrice.js`). Who invoices the customer (partner as marketplace, or Sambramo as seller) decides whether GST is on the margin or on the whole booking, and whether shown prices must include it. Sambramo needs GST registration as an e-commerce operator from day one (TCS 1%). | `docs/SAMBRAMO-PRICING-PAYMENTS-TAX.pdf` §7 |
| 2g | **Balance reminders and unpaid-balance cancellation** | Bookings ≥ ₹25,000 can be paid as an advance; the balance is due 7 days before the event (`PAY_RULES`). Nothing yet reminds the customer or cancels an unpaid balance. | Build a scheduled job |
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
