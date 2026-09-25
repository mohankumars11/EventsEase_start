# Migration 153 — paste this before using the bell

`supabase/migrations/153_a_notification_you_can_act_on.sql`

## What it does

Extends the `partner_notifications` table migration 125 built. Nothing
is replaced and no policy is loosened.

| Column | Why |
|---|---|
| `is_archived` | So a notification can be put away. **Never a DELETE** — see below. |
| `priority` | `critical > high > normal > low > marketing`. A campaign must never outrank an unanswered job. |
| `expires_at` | "4 customers asked about 12 October" is worth reading on the 1st and is noise on the 13th. |
| `metadata` | Operator-side context, never shown to the partner. |

It also widens the `kind` check with `marketing` and `referral`, rebuilds
the unread index to account for archiving, and teaches the column guard
one new writable field.

## Why archive is not delete

Two reasons, both load-bearing:

1. **`calendarSweep.js` uses this table as its own dedupe ledger.** It
   decides whether to nudge a partner by querying the rows it has
   already sent. A deleted row makes the system forget it spoke — and it
   says the same thing again a day later.
2. It is the only record that a partner was told something *before*
   their account changed. Somebody will need that one day.

## What a partner can write, after 153

Exactly two columns: `read_at` and `is_archived`.

Everything else — title, body, href, priority, expires_at, metadata,
vendor_id — is forced back from `OLD` by the guard trigger. A partner
cannot retitle a notification, cannot repoint its link at another
screen, cannot bury one by re-ranking it, and cannot move it to another
vendor.

That is asserted, not assumed: `node scripts/check-notification-center.mjs`
runs the live half as a signed-out caller and confirms it reads none of
the rows, cannot mark one read and cannot write one.

## If you do not paste it

The app still works. Every query that names a new column detects the
error and retries with 125's columns, so:

- the inbox still lists, still marks read, still deep-links
- the badge still counts correctly
- **the archive button fails** and says so: "Putting notifications away
  is not switched on for this account yet."

That is the only thing you lose.
