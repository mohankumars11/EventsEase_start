import { supabase } from './supabase'
import { isMissingTable } from './serviceCatalog'

/**
 * The partner's inbox: what happened, what they said, and what they want
 * to be woken up for (migration 125).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ABSENT-TABLE TOLERANCE, AGAIN AND ON PURPOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations here are applied by hand in the Supabase dashboard, so "the
 * code is deployed and 125 is not pasted yet" is a normal state that
 * lasts as long as it takes somebody to open a browser tab. Every read
 * answers `{ unavailable: true }` rather than throwing, and the screen
 * hides the section rather than showing a partner a red box about a
 * thing they cannot fix. Same call `partnerDocuments.js` made for 093.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE FABRICATES A ROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no seeding, no "welcome to Sambramo" notification written by
 * the client, and no sample thread. An empty inbox is shown as empty. A
 * feed that invents its own first entry teaches a partner that the
 * entries are decoration, which is the opposite of what a feed is for.
 */

const NOTIFICATIONS = 'partner_notifications'
const MESSAGES = 'partner_messages'
const PREFS = 'partner_notification_prefs'

const EMPTY_FEED = { rows: [], unread: 0, unavailable: false }

/**
 * Newest first, capped — nobody scrolls a year of these.
 *
 * ── `unread` here is the count IN THIS PAGE, and that is a trap ──────
 * It always was, and it was read as the real count. The dashboard asked
 * for `fetchNotifications(vendorId, 1)` to get a badge number, which
 * fetched exactly one row and counted the unread ones among that one --
 * so the badge could only ever say 0 or 1, and the "9+" branch in
 * JobsHeader was unreachable code.
 *
 * It is kept, because a list that has just been fetched knows how many
 * of the rows on screen are unread and that is a real question. For the
 * badge, use `unreadNotificationCount` below, which asks the database.
 *
 * 153 adds `is_archived`; a database without it still answers, because
 * the filter is applied only when the column is there — see `onlyLive`.
 */
