#!/usr/bin/env node
/**
 * The money rules of list pricing + vouchers, end to end, without a
 * database:   node scripts/check-list-pricing.mjs
 *
 * For every trade, a spread of partner prices, every voucher, and both an
 * advance+balance and a pay-in-full journey, it walks the same code the
 * server runs (api/_lib/listPrice.js) and asserts:
 *   1. the customer never pays less than the partner's price (offers come
 *      only out of the margin), so settlement's held ≥ quoted holds;
 *   2. the partner's Route shares add up to exactly their amount;
 *   3. the balance never charges a saving back (advance + balance = list − saving);
 *   4. Sambramo keeps ≥ its 8% fee on every booking;
 *   5. caps hold: welcome ≤ ₹2,500, referral ≤ ₹2,500 / ₹1,000.
 */
import { TRADE_CODE, toList, applyOffer, marginPct, payNow, advanceFloor } from '../api/_lib/listPrice.js'

const FEE = 0.08
const VOUCHERS = {
  none: null,
  welcome: { terms: { pct: 25, cap_paise: 250000 } },
  ref25: { terms: { pct: 25, cap_paise: 250000 } },
  ref5: { terms: { pct: 5, cap_paise: 100000 } },
}
const PRICES = [99900, 250000, 750000, 1500000, 5000000, 20000000, 100000000] // ₹999 … ₹10 lakh
let n = 0, bad = 0
const fail = (m, ctx) => { bad++; if (bad <= 12) console.log('  ✗', m, JSON.stringify(ctx)) }

for (const trade of Object.keys(TRADE_CODE)) for (const P of PRICES) for (const [vk, v] of Object.entries(VOUCHERS)) for (const advPct of [0, 30]) {
  n++
  const partner = Math.round(P * (1 - FEE))
  const L = toList(P, trade)
  const advPartner = advPct ? Math.min(L, Math.ceil((L * advPct) / 100 / 100) * 100) : L
  const advList = payNow({ list: L, advance: advPartner, eventDate: '2027-06-01', trade }, { today: new Date('2026-11-01') })
  if (advList < L && advList < Math.ceil(L * advanceFloor(trade) / 100) * 100) fail('advance below the trade floor', { trade, L, advList })
  if (L < 2500000 && advList !== L) fail('under ₹25,000 not paid in full', { trade, L, advList })
  const [o] = v ? applyOffer([{ list: L, base: P, due: advList }], v) : [{ discount: 0, charge: advList }]
  const net = L - o.discount
  const balance = net - o.charge          // create-booking-payment: list − saving − held
  const paid = o.charge + Math.max(0, balance)
  const ctx = { trade, P, vk, advPct, L, discount: o.discount, charge: o.charge, balance }
  if (net < P) fail('customer below partner price', ctx)
  if (paid !== net) fail('advance + balance ≠ list − saving', ctx)
  if (balance < 0) fail('negative balance', ctx)
  const share1 = Math.min(o.charge, Math.floor((o.charge * partner) / net))
  const share2 = balance > 0 ? Math.min(balance, Math.floor((balance * partner) / net)) : 0
  if (Math.abs(share1 + share2 - partner) > 1) fail('route shares ≠ partner amount', { ...ctx, share1, share2, partner })
  if (net - partner < Math.floor(P * FEE) - 1) fail('Sambramo below its 8% fee', ctx)
  const cap = v?.terms?.cap_paise ?? Infinity
  if (o.discount > cap) fail('cap exceeded', ctx)
}

console.log(`${n} journeys, ${bad} failures`)
console.log('\nMargin by trade (default): ' + [...new Set(Object.keys(TRADE_CODE).map(t => marginPct(t)))].map(p => `${Math.round(p * 100)}%`).join(' / '))
for (const [t, P] of [['decoration_floral', 1500000], ['photography', 5000000], ['catering_food', 50000000], ['wedding_planning', 100000000]]) {
  const L = toList(P, t), [w] = applyOffer([{ list: L, base: P, due: L }], VOUCHERS.welcome)
  console.log(`  ${t.padEnd(18)} partner ₹${(P / 100).toLocaleString('en-IN').padStart(9)} → Sambramo price ₹${(L / 100).toLocaleString('en-IN').padStart(9)} · first booking pays ₹${((L - w.discount) / 100).toLocaleString('en-IN')} · Sambramo keeps ₹${((L - Math.round(P * (1 - FEE))) / 100).toLocaleString('en-IN')} (${Math.round(((L - P * (1 - FEE)) / L) * 100)}%)`)
}
process.exit(bad ? 1 : 0)
