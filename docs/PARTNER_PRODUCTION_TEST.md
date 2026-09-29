# Sambramo Partner app: production test handover

For whoever tests the Partner app on a phone against the live backend. It says what to install, what has already been proven automatically, what to test by hand, and what is known to be incomplete.

## Install

- **Download:** https://github.com/mohankumars11/EventsEase_start/releases/download/partner-latest/sambramo-partner.apk
- **Which build:** `version.json` next to it, and the build stamp under More → Settings, name the exact commit. They must match the commit below.
- **Uninstall the old app first.** Every CI build is signed with a new debug certificate, and Android refuses to install over a different one ("App not installed"). Uninstalling clears the app's login and local data.
- **Backend:** the live Supabase project (`twpsgrmoqxemxhrzbfwd`). Every account and row you create is real data. Name test partners so they are easy to find and remove (for example `QA Mini Truck 01`).

<!-- build:start -->
Build: _filled in after CI_
<!-- build:end -->

## Database

Migrations 158–163 are applied and were checked against the live database on 2026-09-29:

| Migration | What it provides | Checked |
|---|---|---|
| 158 | Referral lifecycle, trade invitations | the functions answer |
| 159 | Server-side field validation on 12 partner tables | 48 direct-write checks |
| 160 | Eight logistics trades, SBM-TRD-027 to 034 | 34 active trades in `listing_trades` |
| 161 | `vendor_services.match_profile`, `booking_lines.match_requirements` | the columns exist |
| 162–163 | Matcher and dispatch wave using reconciled profiles, legacy fallback | the matcher answers with the 163 signature |

## The 34 trades

<!-- trades:start -->
Generated from code by `scripts/gen-partner-trade-table.mjs`. Price book 2026-09-29.1; customer logistics prices have a ₹500 floor and round to the nearest ₹50. Question groups are the trade-level ones; each offering adds its own, and Catering asks through its menu and cuisine flow instead (hence 0).

| Code | Trade | Database id | Trade-level question groups | Pricing |
|---|---|---|---|---|
| E01 | Catering & Food | SBM-TRD-005 | 0 | Partner price list (per item/unit), reviewed |
| E02 | Photography | SBM-TRD-014 | 5 | Partner price list (per item/unit), reviewed |
| E03 | Videography | SBM-TRD-024 | 3 | Partner price list (per item/unit), reviewed |
| E04 | Decoration & Floral | SBM-TRD-007 | 5 | Partner price list (per item/unit), reviewed |
| E05 | Venue | SBM-TRD-023 | 4 | Partner price list (per item/unit), reviewed |
| E06 | DJ & Music | SBM-TRD-006 | 2 | Partner price list (per item/unit), reviewed |
| E07 | Live Entertainment | SBM-TRD-012 | 2 | Partner price list (per item/unit), reviewed |
| E08 | Bridal Makeup & Hair | SBM-TRD-003 | 6 | Partner price list (per item/unit), reviewed |
| E09 | Wedding Planning | SBM-TRD-026 | 4 | Partner price list (per item/unit), reviewed |
| E10 | Tent & Furniture | SBM-TRD-020 | 2 | Partner price list (per item/unit), reviewed |
| E11 | Invitation & Printing | SBM-TRD-011 | 1 | Partner price list (per item/unit), reviewed |
| E12 | Event Cars & Guest Transfers (app: Transportation) | SBM-TRD-021 | 3 | Partner price list (per item/unit), reviewed |
| E13 | Event Lighting | SBM-TRD-008 | 1 | Partner price list (per item/unit), reviewed |
| E14 | Cake & Desserts | SBM-TRD-004 | 2 | Partner price list (per item/unit), reviewed |
| E15 | Mehendi Artist | SBM-TRD-013 | 3 | Partner price list (per item/unit), reviewed |
| E16 | Anchor & MC | SBM-TRD-001 | 3 | Partner price list (per item/unit), reviewed |
| E17 | Sound & AV | SBM-TRD-019 | 2 | Partner price list (per item/unit), reviewed |
| E18 | Valet Parking | SBM-TRD-022 | 1 | Partner price list (per item/unit), reviewed |
| E19 | Security Services | SBM-TRD-018 | 1 | Partner price list (per item/unit), reviewed |
| E20 | Bar & Beverages | SBM-TRD-002 | 2 | Partner price list (per item/unit), reviewed |
| E21 | Guest Services | SBM-TRD-010 | 2 | Partner price list (per item/unit), reviewed |
| E22 | Power & Cooling | SBM-TRD-015 | 2 | Partner price list (per item/unit), reviewed |
| E23 | Safety & Facilities | SBM-TRD-017 | 2 | Partner price list (per item/unit), reviewed |
| E24 | Priest & Rituals | SBM-TRD-016 | 3 | Partner price list (per item/unit), reviewed |
| E25 | Gifts & Favours | SBM-TRD-009 | 2 | Partner price list (per item/unit), reviewed |
| E26 | Trousseau & Gift Packing | SBM-TRD-025 | 4 | Partner price list (per item/unit), reviewed |
| L01 | Mini Truck / Pickup | SBM-TRD-032 | 3 | Trip: ₹900 incl. 10 km, ₹24/km after, payload surcharge |
| L02 | Medium / Large Goods Vehicle | SBM-TRD-031 | 3 | Trip by vehicle class, 15 km incl., ₹34/km, payload surcharge |
| L03 | Group Passenger Transport (app: Passenger Transport) | SBM-TRD-033 | 3 | Package by seats, 100 km incl., ₹24/km, driver allowance |
| L04 | Event Operations Equipment Rental (app: Event Equipment Rental) | SBM-TRD-028 | 3 | Day rate by quantity + delivery, setup, pickup |
| L05 | Loading & Unloading Crew | SBM-TRD-030 | 3 | ₹650/person per 8 h shift, overtime |
| L06 | Warehouse / Storage | SBM-TRD-034 | 3 | ₹22/sq ft/month + inbound, outbound |
| L07 | Bulk Event Materials (app: Event Materials Supplier) | SBM-TRD-029 | 3 | Minimum order ₹2500 + delivery, rush % |
| L08 | End-to-End Event Logistics | SBM-TRD-027 | 3 | Project fee from ₹6000 + coordination % |
<!-- trades:end -->

