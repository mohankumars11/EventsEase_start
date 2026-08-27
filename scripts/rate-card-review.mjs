#!/usr/bin/env node
/**
 * Is the rate card right? Ask the masters, by watching what they decline.
 *
 *   node scripts/rate-card-review.mjs              # live decline data
 *   node scripts/rate-card-review.mjs --sweep      # simulate a price curve
 *
 * ══════════════════════════════════════════════════════════════════════
 * HOW A PLATFORM LEARNS A PRICE WITHOUT ASKING ANYBODY TO QUOTE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious answer to "I am not sure my rates are right" is to let
 * masters name their own. It is the wrong answer, for reasons set out at
 * length in lib/instantPricing.js: the customer's price stops being
 * comparable, "instant" becomes a negotiation, and first-accept-wins
 * silently turns into cheapest-wins.
 *
 * The right answer is that a DECLINE IS A PRICE SIGNAL. A master who
 * looks at ₹4,100 for a Saturday balloon setup and taps Pass has told
 * you something precise, for free, without a quote form. Enough of them
 * and you know the rate is under market — and by roughly how much.
 *
 * Migration 060 made this measurable by keeping three outcomes apart
 * where a lazier schema would have kept one:
 *
 *   DECLINED  looked at it, did not want it            → PRICE SIGNAL
 *   LOST      wanted it, somebody else was faster      → healthy market
 *   EXPIRED   never looked                             → attention problem
 *
 * Collapsing those into "did not accept" would make a thriving market
 * look like mass rejection, and would make a bad price look like an
 * engagement problem. Each calls for the opposite response.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A HEALTHY NUMBER LOOKS LIKE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not 100%. A trade where every master accepts instantly is a trade
 * being overpaid — the platform is leaving margin on the table and the
 * customer is paying for it.
 *
 * Not 40% either. Below about half, lines stop filling in wave one, the
 * customer waits through two widenings, and the product stops feeling
 * instant.
 *
 * The band worth aiming at is roughly 55–80% of masters who SAW an offer
 * choosing to take it. Below it, raise. Well above it, there is room to
 * come down — which is margin, or a lower price, or both.
 */
import { createClient } from '@supabase/supabase-js'
import { loadSrc, readEnv } from './lib/loadSrc.mjs'

