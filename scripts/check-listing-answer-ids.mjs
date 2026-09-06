#!/usr/bin/env node
/**
 * Fill in every question on the Listing tab, for every trade, and check
 * the saved answer carries an id.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY SIMULATE THE WHOLE FLOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Checking that catalogueIds.generated.js contains an id for every
 * question proves nothing about what a partner's listing stores. The two
 * are joined by a SCOPE that is reconstructed at submit time — a service
 * group arrives namespaced `serviceId:groupId`, an ops group arrives
 * bare and has to be attributed to a trade AND a screen — and it is that
 * reconstruction, not the id table, that decides whether an answer is
 * readable later.
 *
 * So this ticks every choice of every question the way a partner would,
 * for all 24 trades, and asserts nothing lands unresolved.
 *
 *   node scripts/check-listing-answer-ids.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const P   = await load('src/data/partnerCatalogue.js')
const S   = await load('src/data/partnerSpecs.js')
const SS  = await load('src/data/partnerServiceSpecs.js')
const OPS = await load('src/data/partnerOperations.js')
const M   = await load('src/data/cateringMenus.js')
const L   = await load('src/lib/listingAnswerIds.js')

const trades = P.TRADES.map(t => typeof t === 'string' ? t : (t.name ?? t.id))

const fails = []
let questions = 0, answers = 0, exacts = 0

for (const trade of trades) {
  const picked = (P.offeringsForTrade(trade) ?? []).map(o => o.serviceId)
  const groups = SS.specsForServices(picked, S.specsForTrade(trade))
  const opsScreens = OPS.operationScreensFor(trade) ?? []

  /* Answer everything, the way a thorough partner would: every choice of
     every question, plus an exact number wherever one is offered. */
  const detail = {}
  for (const g of groups) {
    detail[g.id] = g.type === 'multi' ? (g.choices ?? []).map(c => c.id) : g.choices?.[0]?.id
  }
  /* Keyed the way OperationsStep keys it. Filling g.id here instead
     would test a UI that no longer exists and pass while the real one
     lost answers. */
  for (const s of opsScreens) {
    for (const g of s.groups ?? []) {
      const k = g.stateKey ?? g.id
      detail[k] = g.type === 'multi' ? (g.choices ?? []).map(c => c.id) : g.choices?.[0]?.id
    }
  }

  const isCatering = trade === 'Catering & Food'
  const out = L.listingAnswerIds({
    trade, groups, opsScreens, detail,
    kitchen: isCatering ? 'both' : null,
    menus: isCatering ? (M.ALL_MENUS ?? []).map(m => m.id) : [],
    counters: isCatering ? (M.FOOD_COUNTERS ?? []).map(c => c.id) : [],
  })

  questions += out.answers.length
  answers += out.answers.reduce((a, x) => a + (x.a?.length ?? 0), 0)

  /* Every question a partner answered must come back with an id. */
  const asked = new Set([
    ...groups.map(g => g.id),
    ...opsScreens.flatMap(s => (s.groups ?? []).map(g => g.stateKey ?? g.id)),
    ...(isCatering ? ['kitchen'] : []),
  ])
  const answered = new Set(out.answers.map(x => x.q))
  if (out.unresolved.length)
    fails.push(`${trade}: ${out.unresolved.length} unresolved — ${out.unresolved.slice(0, 4).join(', ')}`)
  if (answered.size !== asked.size)
    fails.push(`${trade}: answered ${answered.size} of ${asked.size} questions`)
  if (new Set(out.answers.map(x => x.q)).size !== out.answers.length)
    fails.push(`${trade}: the same question id appears twice`)
}

/* An exact number must survive as a number, and must not be mistaken for
   a choice id — the field and the chips deliberately share one value. */
{
  const trade = 'Photography'
  const opsScreens = OPS.operationScreensFor(trade) ?? []
  const g = opsScreens.flatMap(s => s.groups ?? []).find(x => x.exact)
  const out = L.listingAnswerIds({
    trade, groups: [], opsScreens, detail: { [g.stateKey ?? g.id]: '9' },
  })
  const e = out.answers[0]
  exacts = e?.n
  if (e?.n !== 9) fails.push(`an exact number came back as ${JSON.stringify(e?.n)}, not 9`)
  if (e?.a) fails.push('an exact number was also read as a choice id')
  if (out.unresolved.length) fails.push('an exact number left something unresolved')
}

/* Two trades asking the same-looking question must not collide. */
{
  const key = t => {
    const s = OPS.operationScreensFor(t).find(x => (x.groups ?? []).some(g => g.id === 'time_limits'))
    const g = s.groups.find(g => g.id === 'time_limits')
    return g.stateKey ?? g.id
  }
  const a = L.listingAnswerIds({
    trade: 'Photography', opsScreens: OPS.operationScreensFor('Photography'),
    detail: { [key('Photography')]: ['early'] },
  })
  const b = L.listingAnswerIds({
    trade: 'Security Services', opsScreens: OPS.operationScreensFor('Security Services'),
    detail: { [key('Security Services')]: ['early'] },
  })
  const qa = a.answers[0]?.q, qb = b.answers[0]?.q
  const aa = a.answers[0]?.a?.[0], ab = b.answers[0]?.a?.[0]
  if (!qa || !qb || qa === qb)
    fails.push(`"time_limits" gave both trades the same question id (${qa})`)
  if (!aa || !ab || aa === ab)
    fails.push(`"early" gave both trades the same answer id (${aa})`)
  console.log(`\n  the same-looking question, two trades:`)
  console.log(`    Photography       time_limits/early → ${qa} / ${aa}`)
  console.log(`    Security Services time_limits/early → ${qb} / ${ab}`)
}

console.log(`\n  ${trades.length} trades listed end to end`)
console.log(`  ${questions} questions answered · ${answers} answer ids · exact number kept as ${exacts}\n`)

if (fails.length) {
  console.error('  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('  Every answer a partner saves carries an id.\n')
