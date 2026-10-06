# A place to break things

Right now there is **one** Supabase project and **one** deployment. Every
check, capture and repro script writes to the same database real
customers use, and the only way to test a change is to ship it. That is
why the last two days produced two outages that you found rather than
any check.

This sets up a second environment. Your part is steps 1–4 and takes about
ten minutes; everything after that is scripted.

---

## 1 · Create the project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**

| | |
|---|---|
| Name | `sambramo-sandbox` |
| Region | **Southeast Asia (Singapore)** — same as production, so timings match |
| Password | anything; save it |

Free tier is fine. This database holds nothing real.

---

## 2 · Run the schema

Generate the files:

```bash
node scripts/build-sandbox-sql.mjs
```

That writes four parts to `supabase/sandbox/`. In the sandbox project's
**SQL Editor**, paste and run each one **in order**:

```
part-01_001-026.sql
part-02_027-033.sql
part-03_034-061.sql
part-04_062-088.sql
```

Order is the contract — 057 creates PostGIS, 072 defines
`create_booking_request`, 086 rewrites `match_partners`, 088 widens a
CHECK that 058 created. If a part errors, stop and send me the message
with the part number: the header of each file lists exactly which
migrations are inside it.

---

## 3 · Give the scripts the keys

Sandbox project → **Settings → API**. Copy into a new `.env.sandbox` at
the repo root (it is gitignored):

```
VITE_SUPABASE_URL=https://<your-sandbox-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Copy the rest from `.env` — Razorpay **test** keys only, never the live
ones. `.env.sandbox.example` lists every key that matters.

Then every script points at it with one variable:

```bash
SAMBRAMO_ENV=sandbox node scripts/check-dispatch-live.mjs
```

Nothing else changes. No flags to remember, no risk of a check writing to
production because I forgot one.

---

## 4 · Point preview deploys at it

Vercel → project → **Settings → Environment Variables**. Add the three
sandbox values above, scoped to **Preview only** (untick Production).

Vercel already builds a preview for every branch that is not
`feature/without-shopping`. With this, those previews run the full app
against the sandbox database — a real URL, on a real deployment, that
cannot touch a real booking.

---

## What I do once you have done that

- Seed the partner network and pincodes into the sandbox
- Run the whole check suite against it by default, so a check can never
  again write to the database customers use
- Work on a branch, verify on its preview URL, and only then merge to
  `feature/without-shopping`

---

## What this would have caught

Both outages, before you saw either of them.

**The 500 on every booking.** `radius_km` had `CHECK (BETWEEN 1 AND 25)`
while the client asked for 60. `check-dispatch-live.mjs` books something
for real — against a sandbox it would have run on the branch, failed, and
never reached you.

**The dead "Find my masters" button.** Unreachable because a new step
collided with the matching board's index. `repro-dispatch.mjs` presses
the actual button; on a preview URL it fails in seconds.

Neither needed a new idea. They needed somewhere to run that was not
production.
