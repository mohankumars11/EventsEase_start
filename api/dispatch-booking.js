/**
 * Create an instant booking and fan it out to masters.
 *
 * POST /api/dispatch-booking
 *   { occasionId, occasionName, eventDate, guestCount, radiusKm,
 *     lat, lng, addressText, areaLabel, city, notes,
 *     lines: [{ serviceId, setupId?, durationId?, cuisineId?, note?, photoUrl? }] }
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE AMOUNT NEVER COMES FROM THE BROWSER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The client sends SELECTIONS — which service, at what scale, for how
 * long. It never sends a number. Every price is computed here from
 * `lib/instantPricing.js` and written to `booking_lines.quoted_amount_paise`,
 * and that column is what a Razorpay order is later priced from.
 *
 * A client that could name its own amount could name ₹1. This is the same
 * rule `api/create-milestone-payment.js` states at length, and it is the
 * reason this endpoint exists at all rather than the browser inserting
 * rows through PostgREST.
 *
 * ── And the master never names one either ────────────────────────────
 * `match_partners()` selects on trade, distance, availability and rating.
 * It does not read `vendor_services.price` and neither does this file.
 * The platform sets the price; the master sees it and answers yes or no.
 * See the header of lib/instantPricing.js for why that is a product
 * decision rather than a shortcut.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT DISPATCHES WAVE 1 ONLY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Five masters get the offer, and they get 45 seconds. If none answers,
 * a later pass widens the radius — it does NOT happen inside this
 * request, because this request has a customer waiting on it and the
 * widening is two minutes away.
 *
 * A line with nobody to offer to at all does not expire. It goes
 * STANDING (migration 069): the service stays visible, no countdown is
 * shown against an empty pool, and it re-dispatches by itself when a
 * master in that trade is approved or frees the date up.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { notifyForWave } from './_lib/fcm.js'
// One import, and it has an extension Node can resolve. See the header of
// scripts/build-api-bundle.mjs for why this is a bundle rather than five
// imports from src/ — in short, because five imports from src/ throw at
// import time in production and cannot be caught here.
import {
  optionMultiplier,
  optionSummary,
  priceLine, lineSplit, tradeFor, specModeFor,
  OFFER_WINDOW_SECONDS, WAVES, MAX_RADIUS_KM, PLATFORM_FEE_RATE, POLICY_VERSION,
} from './_lib/pricing.bundle.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Who, if anyone, may be matched to the seeded network.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS PER-CUSTOMER AND NOT A GLOBAL SWITCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * There are 221 invented Bengaluru partners in the database, and they are
 * what makes the product demonstrable — with one real partner, two lines
 * in three go STANDING and the matching screen honestly shows almost
 * nothing happening.
 *
 * A global `ALLOW_SYNTHETIC_DISPATCH=true` would fix the demo and break
 * the promise: a real customer would be told "Sri Lakshmi Decorators
 * accepted your booking" about a business that does not exist. No money
 * can move today (there are no payment keys), but being shown a confirmed
 * master who is fictional is a trust failure with or without a payment.
 *
 * So the flag names ONE customer. That account sees the seeded network;
 * every other customer gets the real one, and the honest empty state that
 * comes with it. The demo works and nobody is lied to.
 *
 *   SYNTHETIC_DEMO_CUSTOMER  a single profile id, or unset
 *
 * `ALLOW_SYNTHETIC_DISPATCH` still works for local development, where
 * every customer is you. It is deliberately NOT read when NODE_ENV is
 * production: a stray env var on the host must not be able to switch this
 * on for everybody, which is the shape of the bug PROJECT_SUMMARY records
 * about `testPaymentProvider` and free merchandise.
 */
const IS_PROD = process.env.NODE_ENV === 'production'
/* A comma-separated list, not one id.
 *
 * Testing this needs more than one account -- a customer, a second
 * customer to check that two bookings do not collide, and whichever
 * throwaway address was used to reproduce the last bug. Naming one id
 * meant editing an env var and redeploying between runs, which is the
 * kind of friction that ends with somebody setting the global flag
 * instead. The safety property is unchanged: an account not on this
 * list can never be matched to a partner that does not exist. */
