/**
 * The offer board (Mohan, 2026-11-03): every master who can deliver what
 * the customer chose, with every one of their packages that delivers it,
 * priced for the customer's date — to compare, negotiate and book. It
 * replaces "Sambramo picks one master" (1 Nov) and "no price until a master
 * accepts" (2 Nov).
 *
 * ── What is on it ───────────────────────────────────────────────────
 *   for each master near the venue who does what was asked (lib/needs):
 *     · every LIVE package of theirs that delivers the chosen experience —
 *       judged on hours and inclusions (lib/experience), never the label
 *     · their hourly rate, ONLY when no package of theirs delivers it and
 *       the experience needs nothing included — so a master is never listed
 *       twice for the same thing, and a rate never promises an album
 *   masters with packages that all fall short go to `close`, with the
 *   nearest one and exactly what it lacks — the brief's "clearly labelled
 *   alternative", never mixed in with the ones that qualify.
 *
 * ── Where the numbers come from ─────────────────────────────────────
 * Every price is the server's: one call (api/anchor?op=offers) prices the
 * page with priceOffer, the function a booking itself uses. A master the
 * server says cannot do it on that date moves to `unavailable` with its
 * reason. The phone never shows a price it worked out itself.
 *
 * ── Scale ───────────────────────────────────────────────────────────
 * 12 masters a page, at most 36 packages priced per call — each master's
 * three cheapest qualifying packages when they have more. "Load more" asks
 * for the next page; the candidate list is already bounded by distance.
 */
import { apiUrl } from '../../lib/api'
import { partnersFor, rank } from './market'
import { filterByNeeds } from './needs'
import { experienceOf, hoursOf, packageFits } from './experience'
import { requestFor } from './booking'
import { quote } from './quote'
import { lineOf } from './liveMatch'

export const PAGE = 12
const PER_MASTER = 3
const HOURLY = 'hour'

/** The ask: the experience chosen for this trade, and the hours it needs. */
export function askFor(tradeId, needs = {}, event = {}) {
  const experience = experienceOf(tradeId, needs.$tier)
  const asked = hoursOf(needs.$hours) ?? hoursOf(event.hours)
  const hours = Math.max(asked ?? 0, experience?.model === 'PARTNER_PACKAGE' ? Number(experience.min_hours) || 0 : 0) || null
  /* The weight chosen for a cake ("2_kg" → 2), so a per-kg cake is priced at it. */
  const size = (Array.isArray(needs.sizes) ? needs.sizes[0] : needs.sizes) ?? null
  const kg = size && /_kg$/.test(size) ? Number(String(size).replace(/_kg$/, '').replace('_', '.')) || null : null
  return { experience, hours, guests: Number(needs.$guests) || Number(event.guests) || null, kg, size }
}

/**
 * Every way one master can deliver the ask — { ok: [...], closest } where
 * each option is { kind, ref, label, hours, inclusions }. `closest` is the
 * package nearest to qualifying, for the "close, but not" list.
 */
