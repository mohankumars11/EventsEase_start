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
// One import, and it has an extension Node can resolve. See the header of
// scripts/build-api-bundle.mjs for why this is a bundle rather than five
// imports from src/ — in short, because five imports from src/ throw at
// import time in production and cannot be caught here.
import {
  priceLine, lineSplit, tradeFor, specModeFor,
  OFFER_WINDOW_SECONDS, WAVES, MAX_RADIUS_KM, PLATFORM_FEE_RATE, POLICY_VERSION,
} from './_lib/pricing.bundle.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Seeded partners are dispatchable only when explicitly allowed. */
const ALLOW_SYNTHETIC = process.env.ALLOW_SYNTHETIC_DISPATCH === 'true'

export default async function handler(req, res) {
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

  const results = []
  for (const line of createdLines) {
    const { data: matches, error: matchErr } = await db.rpc('match_partners', {
      p_trade: line.trade,
      p_point: point,
      p_radius_m: radiusM,
      p_date: eventDate,
      p_allow_synthetic: ALLOW_SYNTHETIC,
      p_limit: wave.partners,
      p_exclude: [],
    })

    if (matchErr) return res.status(500).json({ error: `match_partners: ${matchErr.message}` })

    if (!matches?.length) {
      // Nobody to ask. NOT an expiry — see migration 069. Showing a
      // countdown against an empty pool would be the `false_urgency`
      // pattern named in config/legal.js.
      await db.from('booking_lines').update({
        dispatch_mode: 'standing',
        standing_since: new Date().toISOString(),
        // Keep looking until the day before; past that there is no job
        // left to fill and continuing would be theatre.
        stand_until: new Date(new Date(eventDate).getTime() - 86400000).toISOString(),
      }).eq('id', line.id)

      results.push({ lineId: line.id, serviceId: line.service_id, standing: true, notified: 0 })
      continue
    }

    const offers = matches.map(m => ({
      line_id: line.id,
      vendor_id: m.vendor_id,
      wave: wave.wave,
      distance_m: Math.round(m.distance_m),
      partner_amount_paise: line.partner_amount_paise,
      expires_at: expiresAt,
    }))

    const { error: offerErr } = await db.from('dispatch_offers').insert(offers)
    if (offerErr) return res.status(500).json({ error: `dispatch_offers: ${offerErr.message}` })

    await db.from('booking_lines').update({
      status: 'dispatching',
      dispatched_at: new Date().toISOString(),
      expires_at: expiresAt,
    }).eq('id', line.id)

    results.push({ lineId: line.id, serviceId: line.service_id, standing: false, notified: offers.length })
  }

  return res.status(200).json({
    requestId: request.id,
    expiresAt,
    lines: results,
    notified: results.reduce((n, r) => n + r.notified, 0),
    standing: results.filter(r => r.standing).length,
  })
}
