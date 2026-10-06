import fs from 'fs'
import { TRADES, offeringsForTrade } from '../src/data/partnerCatalogue'
import { specsForTrade } from '../src/data/partnerSpecs'
import { SPECS_BY_SERVICE, hasServiceSpecs } from '../src/data/partnerServiceSpecs'
import { operationScreensFor } from '../src/data/partnerOperations'
import { SERVICE_UNITS } from '../src/config/vendor'
import { KITCHEN_TYPES } from '../src/data/cateringFunnel'
import { CUISINES, COURSES } from '../src/data/cuisineMenus'
import { ALL_DISH_GROUPS } from '../src/data/cateringDishes'
import { ALL_MENUS, FOOD_COUNTERS, SERVICE_STYLES, CATERING_NOTES, menuLines } from '../src/data/cateringMenus'

const q = g => ({
  q: g.question,
  hint: g.hint ?? null,
  type: g.type === 'one' ? 'Pick one' : 'Pick any',
  exact: g.exact ? g.exact.label : null,
  opts: (g.choices ?? []).map(c => ({ l: c.label, s: c.scan ?? null })),
})

const trades = TRADES.map(trade => {
  const offerings = offeringsForTrade(trade)
  const withOwn = offerings.filter(o => hasServiceSpecs(o.serviceId))
  const bare = offerings.filter(o => !hasServiceSpecs(o.serviceId))
  const tradeSpecs = specsForTrade(trade)
  const steps = []

  steps.push({
    n: 'Step 1', title: 'Which of these do you offer?',
    note: `Pick any of ${offerings.length}`,
    groups: [{
      q: 'What you offer', type: 'Pick any', hint: null, exact: null,
      opts: offerings.map(o => ({
        l: o.name,
        s: [SERVICE_UNITS?.[o.serviceId] ? `priced ${SERVICE_UNITS[o.serviceId]}` : null,
            o.variants.length ? o.variants.map(v => v.label).join(' · ') : null]
          .filter(Boolean).join(' — ') || null,
      })),
    }],
  })

  for (const o of withOwn) {
    steps.push({
      n: 'Step 2', title: `If you picked "${o.name}"`,
      note: 'Questions this offering asks on its own',
      groups: SPECS_BY_SERVICE[o.serviceId].map(q),
    })
  }
  if (tradeSpecs.length) {
    steps.push({
      n: 'Step 2', title: 'Questions about your trade',
      note: !withOwn.length ? 'Asked of everyone in this trade'
        : bare.length ? `Added when you pick ${bare.map(o => `"${o.name}"`).join(' or ')}`
        : 'Fallback set — every offering above has its own, so this is not reached',
      groups: tradeSpecs.map(q),
    })
  }
  for (const s of operationScreensFor(trade)) {
    steps.push({ n: 'Step 3 · How you work', title: s.title, note: s.why ?? null, groups: s.groups.map(q) })
  }
  steps.push({ n: 'Steps 4–6', title: 'Photos of your work · Your price · Review and sign', note: 'No ticklists — uploads, a rate, and the signature.', groups: [] })

  const qc = steps.reduce((n, s) => n + s.groups.length, 0)
  const oc = steps.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.opts.length, 0), 0)
  return { trade, steps, qc, oc, offerings: offerings.length }
})

/* ── Appendix A: the catering menu branch ───────────────────────── */
const a = []
a.push({ n: 'A1', title: 'Is your kitchen veg or non-veg?', note: 'This one answer decides everything shown after it.',
  groups: [{ q: 'Your kitchen', type: 'Pick one', hint: 'Nothing after it will be food you do not cook.', exact: null,
    opts: KITCHEN_TYPES.map(k => ({ l: `${k.emoji} ${k.label}`, s: k.scan })) }] })
a.push({ n: 'A2', title: 'Which cuisines can you cook?', note: `Pick any of ${CUISINES.length}; filtered by the kitchen answer.`,
  groups: [{ q: 'Your cuisines', type: 'Pick any', hint: null, exact: null,
    opts: CUISINES.map(c => ({ l: `${c.emoji} ${c.name}`, s: `${c.region}${c.hasNonVeg ? ', has non-veg' : ', veg only'} — ${c.blurb}` })) }] })
for (const c of CUISINES) {
  a.push({ n: 'A3', title: `${c.emoji} ${c.name} — which dishes do you cook?`, note: 'One screen per cuisine ticked, seven courses each.',
    groups: COURSES.filter(co => (c.courses?.[co.id] ?? []).length).map(co => ({
      q: co.label, type: 'Pick any', hint: co.hint, exact: null,
      opts: c.courses[co.id].map(d => ({ l: d.name, s: d.veg === false ? 'non-veg' : null })) })) })
}
a.push({ n: 'A4', title: 'The deep dish libraries', note: 'Karnataka library when a South Indian cuisine is ticked; non-veg library when the kitchen is not pure veg.',
  groups: ALL_DISH_GROUPS.map(g => ({ q: g.title ?? g.label, type: 'Pick any', hint: null, exact: null,
    opts: g.items.map(i => ({ l: i.name ?? i.label ?? String(i), s: null })) })) })
a.push({ n: 'A5', title: 'Which set menus can you serve?', note: `Service styles: ${SERVICE_STYLES.map(s => `${s.label} (${s.scan})`).join(' · ')}`,
  groups: ALL_MENUS.map(m => ({
    q: `${m.id.startsWith('pl_') ? 'Plantain leaf' : m.id.startsWith('bf_') ? 'Buffet' : m.id.startsWith('nv_') ? 'Non-veg' : 'Special'} · ${m.name ?? m.id}${m.tier ? ` — ${m.tier}` : ''}`,
    type: 'Offer it or not', exact: null,
    hint: [m.scan, m.diet && `${m.diet}`, m.fromPrice && `from Rs ${m.fromPrice}/plate`, m.minPax && `min ${m.minPax} guests`].filter(Boolean).join(' · '),
    opts: menuLines(m).map(l => ({ l, s: null })) })) })
a.push({ n: 'A6', title: 'Live food counters you can run', note: null,
  groups: [{ q: 'Counters', type: 'Pick any', hint: null, exact: null,
    opts: FOOD_COUNTERS.map(f => ({ l: f.name, s: `${f.scan} — from Rs ${f.fromPrice}` })) }] })
a.push({ n: 'A7', title: 'Notes shown on the menu screens', note: 'Not questions — the terms printed under the menus.',
  groups: [{ q: 'Printed terms', type: 'Shown, not asked', hint: null, exact: null, opts: CATERING_NOTES.map(l => ({ l, s: null })) }] })
a.push({ n: 'A8', title: 'Photograph your menu card', note: 'Upload screen, catering only.', groups: [] })

const appendix = { trade: 'Appendix A · Catering menu branch', steps: a,
  qc: a.reduce((n, s) => n + s.groups.length, 0),
  oc: a.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.opts.length, 0), 0), offerings: 0 }

fs.writeFileSync(process.argv[2], JSON.stringify({ trades, appendix }))
console.log('trades', trades.length, 'q', trades.reduce((n,t)=>n+t.qc,0), 'o', trades.reduce((n,t)=>n+t.oc,0), '| appendix q', appendix.qc, 'o', appendix.oc)