export function optionsFor(p, ask) {
  /* A venue: every space of theirs that holds the guests — the venue's
     "every package that delivers it". A space too small goes to `close`
     with what it holds; one booked for the date is refused by the server
     (resolve_booking: sambramo_resource_free → space_booked) and lands in
     `unavailable`. Setup and cleanup time are part of the server's hold. */
  if ((p.spaces ?? []).length) {
    const g = Number(ask.guests) || null
    const fits = [], small = []
    for (const sp of p.spaces) {
      const opt = { kind: 'space', ref: sp.ref, label: sp.name, hours: sp.includedHours ?? ask.hours ?? null, inclusions: [], listPaise: sp.paise,
        fromKind: 'once', fromUnit: sp.unit ?? 'slot', capacity: sp.capacity,
        summary: [sp.capacity ? `holds ${sp.capacity}` : null, sp.includedHours ? `${sp.includedHours} h` : null].filter(Boolean).join(' · ') || null }
      if (!g || !sp.capacity || sp.capacity >= g) fits.push(opt)
      else small.push({ ...opt, gaps: [{ need: 'capacity', want: g, have: sp.capacity }] })
    }
    fits.sort((a, b) => (a.listPaise ?? Infinity) - (b.listPaise ?? Infinity))
    return { ok: fits, closest: small.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0))[0] ?? null }
  }
  /* A maker's products, each its own offer with its own photo: the cakes
     at the chosen weight first, then the rest. A per-kg cake is priced at
     the weight asked; a whole cake at one. */
  if ((p.products ?? []).length) {
    const opts = p.products.map(x => {
      const perKg = x.unit === 'kg'
      const qty = perKg ? Math.max(x.minQty, ask.kg ?? 1) : x.minQty
      return { kind: 'item', ref: { type: 'item', key: x.key, minQty: qty }, qty, label: x.name, photo: x.photo, hours: null, inclusions: [], listPaise: x.paise * qty,
        fromKind: perKg ? 'unit' : 'once', fromUnit: perKg ? 'per kg' : `per ${x.unit || 'item'}`, serves: x.serves, size: x.size,
        summary: [perKg ? `${qty} kg` : x.size ? String(x.size).replace(/_kg$/, ' kg').replace('_', '.').replace(/_/g, ' ') : null, x.serves ? `serves ${x.serves}` : null].filter(Boolean).join(' · ') || null,
        fit: (ask.size && x.size === ask.size) || perKg ? 0 : 1 }
    })
    opts.sort((a, b) => a.fit - b.fit || (a.listPaise ?? Infinity) - (b.listPaise ?? Infinity))
    return { ok: opts, closest: null }
  }
  const exp = ask.experience?.model === 'PARTNER_PACKAGE' ? ask.experience : null
  const pkgs = (p.offers ?? []).filter(o => o.type === 'package')
  const ok = [], misses = []
  for (const o of pkgs) {
    const f = exp ? packageFits(o, exp, ask.hours) : { ok: !ask.hours || (Number(o.hours) || 0) >= ask.hours, gaps: [] }
    const opt = { kind: 'package', ref: o.ref, label: o.label, hours: Number(o.hours) || null, inclusions: o.inclusions ?? [], listPaise: o.paise,
      fromKind: 'package', fromUnit: 'package', summary: o.hours ? `${o.hours} h` : null }
    if (f.ok) ok.push(opt)
    else misses.push({ ...opt, gaps: f.gaps.length ? f.gaps : [{ need: 'hours', want: ask.hours, have: opt.hours }] })
  }
  if (!ok.length && !(exp?.required_inclusions?.length) && ask.hours) {
    const rate = (p.offers ?? []).find(o => o.type === 'rule' && o.key === HOURLY && (!o.maxHours || o.maxHours >= ask.hours))
    if (rate) ok.push({ kind: 'rate', ref: { type: 'rule', key: HOURLY }, label: 'By the hour', hours: ask.hours, inclusions: [], listPaise: rate.paise * ask.hours,
      fromKind: 'hour', fromUnit: 'per hour', summary: `${ask.hours} h by the hour` })
  }
  /* No package experience to hold them to (none chosen, or a trade without
     packages — catering by the plate, a venue by the slot, a rental by the
     item): the master offers what the engine would price them by — their
     quote for this ask (lib/quote, the engine's own arithmetic), else their
     own "from" option. Before this, every such trade showed nobody. */
  if (!ok.length && !exp) {
    const q = quote(p, { hours: ask.hours, guests: ask.guests })
    const ref = q?.line?.fromRef ?? p.fromRef
    if (ref) ok.push({
      kind: ref.type === 'package' ? 'package' : ref.type, ref, label: q?.line?.fromLabel ?? p.fromLabel ?? null,
      hours: q?.hours ?? null, inclusions: [], listPaise: q?.paise ?? p.fromPaise ?? null,
      fromKind: q?.line?.fromKind ?? p.fromKind, fromUnit: q?.line?.fromUnit ?? p.fromUnit,
      summary: q?.note ?? (p.fromUnit ? `priced ${p.fromUnit}` : null),
    })
  }
  ok.sort((a, b) => (a.listPaise ?? Infinity) - (b.listPaise ?? Infinity))
  const closest = misses.sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))[0] ?? null
  return { ok, closest }
}

/* The request the server prices for one option — built exactly as a
   booking builds it, so the board's price is the checkout's price. */
function requestOf(p, opt, { tradeId, occasionId, event, place, ask }) {
  const exp = ask.experience
  const line = lineOf({
    ...p, fromRef: opt.ref, fromKind: opt.fromKind ?? 'package', fromUnit: opt.fromUnit ?? 'package',
    fromPaise: opt.listPaise, fromLabel: opt.label, askHours: opt.hours, askGuests: ask.guests,
    experience: exp ? { trade: tradeId, tier: exp.tier, name: exp.name, version: exp.version, hours: ask.hours } : null,
  }, occasionId)
  if (opt.qty) line.qty = opt.qty
  return { line, request: requestFor(line, event, place) }
}

