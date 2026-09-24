import { supabase } from './supabase'

/**
 * The partner and the customer, talking about one job.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE WINDOW IS THE DATABASE'S, NOT THIS FILE'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * `canWrite()` asks the database whether the thread is open, and the app
 * uses the answer to decide what to DRAW. It is never the thing that
 * decides what may be SENT — migration 151's INSERT policy and its
 * trigger do that, because the app is a WebView holding an anon key and
 * anything enforced here is enforced only for people who use the app.
 *
 * So a disabled box is a courtesy. The refusal underneath it is real.
 */

const TABLE = 'line_messages'

const missing = error =>
  error?.code === '42P01' || error?.code === 'PGRST202' ||
  /does not exist|not find the function/i.test(error?.message ?? '')

/**
 * The thread, oldest first.
 *
 * `unavailable` means 151 has not been pasted. The caller shows nothing
 * rather than an error: a partner can do nothing about a missing
 * migration and does not need to read about one.
 */
export async function fetchThread(lineId) {
  if (!lineId) return { rows: [], unavailable: false }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, line_id, sender, body, read_at, created_at')
    .eq('line_id', lineId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return { rows: [], unavailable: missing(error), error: error.message }
  return { rows: data ?? [], unavailable: false }
}

/** Is this thread open for new messages, according to the database? */
export async function canWrite(lineId) {
  if (!lineId) return false
  const { data, error } = await supabase.rpc('line_chat_is_open', { p_line: lineId })
  if (error) return false
  return data === true
}

/**
 * Say something.
 *
 * `sender` and `author_id` are NOT sent: 151's trigger works out who is
 * speaking from auth.uid() and overwrites whatever arrived. A partner
 * who could set sender could write themselves an agreement from the
 * person paying them.
 */
export async function send(lineId, body) {
  const text = String(body ?? '').trim()
  if (!lineId || !text) return { ok: false, says: 'Nothing to send.' }
  if (text.length > 2000) return { ok: false, says: 'That is too long to send in one message.' }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ line_id: lineId, body: text })
    .select('id, line_id, sender, body, read_at, created_at')
    .single()

  if (error) {
    if (missing(error)) return { ok: false, unavailable: true, says: 'Messaging is not switched on yet.' }
    /* The trigger's own words. It raises sentences written to be read
       by whoever hit them, so they are passed through rather than
       replaced with something vaguer. */
    if (/conversation is closed/i.test(error.message)) {
      return { ok: false, says: 'This conversation has closed. Sambramo can still help.' }
    }
    if (/not your booking/i.test(error.message)) {
      return { ok: false, says: 'This is not your booking.' }
    }
    return { ok: false, says: 'That did not send. Try once more.' }
  }
  return { ok: true, row: data }
}

/** Mark everything the OTHER side wrote as read. */
export async function markRead(lineId, mine) {
  if (!lineId) return
  await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('line_id', lineId)
    .neq('sender', mine)
    .is('read_at', null)
}

/** How many unread, for a badge. Counted without fetching the bodies. */
export async function unreadCount(lineId, mine) {
  if (!lineId) return 0
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('line_id', lineId)
    .neq('sender', mine)
    .is('read_at', null)
  return error ? 0 : (count ?? 0)
}

/**
 * Listen for the other side typing.
 *
 * Postgres changes, not a poll: a chat that polls every few seconds
 * while a partner is driving costs them data all day for the two
 * minutes it is used.
 */
export function subscribe(lineId, onRow) {
  if (!lineId) return () => {}
  const channel = supabase
    .channel(`line-chat-${lineId}`)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `line_id=eq.${lineId}` },
        payload => onRow?.(payload.new))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
