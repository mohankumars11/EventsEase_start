/**
 * The offer board: every qualifying package of every eligible master,
 * priced for the customer's date in one call.
 *
 *   POST /api/anchor?op=offers
 *   { base: { event_date, start_time, lat, lng, guests, experience? },
 *     venue: { city },
 *     candidates: [{ serviceId, request }] }        ≤ 36 per call
 *   → { offers: [{ serviceId, packageId, path, price, advance, hours,
 *                  experience, reasons }], pricedAt }
 *
 * ── One price, from one function ────────────────────────────────────
 * Each candidate is priced by priceOffer (api/_lib/anchorBook.js) — the
 * function a real booking calls. So the number on a card is the number at
 * checkout, and an offer the booking would refuse (a package that does not
 * deliver the experience, a package other than the one named) is refused
 * here too, with the same reasons. Nothing is estimated on the phone.
 *
 * ── The event is the server's ───────────────────────────────────────
 * The phone builds each candidate's request with lib/booking requestFor —
 * the same shaping it books with — but the date, time, place, guests and
 * experience are overwritten from `base`, so a board can never price one
 * master for one day and another for another. priceBackups does the same.
 *
 * ── Bounded ─────────────────────────────────────────────────────────
 * No login, like the single preview it batches — so it is capped: at most
 * 36 candidates a call (a page of 12 masters × their qualifying packages)
 * and 6 priced at a time. The board pages; it never asks for a city at once.
 *
 * ── What it returns ─────────────────────────────────────────────────
 * Only what a card needs. Never the partner's take-home, never the
 * resources a booking would reserve, never anything that identifies a
 * partner beyond the service the phone already named.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './cors.js'
import { priceOffer } from './anchorBook.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX = 36
const WIDTH = 6

const clean = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
const EVENT_KEYS = ['event_date', 'start_time', 'lat', 'lng', 'guests', 'experience']

/* Run `jobs` a few at a time, keeping their order. */
async function pool(jobs, width) {
  const out = new Array(jobs.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, async () => {
    while (i < jobs.length) { const k = i++; out[k] = await jobs[k]() }
  }))
  return out
}

/* The card's view of one priced candidate. */
function card(serviceId, r, priced) {
  if (priced.error) return { serviceId, packageId: r.package_id ?? null, path: 'ERROR', reasons: ['Could not price this right now.'] }
  const { out } = priced
  const fit = out.experience_fit ?? null
  return {
    serviceId,
    packageId: out.package_id ?? null,
    path: out.path,                                   // INSTANT | QUOTE | NOT_ELIGIBLE | NOT_QUALIFIED
    price: Number(out.customer_paise) || null,        // the Sambramo price for this date
    advance: Number(out.advance_paise) || null,
    basis: out.basis ?? null,
    hours: fit?.coverage_hours ?? (Number(r.hours) || null),
    experience: fit ? { ok: fit.ok, tier: fit.tier, name: fit.name, version: fit.version, gaps: fit.gaps ?? [],
      package: fit.package ?? null } : null,
    reasons: out.reasons_text ?? [],
  }
}

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const body = req.body ?? {}
  const base = body.base && typeof body.base === 'object' ? body.base : null
  const list = Array.isArray(body.candidates) ? body.candidates : null
  if (!base?.event_date || !list) return res.status(400).json({ error: 'base.event_date and candidates are required.' })
  if (list.length > MAX) return res.status(400).json({ error: `At most ${MAX} offers per call — page the board.` })

  const event = Object.fromEntries(EVENT_KEYS.filter(k => base[k] !== undefined).map(k => [k, base[k]]))
  const venue = { city: clean(body.venue?.city, 120) }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const jobs = list.map(c => {
    const serviceId = clean(c?.serviceId, 60)
    const r = c?.request && typeof c.request === 'object' ? { ...c.request, ...event } : null
    if (!serviceId || !r) return async () => ({ serviceId, path: 'ERROR', reasons: ['Incomplete offer.'] })
    return async () => card(serviceId, r, await priceOffer(db, { vendorServiceId: serviceId, r, venue }).catch(e => ({ error: e.message })))
  })
  const offers = await pool(jobs, WIDTH)
  return res.status(200).json({ offers, pricedAt: new Date().toISOString() })
}