/* The default pricer: one call for the page. Injected so the live check can
   drive the same handler in-process. */
export async function priceOffers({ base, venue, candidates }) {
  const r = await fetch(apiUrl('/api/anchor?op=offers'), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base, venue, candidates }),
    /* An unreachable server must fail, not spin: the screen then says it cannot connect. */
    signal: AbortSignal.timeout?.(20000),
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(out.error ?? `offers ${r.status}`)
  return out.offers ?? []
}

/**
 * One page of the board for one requirement.
 * → { ask, total, page, more, masters, close, unavailable, range }
 * `masters[i]` = { partner, headline, extras, badges, offers } — the headline
 * is their cheapest priced package that delivers the ask; extras are the
 * rest, each with `vs` (what it adds, and for how much more).
 */
export async function buildBoard({ tradeId, occasionId = null, event = {}, place = {}, needs = {}, page = 0 }, { price = priceOffers } = {}) {
  const ask = askFor(tradeId, needs, event)
  const all = await partnersFor(tradeId, place?.lat ? { lat: place.lat, lng: place.lng, limit: 100 } : { limit: 100 })
  const fit = filterByNeeds(all, tradeId, needs, event?.guests).list ?? all
  const eligible = [], close = []
  for (const p of rank(fit)) {
    const o = optionsFor(p, ask)
    if (o.ok.length) eligible.push({ p, options: o.ok.slice(0, PER_MASTER), morePackages: Math.max(0, o.ok.length - PER_MASTER) })
    else if (o.closest) close.push({ partner: p, option: o.closest })
  }
  const slice = eligible.slice(page * PAGE, page * PAGE + PAGE)
  const built = slice.flatMap(e => e.options.map(opt => ({ e, opt, ...requestOf(e.p, opt, { tradeId, occasionId, event, place, ask }) })))
  const exp = ask.experience
  const base = {
    event_date: event.date, start_time: event.time ?? '10:00', lat: place?.lat, lng: place?.lng, guests: ask.guests,
    ...(exp ? { experience: { trade: tradeId, tier: exp.tier, name: exp.name, version: exp.version, hours: ask.hours } } : {}),
  }
  const priced = built.length ? await price({ base, venue: { city: place?.city ?? null },
    candidates: built.map(b => ({ serviceId: b.e.p.serviceId, request: b.request })) }) : []

  /* The server keeps the order it was given, so result i is candidate i. */
  const masters = [], unavailable = []
  for (const e of slice) {
    const mine = built.map((b, i) => ({ b, q: priced[i] })).filter(x => x.b.e === e)
    const offers = mine.filter(x => ['INSTANT', 'QUOTE'].includes(x.q?.path)).map(x => ({
      ...x.b.opt, serviceId: e.p.serviceId, line: x.b.line, request: x.b.request,
      packageId: x.q.packageId ?? x.b.opt.ref?.packageId ?? null, path: x.q.path,
      price: x.q.path === 'INSTANT' ? x.q.price : null,   // QUOTE: the master sends a price
      advance: x.q.advance ?? null, hours: x.q.hours ?? x.b.opt.hours, verdict: x.q.experience ?? null,
    })).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    if (offers.length) masters.push({ partner: e.p, offers, morePackages: e.morePackages })
    else unavailable.push({ partner: e.p, reason: mine.map(x => x.q?.reasons?.[0]).find(Boolean) ?? 'Not available on your date' })
  }
  return { ask, tradeId, page, total: eligible.length, more: (page + 1) * PAGE < eligible.length,
    masters: withHighlights(masters), close, unavailable, range: rangeOf(masters) }
}

/* ── The differences ────────────────────────────────────────────────── */

const INC = { album: 'printed album', prints: 'instant prints', same_day: 'same-day edit', drone: 'drone shots',
  custom_script: 'script written for your event', pre_event_call: 'call before the event' }
export const inclusionLabel = x => INC[x] ?? String(x).replace(/_/g, ' ')

const inr = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')

/** What one package adds over another, and for how much. */
export function diffOf(o, base) {
  return {
    price: o.price != null && base.price != null ? o.price - base.price : null,
    hours: (o.hours ?? 0) - (base.hours ?? 0),
    adds: (o.inclusions ?? []).filter(x => !(base.inclusions ?? []).includes(x)),
    drops: (base.inclusions ?? []).filter(x => !(o.inclusions ?? []).includes(x)),
  }
}