export async function fetchNotifications(vendorId, limit = 40, { includeArchived = false } = {}) {
  if (!vendorId) return EMPTY_FEED

  let q = supabase
    .from(NOTIFICATIONS)
    .select('id, kind, title, body, line_id, href, read_at, created_at, is_archived, priority, expires_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeArchived) q = q.eq('is_archived', false)

  let { data, error } = await q

  /* ── 153 not pasted yet ─────────────────────────────────────────
     Migrations here are applied by hand, so there is always a window
     where the columns do not exist. Postgres answers a select naming a
     missing column with 42703, and the whole inbox would read as
     "unavailable" -- which is a lie: the notifications are there, we
     just asked for too much. Retry with 125's columns. */
  if (error && isMissingColumn(error)) {
    const fallback = await supabase
      .from(NOTIFICATIONS)
      .select('id, kind, title, body, line_id, href, read_at, created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(limit)
    data = fallback.data
    error = fallback.error
  }

  if (error) return { rows: [], unread: 0, unavailable: isMissingTable(error) }

  const now = Date.now()
  const rows = (data ?? []).filter(r =>
    !r.expires_at || new Date(r.expires_at).getTime() > now)

  return { rows, unread: rows.filter(r => !r.read_at).length, unavailable: false }
}

/** A column this database does not have yet, as opposed to a bad query. */
const isMissingColumn = err =>
  err?.code === '42703' || /column .* does not exist|schema cache/i.test(err?.message ?? '')

/**
 * How many unread notifications there actually are.
 *
 * A `head: true` count, because the badge is a number about the whole
 * table and cannot be derived from a page of it. This is the fix for a
 * badge that could only ever read 0 or 1.
 *
 * Returns null rather than 0 when it cannot tell. A bell showing no
 * badge because the request failed and a bell showing no badge because
 * there is nothing waiting look identical to a partner, and only one of
 * them is true — so the caller gets to know the difference.
 */
export async function unreadNotificationCount(vendorId) {
  if (!vendorId) return 0

  const base = () => supabase
    .from(NOTIFICATIONS)
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .is('read_at', null)

  let { count, error } = await base().eq('is_archived', false)
  if (error && isMissingColumn(error)) ({ count, error } = await base())

  if (error) return null
  return count ?? 0
}

/**
 * Put one away. Never deletes it.
 *
 * This table is the calendar sweep's own dedupe ledger -- it decides
 * whether to nudge a partner by querying the rows it has already sent --
 * so destroying a row would make the system forget it had spoken and
 * repeat itself a day later. It is also the only record that a partner
 * was told something before their account changed.
 *
 * 153's guard leaves `is_archived` writable by the partner and snaps
 * every other column back, so this sends exactly the one field.
 */
export async function archiveNotifications(ids) {
  if (!ids?.length) return { ok: true }
  const { error } = await supabase
    .from(NOTIFICATIONS)
    .update({ is_archived: true })
    .in('id', ids)
  if (error) {
    return {
      ok: false,
      error: error.message,
      /* Said apart from other failures: "apply migration 153" is a
         different instruction from "try again". */
      unsupported: isMissingColumn(error),
    }
  }
  return { ok: true }
}

/**
 * Mark them read.
 *
 * `read_at` is the only column the partner's UPDATE policy lets through
 * — migration 125 forces every other one back to its old value — so this
 * sends exactly that and nothing else.
 */
export async function markNotificationsRead(ids) {
  if (!ids?.length) return { ok: true }
  const { error } = await supabase
    .from(NOTIFICATIONS)
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/* ═══════════════════════════════════════════════════════════
   Messages
═══════════════════════════════════════════════════════════ */

/**
 * The whole thread, oldest first, because that is the order a
 * conversation is read in.
 */
export async function fetchMessages(vendorId, limit = 100) {
  if (!vendorId) return { rows: [], unavailable: false }

  const { data, error } = await supabase
    .from(MESSAGES)
    .select('id, line_id, sender, body, read_at, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return { rows: [], unavailable: isMissingTable(error) }
  return { rows: data ?? [], unavailable: false }
}

/**
 * Say something.
 *
 * `sender` is not sent. The trigger in 125 stamps it 'partner' for
 * anybody who is not an operator, so a client that tried to claim
 * otherwise would be corrected by the database rather than trusted —
 * which is where that decision belongs.
 */
export async function sendMessage(vendorId, body, lineId = null) {
  const text = String(body ?? '').trim()
  if (!vendorId || !text) return { ok: false, error: 'Nothing to send.' }
  /* Matches the CHECK constraint rather than letting the insert fail
     with a constraint name a partner cannot read. */
  if (text.length > 4000) return { ok: false, error: 'That is too long to send in one message.' }

  const { data, error } = await supabase
    .from(MESSAGES)
    .insert({ vendor_id: vendorId, body: text, line_id: lineId, sender: 'partner' })
    .select('id, line_id, sender, body, read_at, created_at')
    .single()

  if (error) return { ok: false, error: error.message, unavailable: isMissingTable(error) }
  return { ok: true, row: data }
}

/* ═══════════════════════════════════════════════════════════
   Preferences
═══════════════════════════════════════════════════════════ */

/**
 * The defaults are the table's defaults, restated here.
 *
 * A partner with no row has not opted out of anything, and the screen
 * must show them the same thing the database would do — every switch on.
 * `offers` is absent from both, deliberately: see the table comment.
 */
export const PREF_DEFAULTS = {
  job_updates: true,
  payouts: true,
  reviews: true,
  messages: true,
  announcements: true,
  /* ── Added by migration 148, unreachable until now ───────────────
     148 put a `calendar` column on the table so a partner could stop
     the coverage sweep nudging them. This object, `fetchPrefs`'s select
     list, `savePrefs`'s caller and the switch list in NotificationPrefs
     all enumerated the same five keys and none of them mentioned it.

     So the column existed, the sweep read it on every run, and the only
     way a partner could set it was for somebody to write SQL. The one
     notification this system actually sends was the one nobody could
     turn off. */
  calendar: true,
}

export async function fetchPrefs(vendorId) {
  if (!vendorId) return { prefs: PREF_DEFAULTS, unavailable: false }

  const cols = Object.keys(PREF_DEFAULTS).join(', ')

  let { data, error } = await supabase
    .from(PREFS).select(cols).eq('vendor_id', vendorId).maybeSingle()

  /* A database without 148 has no `calendar` column, and naming it
     would fail the whole read -- turning "one preference is missing"
     into "preferences are unavailable". Ask for 125's five instead. */
  if (error && isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from(PREFS)
      .select('job_updates, payouts, reviews, messages, announcements')
      .eq('vendor_id', vendorId).maybeSingle())
  }

  if (error) return { prefs: PREF_DEFAULTS, unavailable: isMissingTable(error) }
  return { prefs: { ...PREF_DEFAULTS, ...(data ?? {}) }, unavailable: false }
}

/**
 * Upsert, because "has never opened this screen" and "has a row" are the
 * same state as far as the partner is concerned, and an update against a
 * row that does not exist silently changes nothing — which on a settings
 * screen reads as a switch that flips back on its own.
 */
export async function savePrefs(vendorId, prefs) {
  if (!vendorId) return { ok: false, error: 'No account.' }
  const row = { vendor_id: vendorId, ...prefs, updated_at: new Date().toISOString() }

  let { error } = await supabase.from(PREFS).upsert(row, { onConflict: 'vendor_id' })

  /* Same reason as the read: without 148 the write fails on `calendar`
     and every OTHER switch the partner just flipped is lost with it. */
  if (error && isMissingColumn(error)) {
    const { calendar, ...rest } = row
    void calendar
    ;({ error } = await supabase.from(PREFS).upsert(rest, { onConflict: 'vendor_id' }))
  }

  return error ? { ok: false, error: error.message } : { ok: true }
}
