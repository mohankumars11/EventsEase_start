/**
 * What the app is used for, recorded first-party.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A CLOSED LIST, BECAUSE A FREE-TEXT EVENT NAME CANNOT BE COUNTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Left open, this produces `calendar_updated`, `calendarUpdated` and
 * `Calendar Updated` within a month, in three files, and then nobody can
 * answer a question about calendars. `EVENTS` is the vocabulary; a name
 * outside it is dropped with a console warning rather than sent, so the
 * mistake is visible in development and silent in production.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT MAY NEVER BE IN `props`
 * ══════════════════════════════════════════════════════════════════════
 *
 * No identity number, no bank detail, no document, no provider
 * response, no customer contact. `scrub()` strips anything whose KEY
 * looks like one, and migration 156 has a trigger that rejects the row
 * if anything gets past.
 *
 * Two layers on purpose. An analytics payload is the easiest place in a
 * codebase for something sensitive to end up: it is a free-form bag,
 * added under time pressure, reviewed less carefully than a form. A key
 * named `pan` reaching a telemetry table is a data breach wearing a
 * product-metrics hat, and the client should not be the only thing
 * standing between that and the database.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT NEVER BLOCKS AND NEVER THROWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Fire and forget, batched, flushed on a timer and when the page hides.
 * A partner tapping Accept must never wait on a metric, and a failed
 * metric must never surface as an error on a screen about their work.
 */

/** Every event this app may send. Grouped by where it happens. */
export const EVENTS = {
  /* Jobs */
  JOBS_OPENED: 'partner_jobs_opened',
  EMPTY_STATE_INTERACTED: 'empty_state_interacted',
  PROFILE_AVATAR_CLICKED: 'profile_avatar_clicked',
  REVIEW_STATUS_VIEWED: 'review_status_viewed',

  /* Notifications */
  NOTIFICATION_OPENED: 'notification_opened',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  NOTIFICATION_ARCHIVED: 'notification_archived',
  NOTIFICATION_ACTION_CLICKED: 'notification_action_clicked',

  /* Calendar */
  CALENDAR_PROMPT_VIEWED: 'calendar_prompt_viewed',
  CALENDAR_PROMPT_CLICKED: 'calendar_prompt_clicked',
  CALENDAR_UPDATED: 'calendar_updated',
  CALENDAR_BLOCKED_DATE: 'calendar_blocked_date',
  CALENDAR_UNBLOCKED_DATE: 'calendar_unblocked_date',

  /* Earnings and campaigns */
  PROMOTION_VIEWED: 'promotion_viewed',
  PROMOTION_CLICKED: 'promotion_clicked',
  REFERRAL_CARD_VIEWED: 'referral_card_viewed',
  REFERRAL_STARTED: 'referral_started',
  REFERRAL_SHARED: 'referral_shared',
}

const KNOWN = new Set(Object.values(EVENTS))

/**
 * Keys that must never be sent, whatever they hold.
 *
 * Matched on the KEY, not the value, because the key is what a
 * developer chooses and the value is what a partner typed. Mirrors the
 * trigger in 156 so the two cannot drift into disagreeing about what is
 * safe.
 */
const FORBIDDEN =
  /(aadhaar|^pan$|_pan$|pan_|passport|voter|ifsc|account_number|card_number|cvv|otp|number_last4|upi_id|bank|raw_response|provider_response|document_number|customer_phone|contact_phone|email|full_name|address)/i

/** Shapes that are an identity number whatever they are called. */
const LOOKS_SENSITIVE = [
  /^\d{12}$/,                    // Aadhaar
  /^[A-Z]{5}\d{4}[A-Z]$/,        // PAN
  /^\d{10}$/,                    // a bare Indian mobile
]

/**
 * Drop what must not travel, and flatten what is left.
 *
 * Only scalars survive. A nested object in a metric is a place for
 * something to hide from a key-name check one level down, and nothing
 * here needs one.
 */
export function scrub(props = {}) {
  const out = {}
  for (const [k, v] of Object.entries(props ?? {})) {
    if (FORBIDDEN.test(k)) continue
    if (v === null || v === undefined) continue
    if (typeof v === 'object') continue
    const s = String(v)
    if (LOOKS_SENSITIVE.some(re => re.test(s))) continue
    /* Long free text is a place a name or an address ends up. Metrics
       are counts and short labels. */
    out[k] = typeof v === 'string' ? s.slice(0, 120) : v
  }
  return out
}

/* ── The queue ────────────────────────────────────────────────────── */
let queue = []
let timer = null
let context = { vendorId: null, profileId: null, surface: null, build: null }

export function setTrackingContext(next = {}) {
  context = { ...context, ...next }
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  const batch = queue
  queue = []
  try {
    /* ── Imported here, not at the top ─────────────────────────────
       A static `import { supabase }` makes this module unloadable
       outside a bundler, because the client reads `import.meta.env` at
       module scope. That would put the scrubbing rules -- the part most
       worth testing, since they are what stands between a careless
       payload and a telemetry table -- behind a browser.

       Every other pure module in this codebase (availability,
       calendarAlerts, greeting) is Supabase-free for the same reason.
       This one needs a transport, so the transport arrives late. */
    const { supabase } = await import('./supabase')
    await supabase.from('partner_events').insert(batch)
  } catch {
    /* Deliberately swallowed and NOT retried. A metric that retries is
       a metric that can spend a partner's data allowance on a train,
       and a lost event is worth less than the battery. */
  }
}

/**
 * Record one thing that happened.
 *
 * Returns nothing and awaits nothing. Every caller should be able to
 * write `track(EVENTS.CALENDAR_UPDATED, { days: 5 })` on a line by
 * itself without thinking about it.
 */
export function track(name, props = {}) {
  if (!KNOWN.has(name)) {
    if (import.meta.env?.DEV) {
      console.warn(`track(): "${name}" is not in EVENTS — not sent`)
    }
    return
  }

  queue.push({
    name,
    props: scrub(props),
    vendor_id: context.vendorId ?? null,
    profile_id: context.profileId ?? null,
    surface: context.surface ?? null,
    app_build: context.build ?? null,
  })

  /* Batched, because a partner scrolling a list should not produce
     twenty round trips. Four seconds is long enough to collect a burst
     and short enough that a session ending does not lose much. */
  if (queue.length >= 20) { flush(); return }
  if (!timer) timer = setTimeout(flush, 4000)
}

/* ── Do not lose the last batch ───────────────────────────────────────
   `visibilitychange` rather than `beforeunload`: a WebView being
   backgrounded on Android often never fires unload at all, and
   backgrounding is how this app usually ends. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
