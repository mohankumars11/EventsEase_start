/**
 * Sambramo's customer price (Mohan, 2026-10-28 — "the Zomato model").
 *
 *   customer price = partner price + Sambramo's margin
 *
 * The partner publishes their price (₹100) and keeps everything they keep
 * today: `quoted_amount_paise` stays their price, `partner_amount_paise`
 * their share, the 8% fee as before — the partner app does not change.
 * The customer sees one figure, the LIST price, stored per booking line in
 * `pricing_snapshot.list_paise`. The bill shows "Booking fee ₹0", which is
 * true: nothing is added at the end.
 *
 * The margin is a % by trade, falling with how big a ticket the trade
 * usually is — a ₹10 lakh wedding is compared rupee by rupee and is where
 * a customer phones the partner directly; a ₹15k balloon set-up is a
 * convenience buy. `sambramo_margins` (migration 193) overrides any trade,
 * in any city, without an app update; these are the defaults.
 *
 * OFFERS COME ONLY OUT OF THE MARGIN. No voucher ever takes a line below
 * the partner's own price, so the partner is always paid in full, the 8%
 * is always earned, and settlement (migration 139: held ≥ quoted) holds.
 *
 * This file is imported by the API AND by the customer app
 * (src/customer/lib/market.js, Checkout), so the card, the bill and the
 * Razorpay order are computed by the same code.
 */

export const MARGIN_BANDS = { everyday: 0.33, mid: 0.20, big: 0.10 }

/* Client slug → engine code, so either side can ask by what it has. */
export const TRADE_CODE = {
  catering_food: 'E01', photography: 'E02', videography: 'E03', decoration_floral: 'E04', venue: 'E05',
  dj_music: 'E06', live_entertainment: 'E07', bridal_makeup_hair: 'E08', wedding_planning: 'E09',
  tent_furniture: 'E10', invitation_printing: 'E11', transportation: 'E12', event_lighting: 'E13',
  cake_desserts: 'E14', mehendi_artist: 'E15', anchor_mc: 'E16', sound_av: 'E17', valet_parking: 'E18',
  security_services: 'E19', bar_beverages: 'E20', guest_services: 'E21', power_cooling: 'E22',
  safety_facilities: 'E23', priest_rituals: 'E24', gifts_favours: 'E25', trousseau_gift_packing: 'E26',
  mini_truck_pickup: 'L01', medium_large_goods_vehicle: 'L02', passenger_transport: 'L03',
  event_equipment_rental: 'L04', loading_unloading_crew: 'L05', warehouse_storage: 'L06',
  event_materials_supplier: 'L07', end_to_end_event_logistics: 'L08',
}

const BAND = {
  everyday: ['E04', 'E07', 'E08', 'E11', 'E14', 'E15', 'E20', 'E24', 'E25', 'E26'],
  mid: ['E02', 'E03', 'E06', 'E13', 'E16', 'E17', 'E18', 'E19', 'E21', 'E22', 'E23', 'L04', 'L07'],
  big: ['E01', 'E05', 'E09', 'E10', 'E12', 'L01', 'L02', 'L03', 'L05', 'L06', 'L08'],
}
const DEFAULT = Object.fromEntries(Object.entries(BAND).flatMap(([b, codes]) => codes.map(c => [c, MARGIN_BANDS[b]])))

/* `sambramo_margins` rows: { trade_code, city, pct } — city '*' is every city. */
let overrides = {}
export function setMarginOverrides(rows) {
  overrides = {}
  for (const r of rows ?? []) {
    const p = Number(r.pct)
    if (r.trade_code && p >= 0 && p <= 1) overrides[`${r.trade_code}|${String(r.city ?? '*').toLowerCase()}`] = p
  }
}

/** Read `sambramo_margins` (193) into the overrides — at most every 5 min;
 *  before 193, or offline, the defaults stand. Works with the app's
 *  supabase client and the server's alike. */
let loadedAt = 0
export async function loadMarginOverrides(db, maxAgeMs = 300000) {
  if (Date.now() - loadedAt < maxAgeMs) return
  loadedAt = Date.now()
  try {
    const { data, error } = await db.from('sambramo_margins').select('trade_code, city, pct')
    if (!error) setMarginOverrides(data)
  } catch { /* the defaults stand */ }
}

export const codeFor = trade => (TRADE_CODE[trade] ?? (/^[EL]\d{2}$/.test(String(trade ?? '')) ? trade : null))

/** The margin on a trade (as a fraction of the partner price), in a city. */
export function marginPct(trade, city = null) {
  const c = codeFor(trade)
  const o = overrides[`${c}|${String(city ?? '').toLowerCase()}`] ?? overrides[`${c}|*`]
  return o ?? DEFAULT[c] ?? MARGIN_BANDS.mid
}

/** Partner price → list price at a given margin, rounded UP to the rupee (never under the partner). */
export function toListAt(paise, pct) {
  const n = Number(paise) || 0
  // − 1e-7: ₹5,00,000 × 1.1 is 55000000.000000007 in floating point, not ₹5,50,001.
  return n > 0 ? Math.ceil((n * (1 + (Number(pct) || 0))) / 100 - 1e-7) * 100 : 0
}
/** Partner price → list price for a trade in a city. */
export const toList = (paise, trade, city = null) => toListAt(paise, marginPct(trade, city))
/** A customer's offer (list terms) → what the partner reads (their terms), down to the rupee. */
export function fromList(paise, trade, city = null) {
  const n = Number(paise) || 0
  return n > 0 ? Math.floor(n / (1 + marginPct(trade, city)) / 100) * 100 : 0
}

