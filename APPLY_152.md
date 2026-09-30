# What to run, and in what order

## 1 · One migration

Paste `supabase/migrations/152_aadhaar_is_not_the_only_id.sql` into the
Supabase SQL editor. Everything from 130 to 151 is already applied — I
checked the live database, not the folder.

152 does two things:
- widens `vendor_documents.kind` with `voter_id` and `passport`
- adds `vendors.identity_document` so the ID choice survives a reload

Without it the app still runs. Picking Voter ID or Passport and then
uploading is the only thing that breaks, and it breaks loudly.

## 2 · Optional — turn enforcement on now

Every `verification_policy` row says `mandatory_from = 2026-11-01`, which
is why every requirement currently reads **"Nothing here is being
enforced yet"**. That is the table working, not failing.

To see the enforced behaviour today:

```sql
UPDATE public.verification_policy
   SET mandatory_from = CURRENT_DATE
 WHERE mandatory_from = DATE '2026-11-01';
```

To put it back:

```sql
UPDATE public.verification_policy
   SET mandatory_from = DATE '2026-11-01'
 WHERE mandatory_from = CURRENT_DATE;
```

Leave it alone unless you want to test it. A partner who cannot finish
onboarding because a rule came into force early is a real partner lost.

## 3 · Start the API server, and leave it running

```
node --env-file=.env scripts/serve-api-local.mjs
```

This is what makes document classification actually work. Without it,
the apk calls `https://sambramoh.vercel.app/api/verify-document`, which
returns **404** because that host deploys from a branch without the
file — so every document is accepted unchecked.

It prints the address the apk is built against:

```
VITE_API_ORIGIN=http://192.168.1.21:4000
```

**Windows will ask to allow node through the firewall. Say yes to
Private networks.** Without it the phone gets a connection timeout and
the app falls back to human review, silently.

### Before you install, check from the phone's browser

```
http://192.168.1.21:4000/health
```

You want `{"ok":true,...}`. If that does not load, nothing else will:

| What you see | What it is |
|---|---|
| Page does not load at all | Firewall, or the phone is on mobile data |
| Loads on the laptop but not the phone | Different wifi networks |
| Worked yesterday, not today | The laptop's IP changed. Re-run the server, it prints the new one, then rebuild |

## 4 · What you should actually see

**Upload a photo of anything that is not a document** — your laptop, a
wall, a screenshot — under any ID.

Expect, after ten to fifteen seconds:

> That looks like a laptop on a desk, not an Aadhaar card. Please
> photograph the document itself.

and **the upload does not happen**. That is the refusal that did not
exist before.

The ten to fifteen seconds is real and is the free model thinking. The
screen says "Reading…" while it does.

### What it will NOT say

It will never say "Government Verified", because nothing here asks a
government anything. It classifies the photograph and reads what is
printed on it. A licensed KYC aggregator is the only route to that
badge and the code already refuses to print it without one.

## 5 · Where each ID stands

| ID | The number | The photo |
|---|---|---|
| Aadhaar | Verhoeff check digit, checked as you type | classified |
| Driving licence | state + RTO + issue year, checked as you type | classified |
| Voter ID | shape only — the ECI has no public check | classified |
| Passport | shape only — check digits are in the MRZ | classified |

Voter ID and passport carry `verificationProvider: null` on purpose.
That is the thing that makes it impossible for either to render as
government verified, whatever else changes.
