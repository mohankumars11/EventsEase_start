/**
 * What a master reads about one requirement — every choice the customer
 * made, in one line (spec 2026-11-02 §9: "send the structured requirement
 * and the selected reference image"). The partner-app questions summarise
 * themselves (ui/needs.needsSummary); the visual choices are added here,
 * with the reference photograph's Pexels id so the master sees the same
 * picture the customer chose.
 */
import { needsSummary } from '../ui/needs'
import { COLOURS, FONTS, FOOD_WAYS, CAKES, themesFor } from '../data/visualCatalogue'
import { MEALS, SERVE, menuText } from './sambramoMenu'

const ref = p => (p?.id ? ` (reference: pexels.com/photo/${p.id})` : '')

export function briefFor(o, tradeId, needs = {}) {
  const parts = []
  const said = needsSummary(tradeId, needs)
  if (said) parts.push(said)
  const way = FOOD_WAYS.find(w => w.id === needs.$way)
  if (way) parts.push(`Food: ${way.label}`)
  const meal = MEALS.find(m => m[0] === needs.$meal)
  if (meal) parts.push(`Meal: ${meal[1]}`)
  const serve = SERVE.find(s => s.id === needs.$serve)
  if (serve) parts.push(`Served: ${serve.label}`)
  if (needs.$menu?.dishes) parts.push(menuText(needs.$menu))
  const theme = themesFor(o).find(t => t.id === needs.$theme)
  if (theme) parts.push(`Theme: ${theme.label}${ref(theme.photo)}`)
  const colours = COLOURS.filter(c => (needs.$colours ?? []).includes(c.id)).map(c => c.label)
  if (colours.length) parts.push(`Colours: ${colours.join(', ')}`)
  if (needs.$nameText) parts.push(`Name board: “${needs.$nameText}”${FONTS.find(f => f.id === needs.$font) ? ` in ${FONTS.find(f => f.id === needs.$font).label}` : ''}`)
  const cake = CAKES.find(c => c.id === needs.$cake)
  if (cake) parts.push(`Cake: ${cake.label}${ref(cake.photo)}`)
  if (needs.$cakeText) parts.push(`On the cake: “${needs.$cakeText}”`)
  for (const url of needs.$refs ?? []) parts.push(`Customer’s photo (reference: ${url})`)
  return parts.join(' · ')
}
