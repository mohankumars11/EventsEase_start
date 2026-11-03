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

const SECTION = { welcome: 'Welcome drinks', soups: 'Soups', starters: 'Starters', live: 'Live counters', mains: 'Main course', rice: 'Rice & biryani', breads: 'Breads',
  curries: 'Curries', sides: 'Accompaniments', salads: 'Salads', desserts: 'Desserts', icecream: 'Ice creams', beverages: 'Beverages', special: 'Special additions' }
const studioText = st => `Menu: ${st.name} — ` + st.sections.filter(s => s.items.length).map(s => `${SECTION[s.id] ?? s.id}: ${s.items.map(i => i.name).join(', ')}`).join('; ')

export function briefFor(o, tradeId, needs = {}) {
  const parts = []
  const said = needsSummary(tradeId, needs)
  if (said) parts.push(said)
  /* Said to the partner, not the customer: "Hire a cook" becomes what the job is. */
  const AS_JOB = { caterer: 'Catering — cook, bring and serve', cook: 'Cook at the customer’s place', restaurant: 'Restaurant order — delivered by the restaurant' }
  const ways = FOOD_WAYS.filter(w => (needs.$ways ?? []).includes(w.id)).map(w => AS_JOB[w.id] ?? w.label)
  if (ways.length) parts.push(`Food: ${ways.join(', ')}`)
  if (needs.$customWay) parts.push(`Food arranged as: ${needs.$customWay}`)
  if (needs.$cookTeam) parts.push(`Cooking: ${needs.$cookTeam}`)
  if (needs.$ingredients) parts.push(needs.$ingredients)
  if (needs.$staff) parts.push('Serving staff needed')
  if (needs.$drinks?.length) parts.push(`Drinks: ${needs.$drinks.join(', ')}`)
  if (needs.$entertainers?.length) parts.push(`Entertainment: ${needs.$entertainers.join(', ')}`)
  if (needs.$elements?.length) parts.push(`Décor pieces: ${needs.$elements.join(', ')}`)
  for (const d of needs.$designs ?? []) parts.push(`Design: ${d.theme}${ref(d)}`)
  const cakeSpec = [needs.$weight, needs.$tiers, needs.$shape, needs.$egg, needs.$delivery].filter(Boolean)
  if (cakeSpec.length) parts.push(`Cake: ${cakeSpec.join(', ')}`)
  if (needs.$hours) parts.push(`Coverage: ${needs.$hours}`)
  if (needs.$extras?.length) parts.push(`Extras: ${needs.$extras.join(', ')}`)
  const meal = MEALS.find(m => m[0] === needs.$meal)
  if (meal) parts.push(`Meal: ${meal[1]}`)
  const serve = SERVE.find(s => s.id === needs.$serve)
  if (serve) parts.push(`Served: ${serve.label}`)
  /* The Menu Studio menu (screens/MenuStudio), course by course. */
  if (needs.$studio?.sections) parts.push(studioText(needs.$studio))
  else if (needs.$menu?.dishes) parts.push(menuText(needs.$menu))
  if (needs.$allergies) parts.push(`Avoid: ${needs.$allergies}`)
  if (needs.$instructions) parts.push(`Note: ${needs.$instructions}`)
  for (const id of needs.$themePicks ?? (needs.$theme ? [needs.$theme] : [])) {
    const theme = themesFor(o).find(t => t.id === id)
    if (theme) parts.push(`Theme: ${theme.label}${ref(theme.photo)}`)
  }
  if ((needs.$themes ?? []).length) parts.push(`Themes: ${needs.$themes.join(', ')}`)
  const colours = COLOURS.filter(c => (needs.$colours ?? []).includes(c.id)).map(c => c.label)
  if (colours.length) parts.push(`Colours: ${colours.join(', ')}`)
  if (needs.$nameText) parts.push(`Name board: “${needs.$nameText}”${FONTS.find(f => f.id === needs.$font) ? ` in ${FONTS.find(f => f.id === needs.$font).label}` : ''}`)
  const cake = CAKES.find(c => c.id === needs.$cake)
  if (cake) parts.push(`Cake: ${cake.label}${ref(cake.photo)}`)
  if (needs.$cakeText) parts.push(`On the cake: “${needs.$cakeText}”`)
  for (const url of needs.$refs ?? []) parts.push(`Customer’s photo (reference: ${url})`)
  return parts.join(' · ')
}
