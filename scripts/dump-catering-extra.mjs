/* Appendix A — the catering-only menu branch of "List your business". */
import { KITCHEN_TYPES } from '../src/data/cateringFunnel'
import { CUISINES, COURSES } from '../src/data/cuisineMenus'
import { ALL_DISH_GROUPS, TOTAL_DISHES } from '../src/data/cateringDishes'
import { ALL_MENUS, FOOD_COUNTERS, SERVICE_STYLES, CATERING_NOTES, menuLines } from '../src/data/cateringMenus'

const out = []
const w = s => out.push(s)

w('---')
w('')
w('# Appendix A — the catering-only menu branch')
w('')
w('Shown only when a Catering & Food partner picks **Catering**, **Customised menu**')
w('or **Cook at your place**. It sits between Step 2 and Step 3 above.')
w('')

w('## A1 — Is your kitchen veg or non-veg? _(pick one — this gates everything after it)_')
w('')
w('> This one answer decides everything we show you next. Nothing after it will be food you do not cook.')
w('')
for (const k of KITCHEN_TYPES) w(`- ${k.emoji} **${k.label}** — _${k.scan}_`)
w('')

w(`## A2 — Which cuisines can you cook? _(pick any of ${CUISINES.length}; the list is filtered by your kitchen answer)_`)
w('')
for (const c of CUISINES) {
  w(`- ${c.emoji} **${c.name}**${c.localName ? ` (${c.localName})` : ''} — _${c.region}${c.hasNonVeg ? ', has non-veg' : ', veg only'}_`)
  if (c.blurb) w(`  - ${c.blurb}`)
}
w('')

w('## A3 — One screen per cuisine you ticked: which dishes do you cook?')
w('')
w(`Seven courses per cuisine, the same seven every time: ${COURSES.map(c => `**${c.label}** (_${c.hint}_)`).join(' · ')}`)
w('')
for (const c of CUISINES) {
  w(`### ${c.emoji} ${c.name}`)
  w('')
  for (const co of COURSES) {
    const items = c.courses?.[co.id] ?? []
    if (!items.length) continue
    w(`**${co.label}** _(pick any of ${items.length})_`)
    w('')
    for (const d of items) w(`- ${d.name}${d.veg === false ? ' _(non-veg)_' : ''}`)
    w('')
  }
}

w('## A4 — The deep libraries')
w('')
w('Two extra screens, each shown only when earned: the Karnataka library when a South')
w('Indian cuisine is ticked, the non-veg library when the kitchen is not pure veg.')
w(`${TOTAL_DISHES} dishes in ${ALL_DISH_GROUPS.length} groups, all optional ticks.`)
w('')
for (const g of ALL_DISH_GROUPS) {
  w(`### ${g.title ?? g.label} _(pick any of ${g.items.length})_`)
  w('')
  for (const it of g.items) w(`- ${it.name ?? it.label ?? it}`)
  w('')
}

w(`## A5 — Which set menus can you serve? _(pick any of ${ALL_MENUS.length})_`)
w('')
w(`Service styles offered: ${SERVICE_STYLES.map(s => `**${s.label}** (_${s.scan}_)`).join(' · ')}`)
w('')
for (const m of ALL_MENUS) {
  const style = m.id.startsWith('pl_') ? 'Plantain leaf' : m.id.startsWith('bf_') ? 'Buffet' : m.id.startsWith('nv_') ? 'Non-veg' : 'Special'
  w(`### ${style} · ${m.name ?? m.id}${m.tier ? ` — ${m.tier}` : ''}`)
  w(`_${[m.scan, m.diet && `${m.diet} menu`, m.fromPrice && `from Rs ${m.fromPrice} per plate`, m.minPax && `minimum ${m.minPax} guests`].filter(Boolean).join(' · ')}_`)
  w('')
  for (const line of menuLines(m)) w(`- ${line}`)
  w('')
}

w(`## A6 — Live food counters you can run _(pick any of ${FOOD_COUNTERS.length})_`)
w('')
for (const f of FOOD_COUNTERS) w(`- **${f.name ?? f.label}**${f.scan ? ` — _${f.scan}_` : ''}`)
w('')
w('## A7 — Notes shown on the menu screens')
w('')
for (const n of CATERING_NOTES) w(`- ${typeof n === 'string' ? n : (n.text ?? n.label ?? JSON.stringify(n))}`)
w('')
w('## A8 — Photograph your menu card _(upload, catering only)_')
w('')

process.stdout.write(out.join('\n') + '\n')
