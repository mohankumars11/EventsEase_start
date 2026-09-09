#!/usr/bin/env node
/**
 * Every service asks its own questions, and asks each one once.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FAULT THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * Six of sixty-eight services had their own questions; the other
 * sixty-two inherited their trade's. That is how "Vehicle decoration"
 * came to ask about stage flooring, table centrepieces and dry ice, and
 * how a candle-setup artist was asked about mandap pillars.
 *
 * A partner filling that in learns two things: the app does not know
 * what they do, and their answers do not matter. Both were true.
 *
 * ── What it checks ───────────────────────────────────────────────────
 *   1  every service in TRADE_FOR_SERVICE has a question set
 *   2  no service asks the same group id twice
 *   3  no group offers the same option id twice
 *   4  no group offers the same LABEL twice — a duplicate id is caught
 *      by the registry, a duplicate label is only caught by a partner
 *      staring at two identical choices
 *   5  every id is [a-z0-9_.+-], because they are minted into
 *      SBM-SPG / SBM-SPC and a stray character breaks the registry
 *   6  every group has at least two choices — a question with one
 *      answer is not a question
 *
 * ── Sabotage test ────────────────────────────────────────────────────
 *   node scripts/check-service-questions.mjs --sabotage
 */
import { SPECS_BY_SERVICE } from '../src/data/partnerServiceSpecs.js'
import { TRADE_FOR_SERVICE } from '../src/config/vendor.js'

const ID = /^[a-z0-9_.+-]+$/

function audit(specs) {
  const bad = []
  const services = Object.keys(TRADE_FOR_SERVICE)

  for (const svc of services) {
    const groups = specs[svc]
    if (!Array.isArray(groups) || !groups.length) {
      bad.push(`${svc}: no questions of its own — it inherits its trade's`)
      continue
    }
    const gseen = new Set()
    for (const g of groups) {
      if (!ID.test(g.id)) bad.push(`${svc}.${g.id}: group id is not a plain slug`)
      if (gseen.has(g.id)) bad.push(`${svc}: asks "${g.id}" twice`)
      gseen.add(g.id)

      if (!g.question) bad.push(`${svc}.${g.id}: no question text`)
      if (!Array.isArray(g.choices) || g.choices.length < 2) {
        bad.push(`${svc}.${g.id}: fewer than two choices — that is not a question`)
        continue
      }
      const cseen = new Set()
      const lseen = new Set()
      for (const c of g.choices) {
        if (!ID.test(c.id)) bad.push(`${svc}.${g.id}.${c.id}: option id is not a plain slug`)
        if (cseen.has(c.id)) bad.push(`${svc}.${g.id}: option id "${c.id}" twice`)
        cseen.add(c.id)
        const label = String(c.label ?? '').trim().toLowerCase()
        if (!label) bad.push(`${svc}.${g.id}.${c.id}: no label`)
        else if (lseen.has(label)) bad.push(`${svc}.${g.id}: two options labelled "${c.label}"`)
        lseen.add(label)
      }
    }
  }
  return { bad, services }
}

if (process.argv.includes('--sabotage')) {
  const victim = Object.keys(TRADE_FOR_SERVICE)[0]
  const broken = { ...SPECS_BY_SERVICE }
  delete broken[victim]
  const { bad } = audit(broken)
  if (!bad.some(b => b.startsWith(`${victim}:`))) {
    console.error('✗ SABOTAGE SURVIVED — this guard does not work')
    process.exit(1)
  }
  console.log('✓ sabotage caught: the guard bites')
  process.exit(0)
}

const { bad, services } = audit(SPECS_BY_SERVICE)
if (bad.length) {
  for (const b of bad) console.error(`  ✗ ${b}`)
  console.error(`\n✗ ${bad.length} problem(s) across ${services.length} services.`)
  process.exit(1)
}

const groups = services.reduce((n, s) => n + SPECS_BY_SERVICE[s].length, 0)
const options = services.reduce((n, s) =>
  n + SPECS_BY_SERVICE[s].reduce((m, g) => m + g.choices.length, 0), 0)
console.log(`  ✓ all ${services.length} services ask their own questions — ${groups} questions, ${options} options`)