const SWEEP = process.argv.includes('--sweep')
const db = createClient(readEnv('VITE_SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } })

const M = await loadSrc({
  'src/lib/instantPricing.js': ['priceLine'],
  'src/config/vendor.js':      ['tradeFor', 'SERVICES_FOR_TRADE'],
})

const pct = (a, b) => b === 0 ? '  — ' : (a / b * 100).toFixed(0).padStart(3) + '%'
const inr = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')

/* ══════════════════════════════════════════════════════════════════════
   1 · What the live network has actually said
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n  ══ LIVE DECLINE DATA ' + '═'.repeat(44) + '\n')

const { data: offers, error } = await db
  .from('dispatch_offers')
  // The FK is named explicitly because there are TWO between these
  // tables — dispatch_offers.line_id points at a line, and
  // booking_lines.accepted_offer_id points back at the winning offer.
  // Without the hint PostgREST refuses rather than guessing, which is
  // the right call: guessing would silently join the wrong direction.
  .select('status, partner_amount_paise, line_id, booking_lines!dispatch_offers_line_id_fkey!inner(trade, service_name)')

if (error) {
  console.error(`  could not read offers: ${error.message}\n`)
  process.exit(1)
}

if (!offers?.length) {
  console.log('  No offers yet. Run scripts/demo-scenario.mjs first.\n')
} else {
  const byTrade = {}
  for (const o of offers) {
    const t = o.booking_lines?.trade ?? 'unknown'
    byTrade[t] ??= { seen: 0, accepted: 0, declined: 0, lost: 0, expired: 0, offered: 0, sum: 0 }
    const b = byTrade[t]
    b.sum += o.partner_amount_paise
    if (o.status === 'ACCEPTED') { b.accepted++; b.seen++ }
    else if (o.status === 'DECLINED') { b.declined++; b.seen++ }
    else if (o.status === 'LOST') { b.lost++; b.seen++ }
    else if (o.status === 'EXPIRED') b.expired++
    else b.offered++
  }

  console.log('  trade                  offers  seen   took  passed   lost  never saw')
  console.log('  ' + '─'.repeat(72))
  for (const [t, b] of Object.entries(byTrade).sort((a, b2) => b2[1].seen - a[1].seen)) {
    const total = b.accepted + b.declined + b.lost + b.expired + b.offered
    console.log(
      `  ${t.padEnd(22)} ${String(total).padStart(5)} ${String(b.seen).padStart(5)} ` +
      `${pct(b.accepted, b.seen).padStart(6)} ${pct(b.declined, b.seen).padStart(7)} ` +
      `${String(b.lost).padStart(6)} ${String(b.expired).padStart(9)}`)
  }

  console.log('\n  Read it this way:')
  console.log('    took   55–80% is healthy. Under 50% the rate is probably low.')
  console.log('    passed a price signal. High and consistent = raise the rate.')
  console.log('    lost   competition. Healthy — several masters wanted it.')
  console.log('    never saw  an attention problem, not a price one. Push, not rupees.')

  const seenTotal = Object.values(byTrade).reduce((n, b) => n + b.seen, 0)
  const declinedTotal = Object.values(byTrade).reduce((n, b) => n + b.declined, 0)
  if (seenTotal > 0 && declinedTotal === 0) {
    console.log('\n  ⚠ Zero declines across the whole network.')
    console.log('    The seeded masters accept anything — they have no opinion about')
    console.log('    money. So this table cannot tell you whether the rates are right;')
    console.log('    it can only tell you the plumbing works. Run --sweep for a')
    console.log('    modelled curve, and treat the first fifty REAL masters as the')
    console.log('    measurement that actually matters.')
  }
}

/* ══════════════════════════════════════════════════════════════════════
   2 · What the card charges today, and where it sits
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n  ══ THE CARD, AT A 30-GUEST HOME BIRTHDAY ' + '═'.repeat(25) + '\n')

/**
 * Researched Bengaluru ranges for SHORT-LEAD, small-event work — the
 * band a real master would recognise. Deliberately kept here beside the
 * comparison rather than in the pricing engine: these are a reviewer's
 * benchmark, not a source of prices, and putting them in `data/` would
 * invite somebody to price from them.
 *
 * Replace these with quotes from three real Bengaluru masters before the
 * pilot takes money. That is the single highest-value hour anybody can
 * spend on this feature.
 */
const BENCHMARK = {
  decor:       [3500,  9000,  'balloon arch + backdrop, home setup'],
  cake:        [1200,  3000,  '1–2 kg designer cake'],
  photography: [5000,  9000,  '2 hours, candid, edited'],
  videography: [7000,  14000, '2 hours, edited reel'],
  dj:          [4000,  9000,  '2–3 hours, small PA'],
  mehendi:     [1000,  3000,  'one artist, 2 hours'],
  makeup:      [3000,  8000,  'one face, party makeup'],
  catering:    [12000, 21000, '30 plates, veg, served'],
  cooks:       [4000,  9000,  'cook only, family buys provisions'],
  drum:        [3000,  7000,  'small dhol group, 1 hour'],
  dining:      [2500,  5000,  '30 seats, tables and linen'],
  priest:      [2500,  7000,  'one pooja, home'],
}

console.log('  service        card      market band          verdict')
console.log('  ' + '─'.repeat(72))

const flags = []
for (const [id, [lo, hi, what]] of Object.entries(BENCHMARK)) {
  const q = M.priceLine({ serviceId: id, guestCount: 30, durationId: 'quick' })
  if (!q) { console.log(`  ${id.padEnd(14)} not priced`); continue }
  const r = q.rupees
  let verdict = 'in band'
  if (r < lo) { verdict = `LOW by ${Math.round((1 - r / lo) * 100)}%`; flags.push([id, r, lo, hi, 'low']) }
  else if (r > hi) { verdict = `HIGH by ${Math.round((r / hi - 1) * 100)}%`; flags.push([id, r, lo, hi, 'high']) }
  console.log(
    `  ${id.padEnd(14)} ${('₹' + r.toLocaleString('en-IN')).padStart(8)}  ` +
    `${('₹' + lo.toLocaleString('en-IN') + '–' + hi.toLocaleString('en-IN')).padEnd(18)} ${verdict}`)
}

if (flags.length) {
  console.log('\n  ── Needs attention ──────────────────────────────────────────')
  for (const [id, r, lo, hi, dir] of flags) {
    const target = dir === 'low' ? Math.round((lo + hi) / 2) : hi
    console.log(`    ${id.padEnd(14)} ₹${r.toLocaleString('en-IN')} → suggest ₹${target.toLocaleString('en-IN')}`)
    console.log(`      ${dir === 'low'
      ? 'masters will decline this and the line will not fill'
      : 'customers will compare us badly against a direct booking'}`)
  }
} else {
  console.log('\n  Every rate sits inside its researched band.')
}

/* ══════════════════════════════════════════════════════════════════════
   3 · The curve, modelled
   ══════════════════════════════════════════════════════════════════════ */
if (SWEEP) {
  const C = await loadSrc({
    'src/config/instantBooking.js': ['PLATFORM_FEE_RATE'],
    'src/config/legal.js':          ['TAX'],
  })
  const NET = (1 - C.PLATFORM_FEE_RATE) * (1 - C.TAX.tcsRate - C.TAX.tdsRate)

  console.log('\n  ══ ACCEPTANCE vs PRICE, MODELLED ' + '═'.repeat(32) + '\n')

  /* ── The thing this model exists to make obvious ───────────────────
   *
   * A master keeps about 83% of what the customer pays: 15% commission,
   * then TCS and TDS. So pricing AT the direct-booking rate offers a
   * master LESS than they would earn taking the job themselves — and the
   * only reason to accept is work they would not otherwise have had.
   *
   * That is a real business fact, not a modelling artefact, and it is
   * the single most important number on this page. Either the card sits
   * ABOVE the direct rate, or the platform is asking masters to pay for
   * the privilege of being found.
   *
   * The reservation price used here is therefore the LOW end of each
   * band — what a master takes on an otherwise empty Saturday — rather
   * than the middle. A master with a full calendar is not the one
   * answering a 45-second notification anyway. */
  console.log(`  A master keeps ${(NET * 100).toFixed(0)}% of what the customer pays`)
  console.log(`  (${(C.PLATFORM_FEE_RATE * 100).toFixed(0)}% commission, then TCS and TDS).`)
  console.log()
  console.log('  So at ×1.00 the card offers a master LESS than booking direct.')
  console.log('  They accept anyway only for work they would not otherwise have had —')
  console.log('  which is why the reservation price below is the LOW end of the band.')
  console.log()
  console.log('  multiplier  customer pays   master nets   accepts   4-line basket')
  console.log('  ' + '─'.repeat(66))

  for (const mult of [0.9, 1.0, 1.15, 1.3, 1.5, 1.75]) {
    const shares = []
    let pays = 0
    let nets = 0

    for (const id of ['decor', 'photography', 'dj', 'mehendi']) {
      const [lo] = BENCHMARK[id]
      const q = M.priceLine({ serviceId: id, guestCount: 30, durationId: 'quick' })
      const price = q.rupees * mult
      const net = price * NET
      pays += price
      nets += net
      // Floors spread from a hungry master (0.75 × low) to one who can
      // afford to wait (1.15 × low).
      const floorLo = lo * 0.75
      const floorHi = lo * 1.15
      shares.push(Math.max(0, Math.min(1, (net - floorLo) / (floorHi - floorLo))))
    }

    const basket = shares.reduce((a, b) => a * b, 1)
    const mean = shares.reduce((a, b) => a + b, 0) / shares.length

    console.log(
      `  ${('×' + mult.toFixed(2)).padStart(9)}  ` +
      `${('₹' + Math.round(pays).toLocaleString('en-IN')).padStart(12)}  ` +
      `${('₹' + Math.round(nets).toLocaleString('en-IN')).padStart(12)}  ` +
      `${pct(mean, 1).padStart(7)}   ` +
      `${pct(basket, 1)} ${'█'.repeat(Math.round(basket * 18))}`)
  }

  console.log()
  console.log('  Read the last column. The multiplier where a four-line basket still')
  console.log('  completes more than half the time is the floor worth launching on.')
  console.log('  Below it, masters decline and it looks like a supply problem.')
}