/** What a booked line costs the customer. Lines booked before list pricing: their quote. */
export const lineList = l => Number(l?.pricing_snapshot?.list_paise) || Number(l?.quoted_amount_paise) || 0
/** What confirms a booked line now: its advance in the same terms as lineList. */
export function lineAdvance(l) {
  const L = lineList(l)
  const s = l?.pricing_snapshot ?? {}
  const a = Number(s.list_paise ? s.list_advance_paise : s.advance_paise) || 0
  return a > 0 ? Math.min(L, a) : L
}

/**
 * A voucher on a basket. `lines`: [{ list, base, due }] — list price,
 * partner price (the floor) and what is being charged now (advance or
 * full). `voucher.terms`: { pct, cap_paise }.
 *
 * Returns per line { discount, charge }: `discount` is the line's whole
 * saving (recorded, and taken off its balance later), `charge` what is
 * paid now — the saving applies at the same rate to the advance and to the
 * balance, so neither payment carries all of it.
 */
export function applyOffer(lines, voucher) {
  const pct = Math.max(0, Math.min(100, Number(voucher?.terms?.pct) || 0)) / 100
  const cap = Number(voucher?.terms?.cap_paise) || Infinity
  const raw = lines.map(l => Math.max(0, l.list * pct))
  const sum = raw.reduce((a, b) => a + b, 0)
  const scale = sum > cap ? cap / sum : 1
  return lines.map((l, i) => {
    const room = Math.max(0, l.list - l.base)
    const discount = Math.floor(Math.min(raw[i] * scale, room) / 100) * 100
    const charge = l.list > 0 ? l.due - Math.round((discount * l.due) / l.list) : l.due
    return { discount, charge: Math.max(0, charge) }
  })
}

/** Voucher kinds that take money off a booking (the rest are for invitations). */
export const BOOKING_KINDS = ['welcome_pct', 'referral_pct']

/* ── When the money is due (Mohan, 2026-10-28) ─────────────────────────
   Under ₹25,000, or with the event 7 days away or less: paid in full now.
   Otherwise the customer chooses the advance (the partner's advance %,
   never under 20%) or the whole amount; the balance is due 7 days before
   the event. Every rupee is held in escrow until the event is delivered,
   then the partner's share and Sambramo's margin are released. The server
   (create-booking-payment) and the checkout both decide with payNow(). */
export const PAY_RULES = { fullBelowPaise: 2500000, fullWithinDays: 7, minAdvance: 0.2, balanceDaysBefore: 7 }
const istDay = d => new Date(`${String(d).slice(0, 10)}T00:00:00+05:30`)
export const daysUntil = (date, today = new Date()) => (date ? Math.floor((istDay(date) - today) / 864e5) : Infinity)
/** Can this line be paid as an advance + balance at all? */
export const canSplit = (list, eventDate, today = new Date()) =>
  list >= PAY_RULES.fullBelowPaise && daysUntil(eventDate, today) > PAY_RULES.fullWithinDays
/* The least a customer pays up front, by trade: at least what the partner
   must spend before the day. A materials advance (20261013_01) is paid to
   the partner out of what the customer has put into escrow, so a
   caterer's groceries are never floated on a 20% deposit. The partner's
   own advance % wins when it is higher. */
const ADVANCE_FLOOR = {
  1: ['E11', 'E24'],                                              // printing starts at once; dakshina + samagri
  0.5: ['E01', 'E04', 'E05', 'E14', 'E20', 'E25', 'E26', 'L07'],  // buys goods before the day; a venue turns others away
  0.3: ['E07', 'E08', 'E09', 'E10', 'E13', 'E15', 'E21'],         // light consumables, props, kits
}
const FLOOR_OF = Object.fromEntries(Object.entries(ADVANCE_FLOOR).flatMap(([pct, codes]) => codes.map(c => [c, Number(pct)])))
/** The minimum advance for a trade, as a fraction of the price (labour, equipment, vehicles: 20%). */
export const advanceFloor = trade => Math.max(PAY_RULES.minAdvance, FLOOR_OF[codeFor(trade)] ?? 0)

/** What a line is charged now. `advance` ≥ list (or none) means the partner takes it in full. */
export function payNow({ list, advance, eventDate, trade = null }, { full = false, today = new Date() } = {}) {
  const floor = advanceFloor(trade)
  if (full || floor >= 1 || !canSplit(list, eventDate, today) || !(advance > 0) || advance >= list) return list
  return Math.min(list, Math.max(advance, Math.ceil((list * floor) / 100) * 100))
}
/** The day the balance is due: 7 days before the event. */
export function balanceDueOn(eventDate) {
  if (!eventDate) return null
  const d = istDay(eventDate)
  d.setDate(d.getDate() - PAY_RULES.balanceDaysBefore)
  return d
}