const DEMO_CUSTOMERS = new Set(
  (process.env.SYNTHETIC_DEMO_CUSTOMER ?? '')
    .split(',').map(s => s.trim()).filter(Boolean))

const ALLOW_SYNTHETIC_GLOBALLY = !IS_PROD && process.env.ALLOW_SYNTHETIC_DISPATCH === 'true'

const mayUseSeededNetwork = customerId =>
  ALLOW_SYNTHETIC_GLOBALLY || DEMO_CUSTOMERS.has(customerId)

export default async function handler(req, res) {
  // Preflight, and the headers every response needs. See _lib/cors.js.
  if (cors(req, res)) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const {
    customerId, occasionId, occasionName, eventDate, guestCount = 40,
    radiusKm = 5, lat, lng, addressText, areaLabel, city = 'Bengaluru',
    notes = null, lines = [],
  } = req.body ?? {}

  if (!customerId)          return res.status(400).json({ error: 'customerId required' })
  if (!eventDate)           return res.status(400).json({ error: 'eventDate required' })
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' })
  if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'at least one line required' })
  if (lines.length > 20)    return res.status(400).json({ error: 'too many lines' })

  // Decided once, from the caller's own id, and passed to every match.
  const allowSeeded = mayUseSeededNetwork(customerId)

  // ── Price every line before writing anything ──────────────────────
  // Done first so a service that cannot be priced fails the request
  // rather than producing a half-built booking with a ₹0 line in it.
  const priced = []
  for (const l of lines) {
    const trade = tradeFor(l.serviceId)
    if (!trade) return res.status(400).json({ error: `${l.serviceId} is not instant-bookable` })

    const q = priceLine({
      serviceId: l.serviceId,
      guestCount,
      setupId: l.setupId ?? null,
      durationId: l.durationId ?? null,
      cuisineId: l.cuisineId ?? null,
    })
    if (!q) return res.status(400).json({ error: `cannot price ${l.serviceId}` })

    /* What the customer chose, priced HERE.
     *
     * The client sends choice IDS — 'candid', 'bridal', 'nonveg' — and
     * never an amount or a multiplier. The multiplier is looked up from
     * data/serviceOptions.js on this side, so a client that made up
     * `mult: 0.01` would be sending a field nothing reads.
     *
     * Same rule the rate card has always had: the browser names WHAT,
     * the server decides WHAT IT COSTS. */
    const optionMult = optionMultiplier(l.serviceId, l.options ?? {})
    q.paise  = Math.round(q.paise * optionMult)
    q.rupees = Math.round(q.paise / 100)
    q.optionSummary = optionSummary(l.serviceId, l.options ?? {})

    priced.push({ input: l, quote: q, trade })
  }

  // ── The container ─────────────────────────────────────────────────
  // One call, not insert-then-locate. `location` is NOT NULL and
  // PostgREST cannot send a geography value, so the row has to be created
  // WITH its point — see the header of create_booking_request in
  // migration 072 for why making the column nullable would have been the
  // wrong way out.
  const { data: created, error: reqErr } = await db.rpc('create_booking_request', {
    p_customer_id:    customerId,
    p_occasion_id:    occasionId ?? 'other',
    p_occasion_name:  occasionName ?? 'Celebration',
    p_event_date:     eventDate,
    p_guest_count:    guestCount,
    p_radius_km:      Math.min(radiusKm, MAX_RADIUS_KM),
    p_lat:            lat,
    p_lng:            lng,
    p_address_text:   addressText ?? '',
    p_area_label:     areaLabel ?? city,
    p_city:           city,
    p_policy_version: POLICY_VERSION,
    p_time_note:      null,
    p_notes:          notes,
  })

  if (reqErr)       return res.status(500).json({ error: `booking_requests: ${reqErr.message}` })
  if (!created?.ok) return res.status(400).json({ error: created?.detail ?? created?.reason ?? 'could not create booking' })

  const request = { id: created.request_id }

  // ── The lines ─────────────────────────────────────────────────────
  const lineRows = priced.map(({ input, quote, trade }) => ({
    request_id: request.id,
    service_id: input.serviceId,
    service_name: quote.serviceName,
    trade,
    spec_mode: specModeFor(input.serviceId),
    customer_note: input.note ?? null,
    reference_photo_url: input.photoUrl ?? null,
    ...lineSplit(quote.paise, PLATFORM_FEE_RATE),
    price_basis: quote.basis ?? {},
    status: 'pending',
    // Written here, from the server's own constant. Never client-supplied
    // and never set at accept — the cancellation ladder is read against
    // it, so it decides what a customer is refunded.
    policy_version: POLICY_VERSION,
  }))

  const { data: createdLines, error: lineErr } = await db
    .from('booking_lines').insert(lineRows).select('id, service_id, trade, partner_amount_paise')

  if (lineErr) return res.status(500).json({ error: `booking_lines: ${lineErr.message}` })

  // ── Fan out ───────────────────────────────────────────────────────
  const wave = WAVES[0]
  const radiusM = Math.round(Math.min(radiusKm * wave.radiusMultiplier, MAX_RADIUS_KM) * 1000)
  const expiresAt = new Date(Date.now() + OFFER_WINDOW_SECONDS * 1000).toISOString()

  const { data: point } = await db.rpc('point_of', { p_lat: lat, p_lng: lng })

  /**
   * The whole wave, in one call.
   *
   * ══════════════════════════════════════════════════════════════════
   * EIGHTEEN ROUND TRIPS BECAME TWO
   * ══════════════════════════════════════════════════════════════════
   *
   * This used to run, per line: match real, match filler, insert the
   * offers, update the line. Four hops each, plus a push query — so a
   * four-service basket was eighteen crossings between Vercel and
   * Postgres at 80–150ms apiece. Measured end to end: 6.3 seconds, and
   * almost none of it was work. The database was never slow; the
   * distance was.
   *
   * `dispatch_wave` (migration 084) does the loop inside the database,
   * so the cost no longer multiplies by basket size. Ten services now
   * cost what one did — which is the property that matters, because the
   * customer with the biggest basket is worth the most and was being
   * made to wait the longest.
   *
   * It is also atomic. The old sequence could insert offers for three
   * lines and fail on the fourth, leaving masters holding offers for a
   * booking the customer had been told failed.
   */
  const { data: wave1, error: waveErr } = await db.rpc('dispatch_wave', {
    p_request_id: request.id,
    p_point: point,
    p_radius_m: radiusM,
    p_date: eventDate,
    p_wave: wave.wave,
    p_partners: wave.partners,
    p_expires_at: expiresAt,
    p_allow_synthetic: allowSeeded,
  })

  if (waveErr) return res.status(500).json({ error: `dispatch_wave: ${waveErr.message}` })

  const results = (wave1?.lines ?? []).map(l => ({
    lineId: l.lineId,
    serviceId: l.serviceId,
    standing: l.standing,
    notified: l.notified,
    // How much of this wave is a real business. The matching screen says
    // "5 masters have it" and must not be counting ghosts when somebody
    // is deciding whether to trust it.
    real: l.real,
  }))

  /* One push pass for the whole booking, not one per line.
   *
   * A master offered three services of the same booking is one person
   * with one phone. Looking their tokens up per line queried the same
   * rows three times and could buzz them three times in a second, which
   * is how a master learns to silence the app.
   *
   * Not awaited into the response path in a way that can fail it: a
   * booking whose notification failed is still a real booking, and the
   * customer is waiting.
   */
  const pushed = await notifyForWave(db, wave1, { eventDate, areaLabel, city })

  return res.status(200).json({
    requestId: request.id,
    expiresAt,
    lines: results.map(r => ({ ...r, pushed: pushed.perLine?.[r.lineId] ?? 0 })),
    notified: results.reduce((n, r) => n + r.notified, 0),
    pushed: pushed.sent ?? 0,
    standing: results.filter(r => r.standing).length,
  })
}
