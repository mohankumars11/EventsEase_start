# Launch: offers, pricing and policies — decisions and open items

Written 28 Oct 2026 for the launch next week. Each item says what the app does today and what still needs a decision from Mohan.

## 1. The welcome offer: 25% off, capped

**Recommendation: 25% off the first booking, up to ₹1,500, on orders above ₹2,000, valid 30 days, one per person/phone.**

- Event bookings are large: one caterer can be ₹50,000+, a wedding plan several lakh. An uncapped 25% would hand back more than Sambramo earns on the booking. Swiggy, Zomato and Zepto all cap their first-order offers ("60% off up to ₹120"); the cap is what makes a big headline number affordable.
- ₹1,500 is a meaningful saving on a typical birthday or housewarming (₹6,000–₹20,000), which is where first bookings come from. It stays below the platform's margin on most such bookings, so it is acquisition cost, not loss.
- Keep the number large and the cap small on screen: "25% OFF" is the hook; "up to ₹1,500" is in the line under it, as every app does it.
- Revisit after 4–6 weeks of data: if conversion is strong, lower the cap. If weddings dominate, add a separate wedding offer (for example a flat ₹5,000 off above ₹1 lakh).

**In the app now:** "25% off" everywhere the old 10% was. A real `WELCOME25-…` voucher is issued at sign-up (welcome scratch card) and shown in Rewards and at checkout.

**Not yet:** the discount is **not taken off the payment**. `api/create-booking-payment.js` charges the masters' prices, and the webhook and escrow reconcile against them. Applying it needs a decision first: **who funds it** (Sambramo from its fee — recommended — or the master). Then the server change is:

1. apply the voucher when the payment order is created;
2. record a `platform_discount` line in the ledger;
3. pay the master their full price.

The cap and minimum live in one place (`src/customer/lib/rewards.js` → `WELCOME`).

## 2. Invitations / RSVP pricing

- List price **₹299** per premium invitation: 1,000+ designs, WhatsApp RSVP, live headcount, guest care, style circles.
- A new customer's **first invitation is free** (the `RSVPFREE-…` voucher from the welcome scratch card). It is shown at the invitation's checkout as ₹299 − ₹299 = ₹0, and the voucher is marked used.
- **During launch every invitation is free** ("Launch offer"), because the app has no invitation payment flow. Charging for later invitations needs a small payment endpoint like the booking one.
- Paid add-ons come from real masters at their own prices: pickups via Guest transport, a welcome desk via Hosts & ushers.

## 3. Referral

- A friend who joins gets the welcome rewards (25% off and a free invitation).
- The referrer's **₹500 credit** is shown as "starts with our launch". No customer credit ledger exists yet: refunds go back to the payment method, and the live referral programme (migration 158) is partner-to-partner.
- To pay it: add a customer credit ledger, and credit ₹500 when the referred friend's first event is marked complete. Never on sign-up alone, to stop fake accounts.

## 4. Cocktail parties and alcohol

- **Keep cocktail parties.** They are legal and common in Karnataka. The rule is about who supplies and serves alcohol, not about the party.
- **Sambramo and its masters must not sell, supply or buy alcohol for customers.** Bar masters provide mocktails, ice, glassware, bar set-up and trained bartenders.
- **Serving alcohol outside a licensed venue needs a temporary (occasional) licence** from the state Excise Department. Hotels and banquet halls with a bar licence cover it on their premises. Alcohol is prohibited outright in Gujarat, Bihar, Nagaland, Mizoram and Lakshadweep.
- **In the app now:** the "What masters supply" policy says all of this, and the terms make arranging any licence the host's responsibility.
- **Suggested next step:** on cocktail-party plans, show one line: "Serving alcohol? You arrange it and any licence; our bar masters bring everything else."

## 5. Cancellation & refund policy (what we chose, and why)

Strict on purpose, with three rules that keep it fair: everything back if the master fails, a short free window right after paying, and credit worth more than cash.

| When the customer cancels | Refund | Or as Sambramo credit |
|---|---|---|
| Before a master accepts | 100% | — |
| Within 15 min of paying (event ≥ 72 h away) | 100% | — |
| More than 15 days before | 50% | 90% |
| 7–15 days before | 25% | 50% |
| Less than 7 days | 0% | 20% |
| Within 48 h, or after it starts | 0% | — |

- Platform fee, gateway charges and made-to-order items are never refundable after acceptance.
- If a master cancels or doesn't turn up: 100% back, and we look for a replacement. No-shows must be reported within 2 hours; quality issues within 24 hours, with photos.
- Customer-side failures mean no refund: wrong address, no access, no power, missing permits, unsafe conduct.
- Disputes are decided on the booking record: timestamps, acceptance, check-in, in-app messages, photos. Customers are told to keep everything in the app.

**Evidence of agreement:** at OTP sign-in the app records who accepted, which policy version, when, and from which app and device, in `policy_acceptances` (migration 193). Customers can't edit or delete these records. The login screen says "By entering the OTP you agree to…", with each policy linked.

## 6. Before go-live — must do

1. **Have a lawyer review** `src/customer/data/policies.js` (consumer protection and IT law, India). It is a carefully drafted starting point, not legal advice.
2. **Fill in the Grievance Officer** (name, email, phone) in `policies.js`. The Consumer Protection (E-Commerce) Rules, 2020 require it, and it must be shown in the app.
3. **Paste migration 193** (consent records, vouchers, city interest). Until then:
   - consent is kept on the phone and sent on the next launch;
   - vouchers live only on that phone;
   - "notify me" for other cities is kept only on the phone.
4. **Decide who funds the 25%**, then wire it into the payment (section 1).
5. **The web deploy (owner's call).** Guest RSVP links, circle links and referral links open in a browser only after it.
