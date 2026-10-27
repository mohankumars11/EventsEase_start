# Sambramo customer app — what is still pending

Last updated 27 Oct 2026, branch `feature/customer-app-masters`.

## Blocking launch

| # | Item | Why it blocks | Owner action |
|---|---|---|---|
| 1 | **Deploy this branch to sambramoh.vercel.app** | Production still serves `feature/without-shopping`. RSVP links (`/rsvp/…`) and the customer web app only work once this build is live there; phones also need `/api/anchor` (today they reach the laptop API on Wi-Fi). | Approve a deploy |
| 2 | **Apply migration 191** (Invitations & RSVP) | Invites screens show "not switched on yet" until it is pasted. Then run `node --env-file=.env scripts/check-rsvp-live.mjs`. | Paste SQL |
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
