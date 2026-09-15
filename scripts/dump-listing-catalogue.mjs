/* Dumps the whole "List your business" questionnaire — every trade, every
   offering, every question and every option — as one markdown document. */
import { TRADES, offeringsForTrade } from '../src/data/partnerCatalogue'
import { specsForTrade } from '../src/data/partnerSpecs'
import { SPECS_BY_SERVICE, hasServiceSpecs } from '../src/data/partnerServiceSpecs'
import { operationScreensFor } from '../src/data/partnerOperations'
import { SERVICE_UNITS } from '../src/config/vendor'

const out = []
const w = s => out.push(s)
let qTotal = 0, oTotal = 0

function renderGroup(g) {
  qTotal++; oTotal += (g.choices ?? []).length
  const t = g.type === 'one' ? 'pick one' : 'pick any'
  w(`**Q. ${g.question}**  _(${t})_`)
  if (g.hint) w(`> ${g.hint}`)
  w('')
  for (const c of g.choices ?? []) w(`- ${c.label}${c.scan ? ` — _${c.scan}_` : ''}`)
  if (g.exact) w(`- _number box: ${g.exact.label} (${g.exact.unit}, max ${g.exact.max})_`)
  w('')
}

w('# List your business — every question, every option')
w('')
w('Generated from the live catalogue in `src/` (the `listing_*` tables mirror it).')
w('')
w('The flow for every trade: **pick a trade → pick what you offer → questions about')
w('what you offer → six "how you work" screens → photos of your work → your price →')
w('review.** Catering alone inserts a menu branch between the questions and the "how')
w('you work" screens; that branch is Appendix A.')
w('')

TRADES.forEach((trade, i) => {
  const offerings = offeringsForTrade(trade)
  w('---')
  w('')
  w(`## ${i + 1}. ${trade}`)
  w('')
  w(`### Step 1 — Which of these do you offer? _(pick any of ${offerings.length})_`)
  w('')
  for (const o of offerings) {
    const unit = SERVICE_UNITS?.[o.serviceId]
    w(`- **${o.name}**${unit ? ` _(priced ${unit})_` : ''}`)
    for (const v of o.variants) w(`  - ${v.label}`)
  }
  w('')

  const tradeSpecs = specsForTrade(trade)
  const withOwn = offerings.filter(o => hasServiceSpecs(o.serviceId))
  const bare = offerings.filter(o => !hasServiceSpecs(o.serviceId))

  if (withOwn.length) {
    w('### Step 2 — Questions for what you picked')
    w('')
    for (const o of withOwn) {
      w(`#### You picked "${o.name}"`)
      w('')
      for (const g of SPECS_BY_SERVICE[o.serviceId]) renderGroup(g)
    }
  }

  if (tradeSpecs.length) {
    if (!withOwn.length) w('### Step 2 — Questions about your trade')
    else if (bare.length) w(`### Step 2 (cont.) — Trade-wide questions, added when you pick ${bare.map(o => `"${o.name}"`).join(' or ')}`)
    else w('### Step 2 (unreached) — Trade-wide questions, kept as the fallback; every offering above has its own set')
    w('')
    for (const g of tradeSpecs) renderGroup(g)
  }

  const ops = operationScreensFor(trade)
  if (ops.length) {
    w('### Step 3 — How you work')
    w('')
    for (const s of ops) {
      w(`#### ${s.title}`)
      if (s.why) w(`_${s.why}_`)
      w('')
      for (const g of s.groups) renderGroup(g)
    }
  }

  w('### Step 4 — Photos of your work · Step 5 — Your price · Step 6 — Review')
  w('')
})

w('---')
w('')
w(`**Totals across the ${TRADES.length} trades:** ${qTotal} questions, ${oTotal} options.`)
w('')
process.stdout.write(out.join('\n') + '\n')
