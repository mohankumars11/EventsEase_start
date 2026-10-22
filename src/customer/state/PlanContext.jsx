/**
 * The customer's plan: the event they are planning, what it needs, and
 * which partner they have picked for each service.
 *
 * ── One event in focus, one partner per service ─────────────────────
 * A celebration is planned as one thing ("Haldi, Sat 14 Dec, 150 guests")
 * and every list in the app reads that event: a guest count changes what
 * a caterer costs, the date is what availability is checked against. So
 * the event lives here, once, rather than in each screen's state.
 *
 * A plan holds at most one partner per trade. Picking a second
 * photographer replaces the first — the basket is a plan for a day, not
 * a shopping cart that can accidentally hold two of them.
 *
 * ── Where it is kept ────────────────────────────────────────────────
 * This device only, until checkout — localStorage, guarded, because the
 * page must work when storage is off. The server copy begins when a line
 * is booked (booking_requests / booking_lines), which is what Plans reads
 * once a customer is signed in.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'sbm.cx.plan.v1'
/* `place`: where the event is ({ area, lat, lng, address }) — the engine checks travel and
   distance against it. `bookings`: what checkout sent, so Plans can show it at once. */
const EMPTY = { event: { occasionId: null, date: null, time: null, hours: null, guests: null, venue: 'need' }, place: null, picks: {}, basket: [], saved: [], bookings: [] }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    const s = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
    return { ...s, saved: (s.saved ?? []).filter(x => x && typeof x === 'object'), bookings: s.bookings ?? [] }
  } catch { return EMPTY }
}

const PlanContext = createContext(null)

export function PlanProvider({ children }) {
  const [state, setState] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage off */ } }, [state])

  const setEvent = useCallback(patch => setState(s => ({ ...s, event: { ...s.event, ...patch } })), [])

  /** need | have | skip, per occasion and trade. Undefined means "the template's default". */
  const setPick = useCallback((occasionId, tradeId, value) => setState(s => ({
    ...s, picks: { ...s.picks, [occasionId]: { ...(s.picks[occasionId] ?? {}), [tradeId]: value } },
  })), [])

  const add = useCallback((partner, occasionId = null) => setState(s => {
    const key = `${occasionId ?? 'solo'}:${partner.tradeId}`
    const line = {
      key, occasionId, tradeId: partner.tradeId, serviceId: partner.serviceId, name: partner.name, area: partner.area,
      cover: partner.cover, fromPaise: partner.fromPaise, fromKind: partner.fromKind, fromUnit: partner.fromUnit, fromLabel: partner.fromLabel,
      fromRef: partner.fromRef ?? null, qty: null, instant: partner.instant, advancePct: partner.advancePct,
      rating: partner.rating, quoteHours: partner.quoteHours, addedAt: Date.now(),
    }
    return { ...s, basket: [...s.basket.filter(l => l.key !== key), line] }
  }), [])
  const remove = useCallback(key => setState(s => ({ ...s, basket: s.basket.filter(l => l.key !== key) })), [])
  const setQty = useCallback((key, qty) => setState(s => ({ ...s, basket: s.basket.map(l => (l.key === key ? { ...l, qty } : l)) })), [])
  const setPlace = useCallback(place => setState(s => ({ ...s, place })), [])
  /* Lines that checkout booked or sent leave the basket and are remembered here. */
  const recordBookings = useCallback(results => setState(s => ({
    ...s,
    basket: s.basket.filter(l => !results.some(r => r.key === l.key && (r.lineId || r.quoteRequestId))),
    bookings: [...results.filter(r => r.lineId || r.quoteRequestId), ...s.bookings].slice(0, 60),
  })), [])
  const clearOccasion = useCallback(occasionId => setState(s => ({ ...s, basket: s.basket.filter(l => l.occasionId !== occasionId) })), [])
  /* Saved keeps a snapshot, so the Saved list renders without a fetch. */
  const toggleSaved = useCallback(partner => setState(s => {
    const has = s.saved.some(x => x.serviceId === partner.serviceId)
    const snap = { serviceId: partner.serviceId, tradeId: partner.tradeId, name: partner.name, cover: partner.cover, area: partner.area,
      rating: partner.rating, reviews: partner.reviews, fromPaise: partner.fromPaise, fromKind: partner.fromKind, fromUnit: partner.fromUnit,
      fromLabel: partner.fromLabel, instant: partner.instant, distanceKm: partner.distanceKm }
    return { ...s, saved: has ? s.saved.filter(x => x.serviceId !== partner.serviceId) : [...s.saved, snap] }
  }), [])

  const value = useMemo(() => ({
    ...state,
    setEvent, setPick, add, remove, setQty, setPlace, recordBookings, clearOccasion, toggleSaved,
    inBasket: (serviceId) => state.basket.some(l => l.serviceId === serviceId),
    lineFor: (occasionId, tradeId) => state.basket.find(l => l.key === `${occasionId ?? 'solo'}:${tradeId}`) ?? null,
    isSaved: serviceId => state.saved.some(x => x.serviceId === serviceId),
  }), [state, setEvent, setPick, add, remove, setQty, setPlace, recordBookings, clearOccasion, toggleSaved])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

/**
 * What an occasion needs, after the customer's own answers: the template's
 * must-haves are on unless they said they have it; the rest are off until
 * added. A venue they already have is never searched for.
 */
export function needsFor(occasion, picks = {}, event = {}) {
  const state = t => picks[t] ?? (occasion.must.includes(t) ? 'need' : 'off')
  const rows = [
    ...occasion.must.map(t => ({ tradeId: t, tier: 'must' })),
    ...occasion.often.map(t => ({ tradeId: t, tier: 'often' })),
    ...occasion.extra.map(t => ({ tradeId: t, tier: 'extra' })),
  ].map(r => ({ ...r, state: r.tradeId === 'venue' && event.venue === 'have' ? 'have' : state(r.tradeId) }))
  return { rows, needed: rows.filter(r => r.state === 'need').map(r => r.tradeId) }
}
