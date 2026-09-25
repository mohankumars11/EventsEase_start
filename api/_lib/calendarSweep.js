/**
 * Tell a partner their calendar has run out.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT ITS OWN CRON
 * ══════════════════════════════════════════════════════════════════════
 *
 * vercel.json holds exactly one cron entry, and CRON_NOTE.md explains
 * why: on Hobby, a second schedule fails the DEPLOY, not the run. So
 * this is a function the existing daily pass calls at the end, after the
 * work a customer is actually waiting on.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULES THAT KEEP THIS FROM BECOMING SPAM
 * ══════════════════════════════════════════════════════════════════════
 *
 * A notification that arrives when nothing is wrong is worse than none:
 * the partner mutes the channel, and the channel is also how they hear
 * about a job. Four rules, all enforced here rather than trusted:
 *
 *   1. Only a partner whose calendar genuinely runs out inside the
 *      window. `coverageOf` decides, and it is the same function the
 *      in-app card uses, so the two can never disagree.
 *
 *   2. A standing weekly rule counts as having told us. Somebody who
 *      said "never Sundays" has described every Sunday there will be.
 *
 *   3. At most one every QUIET_DAYS, checked against the notification
 *      the last run wrote. Not a flag somewhere else that can drift out
 *      of step with what was actually sent.
 *
 *   4. Only partners who are approved and accepting jobs. Telling
 *      somebody mid-review to fill in their calendar is asking them to
 *      prepare for work that is not coming yet.
 *
 *   5. Never a partner who turned this off. `partner_notification_prefs.
 *      calendar` arrives in migration 148, defaulting to true; only an
 *      explicit false is honoured, and a failed read of that table stops
 *      the sweep rather than assuming consent.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT NEVER DOES
 * ══════════════════════════════════════════════════════════════════════
 *
 * It never writes to vendor_availability. A partner's calendar is their
 * statement about their own life, and a background job that filled in
 * blanks on their behalf would be the app making commitments for them.
 */
/* Through the bundle, not from src/ directly. `src/` uses extensionless
   relative imports, which Vite resolves and Node's ESM resolver does
   not -- see the header of scripts/build-api-bundle.mjs, which exists
   because importing src/ from a handler threw at import time in
   production while working perfectly in development. */
import { coverageOf, ALERT_LEVEL as LEVEL } from './pricing.bundle.js'

/** No partner hears from this more often than once a week. */
export const QUIET_DAYS = 7

/**
 * How long each severity stays quiet, in days.
 *
 * An empty calendar is a partner who cannot be offered anything at all,
 * and is worth a weekly sentence. A calendar that is merely thin is
 * worth a monthly one -- nudging somebody who has already stated three
 * months every week is how a reminder becomes a thing people switch
 * off, and they switch off the whole channel, including the week it
 * mattered.
 */
export const QUIET_FOR = {
  empty: 7,
  short: 14,
  thin: 30,
}

/* The widest window any severity asks for. The query has to reach back
   at least this far or the per-severity checks below are reading an
   empty result and concluding nobody has been told. */
export const LOOKBACK_DAYS = Math.max(...Object.values(QUIET_FOR))

const daysBetween = (fromISO, toISO) =>
  Math.round((new Date(`${toISO}T00:00:00Z`) - new Date(`${fromISO}T00:00:00Z`)) / 86_400_000)

/** How many to warn in one pass. A sweep that wakes the whole city at
 *  03:00 is a sweep somebody turns off. */
export const SWEEP_LIMIT = 200

const istTodayISO = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

/**
 * @param db  service-role Supabase client, from the caller
 * @param notify  optional (db, {vendorIds, title, body, url}) push sender
 */
