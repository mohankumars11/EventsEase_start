import { GENERATED_MARKET_INDEX } from '../config/generatedMarketIndex'

/**
 * Prices that move, and an honest account of how far they move.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS ASKED FOR, AND WHAT IS ACTUALLY BUILDABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The ask was: make every price dynamic, updated daily from live market
 * conditions, and say so on the home screen.
 *
 * Half of that is real and is built here. The other half is not, and
 * pretending otherwise would be the most expensive kind of feature — one
 * that shows a customer a number, calls it live, and is quietly making it up.
 *
 * WHAT IS REAL. The single largest variable cost in this catalogue is food,
 * and food cost is provisions (see data/cateringModel.js — provisions are
 * ~58% of a plate). Provision cost genuinely does move week to week, and the
 * Government of India publishes it: Agmarknet daily mandi arrivals and modal
 * prices, on data.gov.in, free, with an API key. `scripts/refresh-market-
 * rates.mjs` pulls the commodities that actually drive an Indian catering
 * plate — rice, tur dal, onion, tomato, potato, edible oil, milk — for
 * Karnataka markets, weights them by how much of a plate each represents,
 * and writes a single `provisions` multiplier against a committed baseline.
 *
 * WHAT IS NOT. There is no public feed for what a decorator charges for
 * drape work in Bengaluru this week, what a photographer's day rate is, or
 * what a pandal costs. Those move with wages and demand, not with a
 * published index. So they carry a multiplier of exactly 1.00 and this file
 * says so, rather than inventing a number that looks alive.
 *
 * GST IS NOT A MARKET RATE. It is statutory — 5% on catering without input
 * credit, 18% on most services — and it changes when the Council changes it,
 * which is a code change and a migration, not a daily poll. It stays in
 * data/taxes.js. An "income tax API" has nothing to do with what an event
 * costs and is not modelled anywhere.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULES THIS LAYER FOLLOWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1. A multiplier is always relative to a COMMITTED baseline. The rates in
 *    cuisineMenus.js and servicePricing.js stay the source of truth; this
 *    only scales them. So a failed refresh degrades to exactly today's
 *    behaviour rather than to zero.
 *
 * 2. It is clamped. ±18% is wide enough to carry a real onion spike and
 *    narrow enough that a bad parse or a single freak mandi print cannot
 *    double somebody's quote while nobody is looking.
 *
 * 3. It is dated, sourced and shown. Anything that renders a moved price
 *    must be able to say where the number came from and when — see
 *    `marketNote()`. A live-looking price with no provenance is worse than
 *    a static one, because the customer cannot argue with it.
 *
 * 4. Stale means off. Past `MAX_AGE_DAYS` the index reverts to 1.00 and
 *    reports itself stale. A three-week-old "live" price is a lie with a
 *    timestamp on it.
 */

/** How far a multiplier is ever allowed to move the committed baseline. */
const CLAMP = 0.18

/** Past this, the index is not evidence of anything. */
const MAX_AGE_DAYS = 10

/** What each cost component tracks, and whether anything actually feeds it. */
export const COMPONENTS = {
  provisions: {
    label: 'Groceries and provisions',
    tracked: true,
    source: 'Agmarknet daily mandi prices (data.gov.in), Karnataka',
  },
  kitchen: {
    label: 'Cooks and kitchen',
    tracked: false,
    source: 'Wage-linked — no public daily feed; held at baseline',
  },
  service: {
    label: 'Serving and logistics',
    tracked: false,
    source: 'Wage-linked — no public daily feed; held at baseline',
  },
  decor: {
    label: 'Decoration and flowers',
    tracked: false,
    source: 'Flower rates move daily but are not published as an open feed; held at baseline',
  },
}

const clamp = n => Math.min(1 + CLAMP, Math.max(1 - CLAMP, n))

function ageInDays(iso) {
  if (!iso) return Infinity
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return Infinity
  return (Date.now() - then) / 86_400_000
}

/**
 * The index as it should actually be applied right now.
 *
 * Never throws and never returns undefined: a missing, malformed or stale
 * generated file resolves to every multiplier at 1.00, which is the
 * committed baseline and is always a defensible price.
 */
export function marketIndex() {
  const raw = GENERATED_MARKET_INDEX ?? {}
  const age = ageInDays(raw.asOf)
  const stale = age > MAX_AGE_DAYS
  const live = !!raw.asOf && !stale

  const multipliers = {}
  for (const key of Object.keys(COMPONENTS)) {
    const value = Number(raw.multipliers?.[key])
    multipliers[key] = live && Number.isFinite(value) && value > 0 ? clamp(value) : 1
  }

  return {
    live,
    stale: !!raw.asOf && stale,
    asOf: raw.asOf ?? null,
    ageDays: Number.isFinite(age) ? Math.floor(age) : null,
    basket: raw.basket ?? [],
    multipliers,
  }
}

/** The multiplier for one component, with every failure resolving to 1.00. */
export function rateFactor(component) {
  return marketIndex().multipliers[component] ?? 1
}

/**
 * One sentence a customer can read, wherever a moved price is shown.
 *
 * Deliberately says what is tracked AND what is not. "Prices update with the
 * market" on its own would imply the photographer's rate moves daily, which
 * it does not, and a customer who later learns that stops believing the part
 * that was true.
 */
export function marketNote() {
  const index = marketIndex()
  if (!index.live) {
    return {
      tone: 'baseline',
      headline: 'Priced at our published rates',
      detail: 'Researched Bengaluru and Mysuru market rates. Your coordinator confirms every line against live vendor quotes before anything is booked.',
    }
  }
  const move = Math.round((index.multipliers.provisions - 1) * 100)
  const direction = move > 0 ? 'up' : move < 0 ? 'down' : 'level'
  return {
    tone: 'live',
    headline:
      move === 0
        ? 'Grocery rates are level this week'
        : `Grocery rates are ${Math.abs(move)}% ${direction} this week`,
    detail: `Food is priced against Agmarknet mandi rates, read ${index.ageDays === 0 ? 'today' : `${index.ageDays} day${index.ageDays === 1 ? '' : 's'} ago`}. Cooks, decor and photography are at our published rates — those move with wages, not with a daily index.`,
    asOf: index.asOf,
    basket: index.basket,
  }
}