## Already proven automatically (before this build)

Every suite ran against the real app and the live database, with throwaway accounts that were deleted afterwards.

| Suite | Result |
|---|---|
| Rule matrix: 55 field rules, every test category that applies | 1046/1046 |
| Selenium field lab: every inventoried field in a real browser | 341/341 |
| Server validation: parity with the app, direct API writes, isolation | 48/48 |
| Referral lifecycle, live | 97/97 |
| Partner journey: six setup steps, Bank & Payments (UPI and bank account), More screens | 25/25 |
| **Logistics, live: L01 onboarding, then offer → accept → customer sees it** | **11/11** |
| 34-trade gates: registry V2, catalogue ids, catalogue integrity, 5B–5F security | pass |

The logistics suite (`node tests/selenium/run.mjs logistics`) walks through the whole flow:
1. A partner lists **Mini Truck / Pickup** through the real questionnaire. A rate of "1e3" is refused, and valid rates are accepted.
2. The partner signs and submits. The saved row carries the structured answers, the price book and a match profile with the payload capacity.
3. A request priced by the real L01 price book (25 km, 700 kg = ₹1,450) is offered to the approved partner.
4. The partner accepts it in the real Jobs screen, and the offer and the line both become accepted.
5. The customer's own session reads the accepted line.

## Test by hand on the phone

1. **Sign in** with a new email. The six setup steps appear, in order.
2. **Onboard one event trade** (for example Photography) and **one logistics trade** (for example L05 Loading & Unloading Crew). Answer every question, then reopen the listing from More → My services to confirm the answers are saved.
3. **Try wrong values** in each form: letters in phone and pincode, "1e3" in any number, a pasted long text. Each is refused with a message under the box, and nothing is saved.
4. **Bank & Payments:** save a UPI id, then switch to a bank account and save it. Reopen the step and it shows what you saved.
5. **More:** edit Business profile, Contact and Area. Leave the screen, come back, and the values are still there.
6. **Referral & rewards:** open a trade and create an invitation. Share it with the Android share sheet.
7. **Jobs:** only an **approved** partner sees and accepts offers, and approval is done by an operator. With a real customer booking on the customer app, accept the offer and confirm the customer sees it.
8. **Android back button** on every screen above: it goes back one level and never leaves the app from inside a flow.

## Known limits

- **Jobs counter before approval:** an unapproved partner sees the "New jobs" counter and "1 new opportunity" while the offer list itself (by design) only appears after approval. The counter should either wait for approval or explain why the job cannot be opened.
- **Customer app:** the separate customer branch's booking fix (PR #9) is not part of this build and has not been verified here. Until it is, a real customer-to-partner booking depends on it.
- **Device-only behaviour** was not exercised by the automated suites: the Android keyboard, the share sheet, the hardware back button and push notifications.
- **Not checked by the server:** listing answers stored inside a service's JSON specs (per-menu rates, "something else" answers) are checked by the app and the listings team's review.