export async function sweepCalendarCoverage(db, notify = null) {
  const todayISO = istTodayISO()
  const result = { checked: 0, stale: 0, notified: 0, pushed: 0, skipped: {} }

  const bump = k => { result.skipped[k] = (result.skipped[k] ?? 0) + 1 }

  /* Rule 4. `accepting_jobs` is the partner's own switch: somebody who
     has turned themselves off does not need chasing about dates. */
  const { data: vendors, error: vErr } = await db
    .from('vendors')
    .select('id, profile_id, calendar_reviewed_through')
    .eq('is_verified', true)
    .eq('accepting_jobs', true)
    .limit(SWEEP_LIMIT)

  if (vErr) return { ...result, error: vErr.message }
  if (!vendors?.length) return result

  const ids = vendors.map(v => v.id)

  /* Three reads for the whole batch rather than three per partner. */
  const [availRes, rulesRes, recentRes, prefsRes] = await Promise.all([
    db.from('vendor_availability')
      .select('vendor_id, slot_date, status')
      .in('vendor_id', ids).gte('slot_date', todayISO),
    db.from('vendor_weekly_rules')
      .select('vendor_id, weekday, is_available, effective_from, effective_to')
      .in('vendor_id', ids),
    db.from('partner_notifications')
      .select('vendor_id, created_at')
      .in('vendor_id', ids)
      .eq('kind', 'calendar')
      /* Wide enough for the LONGEST quiet window, not just the shortest.
         This looked back QUIET_DAYS, which is right for an empty
         calendar and far too short for a thin one -- a partner told
         eight days ago would have looked untold, and the 30-day silence
         a thin calendar is meant to get would never have held. */
      .gte('created_at', new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString()),
    /* Rule 5, added last and arguably the most important: a partner who
       switched this off must actually have it off. Only rows that say
       `calendar = false` are collected -- the column defaults to true
       and a partner who has never opened the settings screen has no
       row at all, which is a silence meaning yes. */
    db.from('partner_notification_prefs')
      .select('vendor_id, calendar')
      .in('vendor_id', ids)
      .eq('calendar', false),
  ])

  /* A failed read is not an empty calendar. Warning every partner in the
     city that their calendar is empty, because a SELECT timed out, is
     the single worst thing this file could do. */
  if (availRes.error) return { ...result, error: availRes.error.message }

  const byVendor = {}
  for (const row of availRes.data ?? []) {
    ;(byVendor[row.vendor_id] ??= {})[row.slot_date] = row
  }
  const rulesFor = {}
  for (const r of rulesRes.data ?? []) (rulesFor[r.vendor_id] ??= []).push(r)

  /* When each partner was last told, not merely whether. The Set could
     answer "inside seven days"; graded silences need the date. Newest
     wins, because a partner told twice should be judged on the second. */
  const toldAt = {}
  for (const r of recentRes.data ?? []) {
    const day = String(r.created_at).slice(0, 10)
    if (!toldAt[r.vendor_id] || day > toldAt[r.vendor_id]) toldAt[r.vendor_id] = day
  }
  const recentlyTold = new Set(
    Object.entries(toldAt)
      .filter(([, day]) => daysBetween(day, todayISO) < QUIET_DAYS)
      .map(([id]) => id))
  /* A failed prefs read must not become "everybody said yes". If the
     column is missing because 148 has not been pasted, the error is a
     42703 and NOBODY is swept -- silence is the safe direction when the
     question is whether somebody consented to be messaged. */
  if (prefsRes.error) return { ...result, error: prefsRes.error.message, hint: 'apply migration 148' }
  const optedOut = new Set((prefsRes.data ?? []).map(r => r.vendor_id))

  const due = []
  for (const v of vendors) {
    result.checked++

    if (optedOut.has(v.id)) { bump('opted_out'); continue }                  // rule 5
    if (recentlyTold.has(v.id)) { bump('told_recently'); continue }          // rule 3

    /* The partner pressed "I am open until then" and meant it. */
    if (v.calendar_reviewed_through && v.calendar_reviewed_through > todayISO) {
      bump('confirmed_open'); continue
    }

    const coverage = coverageOf({
      availability: byVendor[v.id] ?? {},
      weeklyRules: rulesFor[v.id] ?? [],                                     // rule 2
      todayISO,
    })

    /* ── Graded, rather than one threshold ─────────────────────────
       This fired only at LEVEL.WARN, which needs an empty calendar or
       one stopping inside a fortnight. So a partner with two months
       stated -- comfortably short of the six the matching engine can
       use, and losing every wedding booked further out -- was told
       nothing at all, for ever, because they were not quite bad enough
       to trip a boolean.

       Severity is how far behind they are; the quiet window below is
       how often that earns a sentence. An empty calendar is worth
       hearing about weekly. A calendar that is merely thin is worth
       hearing about monthly, and pretending otherwise is how a
       reminder becomes something people turn off. */
    const stated = Object.keys(byVendor[v.id] ?? {}).filter(d => d >= todayISO).length
    const hasWeek = (rulesFor[v.id] ?? []).length > 0
    const severity = !stated && !hasWeek ? 'empty'
      : coverage.fraction >= 1 ? 'ok'
      : coverage.fraction >= 0.5 ? 'thin'
      : 'short'

    if (severity === 'ok') { bump('calendar_is_current'); continue }          // rule 1

    /* Rule 3 is applied above as one window for everybody. This narrows
       it per severity: `recentlyTold` already excludes anyone spoken to
       inside QUIET_DAYS, so a thin or short calendar additionally needs
       its own longer silence, checked against the same sent-row ledger. */
    const quietFor = QUIET_FOR[severity]
    const lastTold = toldAt[v.id] ?? null
    if (lastTold && daysBetween(lastTold, todayISO) < quietFor) {
      bump('told_recently'); continue
    }

    result.stale++
    due.push({ vendor: v, coverage, severity })
  }

  if (!due.length) return result

  /* The body is coverage.says — the same sentence the in-app card shows,
     because a push that words it differently from the screen it opens is
     a push the partner distrusts. */
  const rows = due.map(({ vendor, coverage }) => ({
    vendor_id: vendor.id,
    kind: 'calendar',
    title: coverage.throughISO
      ? 'Your calendar stops soon'
      : 'Your calendar is empty',
    body: coverage.says,
    href: '/dashboard/vendor?tab=availability',
  }))

  const { error: insErr } = await db.from('partner_notifications').insert(rows)
  if (insErr) {
    /* Migration 148 widens the `kind` CHECK to allow 'calendar'. Until it
       is applied this insert is rejected, and that is a state worth
       reporting rather than throwing: the rest of the cron pass already
       succeeded. */
    return { ...result, error: insErr.message, hint: 'apply migration 148' }
  }
  result.notified = rows.length

  if (notify) {
    const sent = await notify(db, {
      vendorIds: due.map(d => d.vendor.id),
      title: 'Your calendar needs a few dates',
      body: 'Tell us the days you can work and we will send you jobs on them.',
      url: '/dashboard/vendor?tab=availability',
    })
    result.pushed = sent?.sent ?? 0
  }

  return result
}
