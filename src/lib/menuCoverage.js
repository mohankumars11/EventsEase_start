/**
 * The dishes on a set of menu cards, and which cards a kitchen covers.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE PARTNER SCREEN STOPPED SHOWING "OPTION 1, OPTION 2"
 * ══════════════════════════════════════════════════════════════════════
 *
 * The menus screen showed a caterer the same four cards a CUSTOMER sees,
 * priced the customer's way: "Option 2 · from ₹500 a plate · min 100".
 *
 * A caterer is not choosing an option. They are being asked what they
 * cook, and the card is our packaging of it. Presented that way the
 * screen asks them to accept a price and a minimum they had no part in
 * setting, on a form whose whole promise is that they say what they do —
 * and a kitchen that cooks fifteen of Option 2's sixteen dishes has no
 * way to say so. It ticks the box and hopes, or leaves it and disappears
 * from every card it could nearly serve.
 *
 * So the screen is the DISHES, grouped the way a meal is served, with a
 * tick against each and Select all on every group. The cards are then
 * worked out from the answers rather than asked about: cook everything
 * on Option 2 and you cover Option 2.
 *
 * ── The card is still the unit dispatch matches on ───────────────────
 * catalogue_menus and catalogue_menu_lines have not changed and neither
 * has matching. This only changes what the partner is asked. Coverage
 * is derived here and stored as the same menu_ids the screen used to
 * collect by hand.
 *
 * ── Staples do not count against anybody ─────────────────────────────
 * Salt, papad and a banana are on every card and every caterer has them.
 * Counting them would mean a kitchen that cooks all sixteen real dishes
 * covers the card only if it also ticked "Salt", which is a question
 * nobody should be asked.
 */
import { resolveMenuLine } from './menuLineResolve'
import { dishIndex } from './menuLineResolve'
import { COURSES } from '../data/cuisineMenus'

/* id → { name, course }, the reverse of the name index the resolver
   builds. Built once, from the same source, so the two cannot disagree
   about what a dish id means. */
let BY_ID = null
function byId() {
  if (BY_ID) return BY_ID
  BY_ID = new Map()
  for (const d of dishIndex().values()) BY_ID.set(d.id, d)
  return BY_ID
}

const COURSE_LABEL = Object.fromEntries(COURSES.map(c => [c.id, c.label]))
const COURSE_ORDER = Object.fromEntries(COURSES.map((c, i) => [c.id, i]))

/**
 * Every dish named across a set of menus, grouped by course.
 *
 * @param {Array} menus the menu objects the caterer's cuisines produced
 * @param {(menu) => string[]} linesOf how to read a menu's lines
 * @returns {Array<{ id, label, dishes: Array<{ id, name, cards: string[] }> }>}
 */
export function menuDishGroups(menus, linesOf) {
  const found = new Map()      // dishId -> { id, name, course, cards:Set }

  for (const m of menus) {
    for (const raw of linesOf(m)) {
      const text = typeof raw === 'string' ? raw : (raw?.name ?? raw?.text ?? String(raw))
      const r = resolveMenuLine(text)
      /* A choice offers alternatives and an `all` needs every one; both
         put their dishes in options, and both are real things to be
         asked about. A staple is not. */
      const ids = r.kind === 'dish' ? [r.dishId] : r.options.map(o => o.id)
      for (const id of ids) {
        const d = byId().get(id)
        if (!d) continue
        if (!found.has(id)) found.set(id, { id, name: d.name, course: d.course, cards: new Set() })
        found.get(id).cards.add(m.id)
      }
    }
  }

  const groups = new Map()
  for (const d of found.values()) {
    const c = d.course ?? 'starters'
    if (!groups.has(c)) groups.set(c, [])
    groups.get(c).push({ id: d.id, name: d.name, cards: [...d.cards] })
  }

  return [...groups.entries()]
    .map(([id, dishes]) => ({
      id,
      label: COURSE_LABEL[id] ?? id,
      dishes: dishes.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => (COURSE_ORDER[a.id] ?? 99) - (COURSE_ORDER[b.id] ?? 99))
}

/**
 * Which of these menus a kitchen covers, given the dishes it ticked.
 *
 * A line is satisfied when:
 *   dish    that dish is ticked
 *   choice  ANY of its options is ticked — that is what OR means
 *   all     EVERY one of its options is ticked
 *   staple  always; every caterer has salt
 *   label   always; it is a heading, not food
 *
 * `unresolved` cannot happen — the seed refuses to build with one — but
 * if it ever did it would count AGAINST the menu rather than be waved
 * through, because a line nobody can match is not a line everybody
 * matches.
 */
export function coveredMenus(menus, picked, linesOf) {
  const have = new Set(picked)
  const out = []

  for (const m of menus) {
    let ok = true
    for (const raw of linesOf(m)) {
      const text = typeof raw === 'string' ? raw : (raw?.name ?? raw?.text ?? String(raw))
      const r = resolveMenuLine(text)
      if (r.kind === 'staple' || r.kind === 'label') continue
      if (r.kind === 'dish') { if (!have.has(r.dishId)) { ok = false; break } continue }
      if (r.kind === 'choice') { if (!r.options.some(o => have.has(o.id))) { ok = false; break } continue }
      if (r.kind === 'all') { if (!r.options.every(o => have.has(o.id))) { ok = false; break } continue }
      ok = false; break
    }
    if (ok) out.push(m.id)
  }
  return out
}

/**
 * How close a kitchen is to each card, for the line that reads back what
 * they have done. A count, not a percentage: "11 of 16" is checkable and
 * "69%" is not.
 */
export function menuProgress(menu, picked, linesOf) {
  const have = new Set(picked)
  let need = 0
  let got = 0
  for (const raw of linesOf(menu)) {
    const text = typeof raw === 'string' ? raw : (raw?.name ?? raw?.text ?? String(raw))
    const r = resolveMenuLine(text)
    if (r.kind === 'staple' || r.kind === 'label') continue
    need++
    if (r.kind === 'dish' && have.has(r.dishId)) got++
    else if (r.kind === 'choice' && r.options.some(o => have.has(o.id))) got++
    else if (r.kind === 'all' && r.options.every(o => have.has(o.id))) got++
  }
  return { need, got }
}
