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

/** Newest first, capped — nobody scrolls a year of these. */
export async function fetchNotifications(vendorId, limit = 40) {
  if (!vendorId) return EMPTY_FEED

  const { data, error } = await supabase
    .from(NOTIFICATIONS)
    .select('id, kind, title, body, line_id, href, read_at, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { rows: [], unread: 0, unavailable: isMissingTable(error) }

  const rows = data ?? []
  return { rows, unread: rows.filter(r => !r.read_at).length, unavailable: false }
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
}

export async function fetchPrefs(vendorId) {
  if (!vendorId) return { prefs: PREF_DEFAULTS, unavailable: false }

  const { data, error } = await supabase
    .from(PREFS)
    .select('job_updates, payouts, reviews, messages, announcements')
    .eq('vendor_id', vendorId)
    .maybeSingle()

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
  const { error } = await supabase
    .from(PREFS)
    .upsert({ vendor_id: vendorId, ...prefs, updated_at: new Date().toISOString() },
            { onConflict: 'vendor_id' })
  return error ? { ok: false, error: error.message } : { ok: true }
}