/** "+₹3,600 for 2 more hours and a printed album". */
export function diffText(d) {
  const gets = [d.hours > 0 ? `${d.hours} more hour${d.hours === 1 ? '' : 's'}` : null, ...d.adds.map(inclusionLabel)].filter(Boolean)
  const loses = [d.hours < 0 ? `${-d.hours} fewer hour${d.hours === -1 ? '' : 's'}` : null, ...d.drops.map(x => `no ${inclusionLabel(x)}`)].filter(Boolean)
  const money = d.price == null ? '' : d.price > 0 ? `+${inr(d.price)}` : d.price < 0 ? `${inr(-d.price)} less` : 'Same price'
  const join = xs => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0])
  return [money, gets.length ? `for ${join(gets)}` : null, loses.length ? `(${join(loses)})` : null].filter(Boolean).join(' ')
}

function withHighlights(masters) {
  const heads = masters.map(m => m.offers[0])
  const best = (vals, pick) => (vals.length > 1 && new Set(vals).size > 1 ? pick(...vals) : null)
  const minP = best(heads.map(h => h.price).filter(v => v != null), Math.min)
  const maxH = best(heads.map(h => h.hours ?? 0), Math.max)
  const maxR = best(masters.map(m => m.partner.rating).filter(v => v != null), Math.max)
  const minK = best(masters.map(m => m.partner.distanceKm).filter(v => v != null), Math.min)
  return masters.map((m, i) => {
    const h = heads[i]
    const badges = [
      minP != null && h.price === minP && 'Lowest price', maxH != null && (h.hours ?? 0) === maxH && 'Most hours',
      maxR != null && m.partner.rating === maxR && 'Highest rated', minK != null && m.partner.distanceKm === minK && 'Nearest',
    ].filter(Boolean)
    return { ...m, headline: h, badges, extras: m.offers.slice(1).map(o => ({ ...o, vs: diffOf(o, h) })) }
  })
}

function rangeOf(masters) {
  const v = masters.map(m => m.offers[0].price).filter(x => x != null)
  return v.length ? { lo: Math.min(...v), hi: Math.max(...v), n: masters.length } : null
}

/**
 * The comparison table for 2–4 picked offers: [{ partner, offer }].
 * Each row knows whether its values differ — the table highlights those and
 * mutes the rest — and which column is best, marked only when they differ.
 */
export function compareRows(items) {
  const incs = [...new Set(items.flatMap(x => x.offer.inclusions ?? []))]
  const spec = [
    ['Price', x => x.offer.price, 'min', v => (v == null ? 'They quote' : inr(v))],
    ['Hours', x => x.offer.hours, 'max', v => (v == null ? '—' : `${v} h`)],
    ['Per hour', x => (x.offer.price && x.offer.hours ? Math.round(x.offer.price / x.offer.hours) : null), 'min', v => (v == null ? '—' : inr(v))],
    ...incs.map(k => [`Includes ${inclusionLabel(k)}`, x => (x.offer.inclusions ?? []).includes(k), 'true', v => (v ? 'Yes' : 'No')]),
    ...(items.some(x => x.offer.capacity) ? [['Holds', x => x.offer.capacity ?? null, 'max', v => (v == null ? '—' : `${v} guests`)]] : []),
    ['Rating', x => x.partner.rating, 'max', v => (v == null ? 'New' : `${v.toFixed(1)} ★`)],
    ['Reviews', x => x.partner.reviews, 'max', v => (v == null ? '—' : String(v))],
    ['Distance', x => x.partner.distanceKm, 'min', v => (v == null ? '—' : `${v.toFixed(1)} km`)],
    ['Booking', x => (x.offer.path === 'INSTANT' ? 1 : 0), 'max', v => (v ? 'Instant' : 'They accept first')],
    ['Advance', x => x.partner.advancePct, 'min', v => (v == null ? '—' : `${v}%`)],
    ['Replies within', x => x.partner.quoteHours, 'min', v => (v == null ? '—' : `${v} h`)],
    ['Cancellation', x => (x.partner.cancellation ? String(x.partner.cancellation) : null), 'none', v => v ?? '—'],
  ]
  return spec.map(([label, get, dir, fmt]) => {
    const raw = items.map(get)
    const known = raw.filter(v => v != null)
    const differs = new Set(raw.map(v => JSON.stringify(v ?? null))).size > 1
    /* 'none': shown and highlighted when different, never ranked — a cancellation policy is not "better" by a number. */
    const target = !differs || !known.length || dir === 'none' ? null : dir === 'min' ? Math.min(...known) : dir === 'max' ? Math.max(...known) : true
    return { label, values: raw.map(fmt), differs, best: raw.map(v => target != null && v === target) }
  })
}
