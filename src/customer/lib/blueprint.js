/**
 * What an occasion takes — the customer's plan (spec 2026-11-02, "occasion-
 * first catalogue").
 *
 * Built from the occasion's own template (data/templates.js: `must`,
 * `often`, `extra` — hand-curated for 131 templates covering every
 * occasion), then made proportionate to THIS event:
 *
 *   ESSENTIAL      the template's must — selected, "Let's arrange these"
 *   RECOMMENDED    the template's often — offered first, not selected
 *   OPTIONAL       the template's extra — "Make it extra special"
 *   CONDITIONAL    added only when a fact calls for it (a venue to find)
 *   NOT_RECOMMENDED  heavy operations for a small or home event, and
 *                  anything the template never names — only via "Add more"
 *
 * Rules, each a fact about the event, never a guess:
 *   - "Help me find one" puts a venue in the essentials; any other venue
 *     answer takes it out (they already have a place).
 *   - At home, or 60 guests or fewer: logistics, crews, goods vehicles,
 *     storage, security, safety, valet, power and hosts are not
 *     recommended (a home birthday needs none of them).
 *   - A priest brings the pooja materials and garlands (Mohan, 2026-11-02):
 *     with a priest in the plan, ritual materials are never listed.
 *
 * The customer's own picks always win: need → in; skip → out; have →
 * already arranged; later → saved for later.
 *
 * Every trade id here is the canonical one — this changes what is
 * recommended, never what a service IS.
 */
import { TRADES } from '../data/trades'
import { hasBlueprint, occasionPlan } from './occasionPlan'

const HEAVY = new Set([
  'end_to_end_event_logistics', 'loading_unloading_crew', 'medium_large_goods_vehicle', 'mini_truck_pickup', 'warehouse_storage',
  'security_services', 'safety_facilities', 'valet_parking', 'power_cooling', 'guest_services', 'transportation', 'passenger_transport',
])
const AT_HOME = new Set(['home', 'newhome'])

export function blueprint(o, picks = {}, event = {}) {
  /* Personal Celebrations are planned by their own blueprint (Category 1,
     data/lifeBlueprints.js): 31 individually mapped occasions, driven by
     the questions Event Details asked. It is the same shape out, so every
     screen downstream — Masters, the brief, review, checkout — reads it
     without knowing the difference. Everything else keeps the templates. */
  if (hasBlueprint(o.id)) return fromOccasionPlan(o, picks, event)

  const guests = Number(event.guests) || null
  const home = AT_HOME.has(o.where) || event.context?.venueType === 'home' || event.venueChoice === 'home'
  const small = home || (guests != null && guests <= 60)
  const needVenue = o.where === 'ask' && (['need', 'bookvenue'].includes(event.venueChoice) || (!event.venueChoice && event.venue === 'need'))
  const priest = [...o.must, ...o.often].includes('priest_rituals') || picks.priest_rituals === 'need'

  const status = {}
  const reason = {}
  for (const t of o.extra) status[t] = 'OPTIONAL'
  for (const t of o.often) status[t] = 'RECOMMENDED'
  for (const t of o.must) status[t] = 'ESSENTIAL'
  /* Personal celebrations are remembered in photographs (Mohan, 2026-11-02):
     photos are an essential there; video rides on the same card. */
  if (['life', 'wedding'].includes(o.category) && status.photography) status.photography = 'ESSENTIAL'
  if (needVenue) { status.venue = 'ESSENTIAL'; reason.venue = 'You asked us to find the place' }
  if (o.where !== 'ask' || (event.venueChoice && !['need', 'bookvenue'].includes(event.venueChoice))) delete status.venue
  if (small) for (const t of HEAVY) if (status[t]) { status[t] = 'NOT_RECOMMENDED'; reason[t] = home ? 'Not needed at home' : 'Not needed for a small event' }
  if (priest) delete status.event_materials_supplier

  const rows = TRADES.map(({ id: t }) => {
    const s = status[t] ?? 'NOT_RECOMMENDED'
    const p = picks[t]
    const base = s === 'ESSENTIAL' ? 'need' : 'off'
    const state = p === 'need' || p === 'have' || p === 'skip' || p === 'later' ? p : base
    return {
      tradeId: t, kind: s, reason: reason[t] ?? o.why?.[t] ?? null, state,
      addedByCustomer: p === 'need' && s !== 'ESSENTIAL', customerExcluded: p === 'skip', alreadyArranged: p === 'have', savedForLater: p === 'later',
      /* The 360-engine words the older screens read. */
      status: { ESSENTIAL: 'CORE', RECOMMENDED: 'CONDITIONAL', OPTIONAL: 'OPTIONAL', NOT_RECOMMENDED: 'NOT_DEFAULT' }[s],
    }
  })
  const order = t => (status[t] === 'ESSENTIAL' ? 0 : status[t] === 'RECOMMENDED' ? 1 : status[t] === 'OPTIONAL' ? 2 : 3)
  const needed = rows.filter(r => r.state === 'need').map(r => r.tradeId).sort((a, b) => order(a) - order(b))
  return {
    rows, needed,
    essential: rows.filter(r => r.kind === 'ESSENTIAL').map(r => r.tradeId),
    enhance: rows.filter(r => r.kind === 'RECOMMENDED' || r.kind === 'OPTIONAL').map(r => r.tradeId),
    small, home,
  }
}

