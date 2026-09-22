import { jobMoney } from './earningsStatement'
import { inRange, daysIn, shiftISO } from './earningsRange'
import { payoutState, OWED_STATES, SETTLED_STATES } from './payoutState'

/**
 * Every figure on the Earnings screen, added up once.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE PASS, ONE jobMoney() PER JOB
 * ══════════════════════════════════════════════════════════════════════
 *
 * The KPI cards, the chart, the by-service breakdown and the transaction
 * rows are four views of the same arithmetic. Computing them in four
 * components means four chances for one job to be counted differently —
 * which is exactly how this screen once showed a total that none of its
 * own rows added up to.
 *
 * So: one pass, `jobMoney()` called once per job, every output derived
 * from the same `netPaise`. If the headline and the list disagree after
 * this, the bug is in this file and nowhere else.
 *
 * Pure. No React, no Supabase, no `Date.now()` except through `now`. A
 * node guard can therefore assert the whole thing — see
 * `check-earnings-period.mjs`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * annualGrossInr IS A PARAMETER, AND MUST NEVER BE DERIVED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * It decides the s.194-O TDS waiver, and it is measured over the whole
 * FINANCIAL YEAR. Derived from the filtered rows instead, a partner who
 * taps "Today" would fall under the threshold, TDS would vanish, and
 * every net on screen would jump — the same job worth two different
 * amounts depending on a filter chip.
 *
 * It is computed once from the full row set by the caller and threaded
 * in. The guard asserts that this function does not compute it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT "EARNED" MEANS, AND WHAT IT DOES NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `earnedPaise` is net, for jobs that are not cancelled, dated inside
 * the range. It is what the partner will end up with, not what has
 * arrived — those are `paidPaise` and `pendingPaise`, kept apart on
 * purpose. A single "total earnings" figure that adds money a customer
 * has not paid to money already in a bank is a lie by aggregation, and
 * a partner planning their week needs the two apart.
 */

const ZERO = () => ({ net: 0, customer: 0, commission: 0, tax: 0, count: 0 })

/** The date a job is filed under. Event date, because that is the work. */
export const dateOf = row => row?.event_date?.slice(0, 10) ?? null

/**
 * @param rows  partner_jobs / partner_earnings rows
 * @param range from buildRange()
 * @param opts  { hasPan, annualGrossInr, claimBy, now, hasPrev }
 */
export function earningsSeries(rows = [], range, opts = {}) {
  const { hasPan = false, annualGrossInr = 0, claimBy = {}, now = Date.now() } = opts

  const money = row => jobMoney(row, { hasPan, annualGrossInr })

  /* ── One pass over everything, bucketed by window ──────────────────
     `all` is needed as well as `current`: the by-state totals a partner
     acts on ("ready to claim") are about money that exists NOW, not
     money dated inside a filter. Filtering "ready to claim" by "Today"
     would hide claimable money behind a chip, which is the opposite of
     what the screen is for. */
  const current = ZERO()
  const previous = ZERO()
  const byTrade = new Map()
  const byDay = new Map()
  const byState = {}
  const enriched = []

  for (const row of rows) {
    const state = payoutState(row, claimBy[row.line_id], now)
    const m = money(row)
    const d = dateOf(row)

    enriched.push({ row, state, money: m, date: d })

    /* Cancelled work is not a sale. It is excluded from every total, as
       `statement()` and `annualGrossInr()` already exclude it. */
    if (state === 'cancelled') continue

    const b = (byState[state] ??= ZERO())
    add(b, m)

    if (d && inRange(d, range.from, range.to)) {
      add(current, m)

      const trade = row.trade || row.service_name || 'Other'
      add((byTrade.get(trade) ?? byTrade.set(trade, ZERO()).get(trade)), m)

      const day = byDay.get(d) ?? byDay.set(d, { date: d, ...ZERO(), paid: 0 }).get(d)
      add(day, m)
      if (SETTLED_STATES.includes(state)) day.paid += m.netPaise
    } else if (d && inRange(d, range.prevFrom, range.prevTo)) {
      add(previous, m)
    }
  }

  /* ── The KPI four ──────────────────────────────────────────────────
     Pending is everything owed but not arrived, across ALL time, for the
     reason above. Paid and earned are range-scoped, because "how much
     did I make in September" is a question about September. */
  const owed = OWED_STATES.reduce((n, s) => n + (byState[s]?.net ?? 0), 0)
  const paidInRange = sumStatesInRange(enriched, SETTLED_STATES, range)

  const kpis = {
    earned:   card(current.net, previous.net, opts.hasPrev),
    paid:     card(paidInRange, sumStatesInRange(enriched, SETTLED_STATES, prevWindow(range)), opts.hasPrev),
    pending:  card(owed, null, false),
    jobs:     card(current.count, previous.count, opts.hasPrev),
  }

  return {
    kpis,
    totals: { current, previous, owed },
    byState,
    /* Dense: every day in the window, so a gap reads as a quiet day
       rather than as a missing bar. */
    series: denseDays(byDay, range),
    byTrade: rankTrades(byTrade, current.net),
    rows: enriched,
  }
}

