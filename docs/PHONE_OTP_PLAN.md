# Phone OTP — deferred until launch

**Decision, 2026-09-10:** stay on email OTP. Switch the partner app to phone
+ OTP when the admin and customer apps are ready to launch.

The reasoning: email costs nothing, works today, and the partner network is
still test data. Phone OTP buys conversion at scale — a decorator not having
to leave the app for their inbox — which matters at 500 partners, not at 7.

This file exists so the switch really is quick. The only item with a
multi-week clock is DLT; everything else is a day or two.

---

## The one thing to start early

**DLT registration — 1 to 2 weeks, and nothing else is blocked by it.**

India requires every A2P SMS sender to be registered on a telco DLT platform
(Jio, Airtel, VI, BSNL). Unregistered traffic is dropped, not delayed.

  - register as a **Principal Entity** — company PAN, GST, incorporation
    documents, authorised signatory
  - register a **Header** (sender ID, 6 characters, e.g. `SMBRMO`)
  - register **content templates** — the OTP text with variables. The sent
    message must match a registered template or the telco drops it

Start this the moment launch is on the calendar. A, B, C and D below can all
be built and tested against email OTP while it clears, then flipped over in
an afternoon.

---

## A · Swap the door to phone   (~half a day)

The plumbing already exists and is unused:

```js
sendPhoneOtp(phone)      → supabase.auth.signInWithOtp({ phone })
verifyPhoneOtp(p, token) → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
```

in `src/context/AuthContext.jsx`. `profiles.phone` exists, `authUser.phone` is
already read into the profile on creation, and `SignupPage` already normalises
to `+91`.

`src/pages/partner/PartnerEntry.jsx` is already the right two screens —
identifier, then six digits, with a resend timer and Change. It changes which
function it calls and what the field is labelled. Email drops to optional, for
payout notifications.

**Identity holds without new schema.** Supabase phone auth enforces one auth
user per number, and `027_vendors_profile_id_unique.sql` enforces one vendor
per profile. One number is one partner, already.

**The role needs no change.** `intendedRole()` reads the surface, not the
sign-in method — whoever opens the partner app is a master however they got in.

## B · Wipe the test network   (before the switch, not after)

So that every number in the system is real from day one. As of 2026-09-10:

| table | rows |
|---|---|
| vendors | 228 — 221 synthetic, 7 test accounts |
| profiles | 20 — 1 admin, 13 customer, 6 vendor |
| booking_requests / lines / dispatch_offers | 109 / 244 / 1119 |

None of it is genuine. Write it as a script with a dry run, like
`scripts/release-stuck-listings.mjs`.

## C · Auto-read the OTP   (the "Waiting to auto read OTP" screen)

Google's **SMS Retriever API**. Two traps:

  - the SMS must end with an **11-character app hash** derived from the
    package name **and the signing certificate** — so it differs between
    debug and release builds
  - that hash has to be inside the **DLT-registered template**, so decide it
    BEFORE registering templates or they have to be registered again

Needs a Capacitor plugin (community ones exist) or a small custom one.
`autocomplete="one-time-code"` alone is not enough in an Android WebView.

## D · Throttle before launch, not after

Every send costs money, including resends. Per-number and per-IP caps. A
resend loop with no ceiling is a bill, and it is the only way this gets
expensive.

---

## Cost, for the record

| item | typical |
|---|---|
| DLT Principal Entity | ~₹5,000 one-time (varies by operator) |
| Header / templates | free–₹1,000 |
| SMS via Indian aggregator (MSG91, Gupshup, Kaleyra) | ₹0.15–0.25 each |
| SMS via Twilio | ₹1.5–4 each |

Twilio is what Supabase supports natively; an Indian aggregator is ~10x
cheaper and needs Supabase's **Send SMS Hook** instead. At 1,000 partners and
three OTPs a year that is about ₹600 either way — the cost only matters if
D is skipped.

Confirm figures with the provider; they move.

---

## While we are on email — the live risk

**Supabase Auth email does NOT use the `SMTP` value in `.env`.** That one is
for the app's own mail. Auth mail goes through Supabase's built-in sender
unless custom SMTP is set in the dashboard:

    Project Settings → Auth → SMTP Settings

The built-in sender is rate limited to a handful per hour and is explicitly
not for production. If it is not configured, **partner sign-ups start failing
silently** the moment several people join in the same hour — which is exactly
what a recruiting push looks like.

Free tiers well past this volume: Resend, AWS SES, Brevo. This is the one
thing worth checking before relying on email through launch.
