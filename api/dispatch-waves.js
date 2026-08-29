/**
 * The later waves. Widen the search for lines nobody answered.
 *
 * GET/POST /api/dispatch-waves        (Vercel Cron, every minute)
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HALF OF DISPATCH THAT WAS MISSING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `api/dispatch-booking` sends wave 1 — the nearest five masters inside
 * the customer's own radius — and deliberately stops there, because a
 * customer is waiting on that request and the widening is minutes away.
 *
 * Nothing ran the widening. `lines_awaiting_next_wave()` was written in
 * migration 072 and never called, so a line that missed wave 1 sat at
 * `standing` for ever.
 *
 * It showed up the first time somebody tested it properly: a booking from
 * Bellandur, and the only real master 6,161 m away in Koramangala. The
 * default radius is 5 km, so wave 1 found nobody, and wave 2 — which
 * searches 10 km and would have found them — never happened. The screen
 * said "still looking" and meant it literally: nothing was looking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DOES, AND WHAT IT REFUSES TO DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * For each line whose window has closed with nobody accepting:
 *
 *   · widen the radius by the wave's multiplier (5 → 10 → 15 km)
 *   · exclude masters who DECLINED — re-asking somebody who said no is
 *     the fastest way to teach them the notifications are noise
 *   · re-ask somebody who simply did not answer; they were driving, not
 *     uninterested
 *   · after the last wave, go STANDING rather than expire, so the
 *     service stays visible and re-dispatches when supply appears
 *
 * It never touches a line that has an accepted offer, never creates a
 * second winner, and never charges anybody. `uq_offer_one_winner` makes
 * the first of those impossible rather than merely unlikely.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { OFFER_WINDOW_SECONDS, WAVES, MAX_RADIUS_KM } from './_lib/pricing.bundle.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Vercel Cron sends a bearer token when CRON_SECRET is set. Without the
 * check anybody could POST this endpoint and force every waiting line to
 * widen — not catastrophic, but it would buzz every master in the city
 * on demand, and a notification channel that can be spammed is a
 * notification channel masters mute.
 */
function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true                      // unset: dev, and Vercel's own scheduler
  return req.headers?.authorization === `Bearer ${secret}`
}

export default async function handler(req, res) {
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorised' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Offers nobody answered are marked before the queue is read, so a line
  // whose window has just closed is picked up on this pass rather than
  // the next one.
  const { data: expired } = await db.rpc('expire_stale_offers')

  const { data: due, error } = await db.rpc('lines_awaiting_next_wave', { p_limit: 50 })
  if (error) return res.status(500).json({ error: `lines_awaiting_next_wave: ${error.message}` })

  const result = { expired: expired ?? 0, widened: 0, standing: 0, notified: 0, lines: [] }

  for (const line of due ?? []) {
    const wave = WAVES.find(w => w.wave === line.next_wave)

    // Out of waves. STANDING rather than expired: the customer is not
    // told "no" while there is still time before the event, and 069's
    // triggers re-dispatch this the moment a master in that trade is
    // approved or frees the date.
    if (!wave) {
      await db.from('booking_lines').update({
        dispatch_mode: 'standing',
        standing_since: new Date().toISOString(),
        stand_until: new Date(new Date(line.event_date).getTime() - 86400000).toISOString(),
        expires_at: null,
      }).eq('id', line.line_id)
      result.standing++
      result.lines.push({ line: line.line_id, trade: line.trade, outcome: 'standing' })
      continue
    }

    const radiusM = Math.round(
      Math.min(line.radius_km * wave.radiusMultiplier, MAX_RADIUS_KM) * 1000)

    const { data: matches, error: matchErr } = await db.rpc('match_partners', {
      p_trade: line.trade,
      p_point: line.location,
      p_radius_m: radiusM,
      p_date: line.event_date,
      // The later waves reach exactly the network wave 1 reached. A
      // seeded partner that could not be offered the job at 5 km must
      // not become offerable at 10.
      p_allow_synthetic: false,
      p_limit: wave.partners,
      p_exclude: line.already_asked ?? [],
    })

    if (matchErr) {
      result.lines.push({ line: line.line_id, trade: line.trade, outcome: 'match_failed', error: matchErr.message })
      continue
    }

    if (!matches?.length) {
      // Nobody at this radius either. Try the next wave on the next pass
      // rather than giving up — the widening is the whole point.
      await db.from('booking_lines').update({
        expires_at: new Date(Date.now() + 1000).toISOString(),
      }).eq('id', line.line_id)
      result.lines.push({ line: line.line_id, trade: line.trade, outcome: `wave ${wave.wave} empty at ${radiusM / 1000}km` })
      continue
    }

    const expiresAt = new Date(Date.now() + OFFER_WINDOW_SECONDS * 1000).toISOString()

    const { error: offerErr } = await db.from('dispatch_offers').insert(
      matches.map(m => ({
        line_id: line.line_id,
        vendor_id: m.vendor_id,
        wave: wave.wave,
        distance_m: Math.round(m.distance_m),
        partner_amount_paise: line.partner_amount_paise,
        expires_at: expiresAt,
      })),
    )

    if (offerErr) {
      result.lines.push({ line: line.line_id, trade: line.trade, outcome: 'insert_failed', error: offerErr.message })
      continue
    }

    await db.from('booking_lines').update({
      status: 'dispatching',
      expires_at: expiresAt,
    }).eq('id', line.line_id)

    result.widened++
    result.notified += matches.length
    result.lines.push({
      line: line.line_id, trade: line.trade,
      outcome: `wave ${wave.wave} · ${radiusM / 1000}km · ${matches.length} notified`,
    })
  }

  return res.status(200).json(result)
}
