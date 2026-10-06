import { supabase } from './supabase'

/**
 * "Are you waiting for this one?" — recording the answer.
 *
 * ── This must work before its migration is applied ────────────────────────
 * Migrations here are pasted by hand and `git push` does not run them, so a
 * deploy legitimately reaches production before its SQL does. For most
 * features the honest response is to say so on screen and carry on. Not this
 * one: the whole point is to catch somebody in the three seconds before they
 * leave a locked page, and "our database is not ready" is the worst possible
 * thing to say to them.
 *
 * So a missing table is not an error the customer sees. The answer is kept
 * locally, the UI thanks them exactly as it would have, and the row is
 * replayed the next time they open a festival page after the SQL lands.
 * Nothing is lost and nobody is told about our deploy order.
 *
 * ── Why answers are kept locally even on success ──────────────────────────
 * So the question is not asked twice. A page that re-asks something you
 * already answered reads as not having listened, and the alternative — a
 * round trip on every festival card render — is a query per card.
 */
const KEY = 'sambramo_festival_interest_v1'
const PENDING = 'sambramo_festival_interest_pending_v1'

/** PostgREST codes for "that table is not there yet". */
const ABSENT = new Set(['42P01', 'PGRST205', 'PGRST204'])
const isAbsent = e =>
  !!e && (ABSENT.has(e.code) || /does not exist|schema cache/i.test(e.message ?? ''))

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

/** What this device has already answered. `{ [festivalId]: 'yes' | 'no' }` */
export function answersSoFar() {
  return readJson(KEY)
}

export function answerFor(festivalId) {
  return answersSoFar()[festivalId] ?? null
}

/**
 * Record one answer.
 *
 * Always resolves. The caller gets `{ saved }` so it can decide whether to
 * say "we'll message you" (we have a row and a way to reach them) or the
 * softer "noted" — but never an error, because there is nothing the customer
 * could do about one.
 */
export async function recordInterest({ festivalId, festivalName, answer, city, source = 'festival_page' }) {
  const local = answersSoFar()
  local[festivalId] = answer
  writeJson(KEY, local)

  const { data: auth } = await supabase.auth.getUser().catch(() => ({ data: null }))
  const row = {
    customer_id: auth?.user?.id ?? null,
    festival_id: festivalId,
    festival_name: festivalName ?? null,
    answer,
    city: city ?? null,
    source,
  }

  const { error } = await supabase.from('festival_interest').insert(row)
  if (!error) return { saved: true }

  if (isAbsent(error)) {
    // Migration 055 has not been pasted. Hold it and move on.
    const queue = readJson(PENDING)
    queue[festivalId] = row
    writeJson(PENDING, queue)
    return { saved: false, deferred: true }
  }

  // A duplicate is the customer changing their mind. Their earlier answer is
  // on file and the unique index is doing its job; update it rather than
  // reporting a conflict at somebody who just tapped a button.
  if (error.code === '23505' && row.customer_id) {
    const { error: updateError } = await supabase
      .from('festival_interest')
      .update({ answer, created_at: new Date().toISOString() })
      .eq('customer_id', row.customer_id)
      .eq('festival_id', festivalId)
    return { saved: !updateError }
  }

  return { saved: false }
}

/**
 * Replay anything held while the table was missing.
 *
 * Called on mount from the festival page — the one screen where the cost of
 * an extra round trip is already paid and the queue is likely to be non-empty.
 * Silent either way.
 */
export async function flushPending() {
  const queue = readJson(PENDING)
  const ids = Object.keys(queue)
  if (ids.length === 0) return

  const { error } = await supabase.from('festival_interest').insert(Object.values(queue))
  if (!error) writeJson(PENDING, {})
}