/* ── Category 1 ───────────────────────────────────────────────────── */

const KIND = { essential: 'ESSENTIAL', recommended: 'RECOMMENDED', conditional: 'RECOMMENDED', optional: 'OPTIONAL' }
const STATUS = { ESSENTIAL: 'CORE', RECOMMENDED: 'CONDITIONAL', OPTIONAL: 'OPTIONAL', NOT_RECOMMENDED: 'NOT_DEFAULT' }

/**
 * The occasion blueprint, in the shape every older screen already reads.
 * `on` from the engine decides `state`, so a service the customer never
 * asked for — a priest at a housewarming, a bar at a bachelor party — is
 * not in `needed`, and no master is looked for.
 */
function fromOccasionPlan(o, picks, event) {
  const p = occasionPlan(o, { event, answers: event.answers ?? {}, picks })
  const byTrade = new Map()
  for (const r of [...p.recommended, ...p.arranged, ...p.hidden.map(h => ({ ...h, kind: 'hidden', on: false }))]) {
    const prev = byTrade.get(r.tradeId)
    if (!prev || (prev.kind === 'hidden' && r.kind !== 'hidden')) byTrade.set(r.tradeId, r)
  }
  /* An add-on that is on and maps to a trade is a real requirement. */
  for (const a of p.addons) if (a.on && a.tradeId && !byTrade.get(a.tradeId)?.on) byTrade.set(a.tradeId, { ...a, kind: 'optional', on: true })

  const rows = TRADES.map(({ id: t }) => {
    const r = byTrade.get(t)
    const pick = picks[t]
    const kind = !r || r.kind === 'hidden' ? 'NOT_RECOMMENDED' : r.kind === 'arranged' ? 'NOT_RECOMMENDED' : KIND[r.kind] ?? 'OPTIONAL'
    const state = pick === 'have' ? 'have' : pick === 'skip' ? 'skip' : pick === 'later' ? 'later' : r?.on ? 'need' : 'off'
    return {
      tradeId: t, kind, reason: r?.reason ?? o.why?.[t] ?? null, state,
      addedByCustomer: pick === 'need' && kind !== 'ESSENTIAL', customerExcluded: pick === 'skip',
      alreadyArranged: pick === 'have' || r?.kind === 'arranged', savedForLater: pick === 'later',
      hook: r?.hook ?? null, line: r?.line ?? null,
      status: STATUS[kind],
    }
  })
  const order = t => { const k = rows.find(r => r.tradeId === t)?.kind; return k === 'ESSENTIAL' ? 0 : k === 'RECOMMENDED' ? 1 : k === 'OPTIONAL' ? 2 : 3 }
  return {
    rows,
    needed: rows.filter(r => r.state === 'need').map(r => r.tradeId).sort((a, b) => order(a) - order(b)),
    essential: rows.filter(r => r.kind === 'ESSENTIAL').map(r => r.tradeId),
    enhance: rows.filter(r => r.kind === 'RECOMMENDED' || r.kind === 'OPTIONAL').map(r => r.tradeId),
    small: (Number(event.guests) || 0) <= 60, home: event.venueChoice === 'home',
    occasionPlan: p,
  }
}
