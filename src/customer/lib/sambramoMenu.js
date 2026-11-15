/**
 * Sambramo's own menu cards (Mohan, 2026-11-02: "a caterer's menu biases
 * the choice — Sambramo generates the menu for what the customer wants").
 *
 * Built from the shared dish catalogue (data/cuisineMenus.js — 16 cuisines,
 * seven courses, veg/non-veg per dish) with the tier allowances the rest of
 * the app already uses (data/celebrationTiers.js), so a "Classic" menu here
 * is the same size as a Close Circle plate everywhere else. The customer
 * swaps, removes or adds dishes within a course; the finished menu goes to
 * every caterer who fits, who replies with their price for exactly it.
 */
import { CUISINES, CUISINE_BY_ID, COURSES, dishesFor, defaultMenu } from '../../data/cuisineMenus'
import { TIER_BY_ID } from '../../data/celebrationTiers'

export { CUISINES, COURSES }
export const MENU_TIERS = [
  { id: 'classic', label: 'Classic', allowance: TIER_BY_ID.close_circle.menuAllowance },
  { id: 'premium', label: 'Premium', allowance: TIER_BY_ID.house_full.menuAllowance },
  { id: 'festive', label: 'Festive', allowance: TIER_BY_ID.full_celebration.menuAllowance },
]
const vegOnlyFor = diet => !['non_veg', 'mixed'].includes(diet)

/** The three cards for a cuisine and a diet. dishes: { courseId: [dishId] } */
export function menuCards(cuisineId, diet) {
  const c = CUISINE_BY_ID[cuisineId]
  if (!c) return []
  const vegOnly = vegOnlyFor(diet) || !c.hasNonVeg
  return MENU_TIERS.map(t => ({ tier: t.id, name: `${t.label} ${c.name}`, cuisine: c.id, vegOnly, dishes: defaultMenu(c, t.allowance, { vegOnly }) }))
}

/** Every dish a course can offer, for swapping and adding. */
export const courseDishes = (cuisineId, courseId, vegOnly) => dishesFor(CUISINE_BY_ID[cuisineId], courseId, { vegOnly })
export const dishName = (cuisineId, courseId, id) => dishesFor(CUISINE_BY_ID[cuisineId], courseId).find(d => d.id === id)?.name ?? id
export const dishCount = dishes => Object.values(dishes ?? {}).reduce((s, l) => s + l.length, 0)

/** The menu as a caterer reads it, course by course. */
export function menuText(m) {
  if (!m?.dishes) return ''
  const parts = COURSES.filter(c => m.dishes[c.id]?.length).map(c => `${c.label}: ${m.dishes[c.id].map(id => dishName(m.cuisine, c.id, id)).join(', ')}`)
  return `${m.name} menu (${dishCount(m.dishes)} dishes) — ${parts.join('; ')}`
}

/* The meal, guessed from the start time — the customer can change it. */
export const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['hightea', 'High tea'], ['dinner', 'Dinner']]
export const mealFor = time => { const h = Number(String(time ?? '').slice(0, 2)); return !h && h !== 0 ? null : h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'hightea' : 'dinner' }

/* How it is served — each is the catering partners' own answer
   (data/trades/catering_food.js service_styles), so it narrows the match. */
export const SERVE = [
  ['buffet', 'Buffet', ['Buffet']], ['leaf', 'Banana leaf', ['Traditional banana-leaf meal']], ['plated', 'Plated', ['Seated / plated service']],
  ['family', 'Family-style', ['Family-style serving']], ['counters', 'Live counters', ['Food counters', 'Live cooking']], ['packed', 'Packed meals', ['Packed meals']],
].map(([id, label, styles]) => ({ id, label, styles }))