function add(acc, m) {
  acc.net += m.netPaise
  acc.customer += m.customerPaise ?? 0
  acc.commission += m.commissionPaise ?? 0
  acc.tax += (m.tcsPaise ?? 0) + (m.tdsPaise ?? 0)
  acc.count += 1
}

function prevWindow(range) {
  return { from: range.prevFrom, to: range.prevTo }
}

function sumStatesInRange(enriched, states, r) {
  let n = 0
  for (const e of enriched) {
    if (!e.date || !states.includes(e.state)) continue
    if (inRange(e.date, r.from, r.to)) n += e.money.netPaise
  }
  return n
}

/**
 * A KPI value with its comparison.
 *
 * ── The three outcomes, and why none of them is "+100%" ─────────────
 *   hasPrev false  there was no earlier period. `delta` is null and the
 *                  card says so in words. A partner's first month is not
 *                  infinite growth.
 *   prev === 0     there was an earlier period and it was empty. That is
 *                  a real fact and reads "up from nothing" — but it has
 *                  no percentage, because dividing by zero does not
 *                  become a number by being rendered.
 *   otherwise      a percentage, rounded, signed.
 */
function card(value, prev, hasPrev) {
  if (!hasPrev || prev === null || prev === undefined) {
    return { value, prev: null, delta: null, reason: 'no-prior' }
  }
  if (prev === 0) {
    return { value, prev: 0, delta: null, reason: value > 0 ? 'from-nothing' : 'both-zero' }
  }
  return {
    value,
    prev,
    delta: Math.round(((value - prev) / Math.abs(prev)) * 100),
    reason: null,
  }
}

/** Every day in the window, zero-filled, in order. */
function denseDays(byDay, range) {
  const out = []
  const n = daysIn(range.from, range.to)
  /* Capped: a financial-year range is 365 points on a 390px phone, which
     is a bar per pixel. The chart groups above this; the guard asserts
     the sum survives grouping. */
  for (let i = 0; i < n && i < 400; i++) {
    const d = shiftISO(range.from, i)
    out.push(byDay.get(d) ?? { date: d, ...ZERO(), paid: 0 })
  }
  return out
}

/**
 * Trades, largest first, with the tail folded into one slice.
 *
 * Seven plus "Other", because the categorical palette is validated for
 * separation at that length and a donut with nineteen slices is a
 * colour-matching puzzle, not a breakdown.
 */
function rankTrades(byTrade, total) {
  const all = [...byTrade.entries()]
    .map(([trade, v]) => ({ trade, ...v, share: total > 0 ? v.net / total : 0 }))
    .sort((a, b) => b.net - a.net)

  if (all.length <= 8) return all

  const head = all.slice(0, 7)
  const tail = all.slice(7)
  const rest = tail.reduce((acc, t) => {
    acc.net += t.net; acc.customer += t.customer
    acc.commission += t.commission; acc.tax += t.tax; acc.count += t.count
    return acc
  }, { trade: 'Other', ...ZERO() })
  rest.share = total > 0 ? rest.net / total : 0
  rest.folded = tail.length
  return [...head, rest]
}
