/**
 * What a menu line resolves to.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS AND WHY IT IS SHARED
 * ══════════════════════════════════════════════════════════════════════
 *
 * catalogue_menu_lines.dish_id is the bridge menu-card matching needs. A
 * customer picks "Option 1"; dispatch has to find the caterers who can
 * cook its lines. A caterer's listing holds dish ids from the picker, so
 * a line that reaches no dish can never be matched by anybody.
 *
 * Two generators need to agree about every line: the one that mints the
 * option ids and the one that writes the seed. If they disagreed, the
 * bridge would half-build in silence — an option id minted for a dish
 * the seed never writes, or a seed row pointing at an id that was never
 * minted. So they both call this.
 *
 * ── The five things a line can be ────────────────────────────────────
 *
 *   dish     "Kaju Mohini"                     one dish
 *   choice   "Paal Payasa OR Sabbakki Payasa"  two, EITHER satisfies it
 *   all      "Kosambari, Palya"                two, and BOTH are served
 *   staple   "Salt, Pickle, Papad"             every caterer has these
 *   label    "Sweet:"                          a heading, not food
 *
 * choice and all look identical in the table — several dishes on one
 * line — and they are opposite questions. A caterer matches a choice by
 * cooking any one of them and an `all` only by cooking every one. Read
 * as the same kind, a caterer who makes one of two required dishes would
 * be sent a card they cannot cook. The comma and the OR are the only
 * things that tell them apart, so the kind carries it.
 *
 * A fifth, `unresolved`, is a defect: a name we have not placed. The
 * seed asserts there are none, and check-menu-card-dishes.mjs asserts
 * the same thing from the other end.
 *
 * ── Why a choice does not just pick one ──────────────────────────────
 * dish_id holds one id. Writing the first option into it would quietly
 * narrow what the card says: a caterer who makes the sabbakki payasa but
 * not the paal payasa would stop matching a card they can cook. So a
 * choice keeps dish_id NULL and lists every option — matching the line
 * means matching ANY of them, which is what OR means.
 */
import { CUISINES, dishesFor } from '../data/cuisineMenus'
import { DISHES as REGISTRY_DISHES, COURSE_CATEGORIES } from '../data/dishRegistry'
import { dishIdFor } from '../data/dishIds.generated'
import {
  MENU_CARD_DISHES, MENU_CARD_ALIASES, MENU_CARD_STAPLES,
} from '../data/menuCardDishes'
import { parseMenuLine, normaliseDishName as norm } from './menuLineParse'

const REGISTRY_COURSE = Object.fromEntries(COURSE_CATEGORIES.map(c => [c.id, c.maps]))

/**
 * Every dish the catalogue knows, by name.
 *
 * Built in the same order the seed writes them — registry first, then
 * cuisineMenus, then the hand-classified menu-card dishes — so a name
 * that exists in two places resolves to the row the database actually
 * holds rather than to a different one.
 */
function buildIndex() {
  const byName = new Map()
  const add = (name, id, cuisine, course) => {
    const k = norm(name)
    if (!k || byName.has(k)) return
    byName.set(k, { id, name, cuisine, course })
  }

  for (const d of REGISTRY_DISHES) {
    add(d.name, d.id, d.cuisine, REGISTRY_COURSE[d.course] ?? 'starters')
  }
  for (const c of CUISINES) {
    for (const courseId of Object.keys(c.courses ?? {})) {
      for (const d of dishesFor(c, courseId)) {
        if (d.sbmId) add(d.name, d.sbmId, c.id, courseId)
      }
    }
  }
  for (const d of MENU_CARD_DISHES) {
    const id = dishIdFor(d.cuisine, d.course, d.name)
    /* No id means generate-dish-ids.mjs has not run since this dish was
       added. Skipping keeps the line unresolved, which is loud, instead
       of writing a NULL id into the bridge, which is not. */
    if (id) add(d.name, id, d.cuisine, d.course)
  }
  return byName
}

let INDEX = null
/** The dish index, built once. */
export const dishIndex = () => (INDEX ??= buildIndex())

const STAPLES = new Set(MENU_CARD_STAPLES.map(norm))

/**
 * Resolve one line of a menu card.
 *
 * @param {string} text the line exactly as the card writes it
 * @returns {{
 *   kind: 'dish'|'choice'|'all'|'staple'|'label'|'unresolved',
 *   dishId: string|null,
 *   options: Array<{ name: string, id: string }>,
 *   unresolved: string[],
 * }}
 */
export function resolveMenuLine(text) {
  const index = dishIndex()
  const { parts, hasChoice } = parseMenuLine(text)
  const none = { kind: 'label', dishId: null, options: [], unresolved: [] }
  if (!parts.length) return none

  const hits = []
  const missing = []
  let staples = 0

  for (const part of parts) {
    let k = norm(part)
    if (!k) continue
    if (STAPLES.has(k)) { staples++; continue }
    /* An alias is a spelling of a dish the catalogue already has. Hand
       checked one at a time — fuzzy matching proposed a soft drink for
       a dosa, so nothing here is inferred. */
    if (MENU_CARD_ALIASES[k]) k = norm(MENU_CARD_ALIASES[k])

    const hit = index.get(k)
    if (hit?.id) hits.push({ name: hit.name, id: hit.id })
    else missing.push(part)
  }

  /* Two names for one dish is one dish.

     "Obbattu OR Holige" is a card offering a sweet under both of its
     names. While they were two catalogue rows it read as a real
     choice; once they were merged it became the same id twice, which
     minted one option id for two rows and failed the seed's uniqueness
     check. Deduped by id, and a line left with one dish is a dish
     rather than a choice between it and itself. */
  const seenId = new Set()
  const unique = hits.filter(h => !seenId.has(h.id) && seenId.add(h.id))
  hits.length = 0
  hits.push(...unique)

  if (missing.length) {
    return { kind: 'unresolved', dishId: null, options: [], unresolved: missing }
  }

  /* Nothing but staples: salt, papad, a banana. Correctly matched by
     nobody, and it must not read as a hole in the bridge. */
  if (!hits.length) {
    return staples ? { kind: 'staple', dishId: null, options: [], unresolved: [] } : none
  }

  if (hits.length === 1 && !hasChoice) {
    return { kind: 'dish', dishId: hits[0].id, options: [], unresolved: [] }
  }
  /* The OR decides, not the number of parts: "Salt, Pickle, Papad" is
     three things the caterer brings, not three to choose between. */
  return {
    kind: hasChoice ? 'choice' : 'all',
    dishId: null, options: hits, unresolved: [],
  }
}
