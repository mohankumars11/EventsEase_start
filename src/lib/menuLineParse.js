/**
 * One menu line, taken apart.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SHARED AND NOT WRITTEN TWICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two things need to read a menu line the same way: the script that
 * drafts the dishes a card names, and the seed that writes those lines
 * into catalogue_menu_lines with a dish_id.
 *
 * If they parse differently the bridge silently half-builds. The drafter
 * decides a line is two dishes and creates both; the seed decides it is
 * one and resolves neither. Nothing errors — dish_id just stays NULL for
 * reasons nobody can see.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A CARD ACTUALLY WRITES
 * ══════════════════════════════════════════════════════════════════════
 *
 *   "Paal Payasa OR Sabbakki Mango Payasa (seasonal)"   two dishes
 *   "Salt, Pickle, Papad"                               three staples
 *   "Mysore Rasam / Pepper Rasam / Chennai Rasam"       three dishes
 *   "Sweet: Glass Sandwich"                             a course label
 *   "Hot & Sour Soup"                                   ONE dish
 *   "Bele Holige with milk and ghee"                    ONE dish
 *
 * So OR, "/" and "," separate. "&" and " and " do NOT — splitting on
 * them cut "Hot & Sour Soup" in half and would cut the holige off its
 * milk and ghee.
 *
 * ── Parentheses are two different things ─────────────────────────────
 * "(seasonal)" and "(300 ml bottle)" are noise. "(dry vegetable)",
 * "(mutton)" and "(sambar)" are a gloss that IS the meaning — stripping
 * them all left a dish called "Sukka", which names three different
 * things depending on what is in it.
 */

/** A course written into the line itself, as the buffet menus do. */
const LABEL = /^([a-z& ]+?)\s*:\s*/i

const LABEL_COURSE = {
  soup: 'curries', starter: 'starters', bread: 'mains', gravy: 'curries',
  dosa: 'mains', rice: 'mains', salad: 'accompaniments', sweet: 'sweets',
  sweets: 'sweets', fruit: 'sweets', dessert: 'sweets',
  paan: 'accompaniments', drink: 'welcome',
}

/** Parentheticals that say nothing about what the dish is. */
const NOISE = /\s*\((seasonal[^)]*|bottle|\d+\s*ml[^)]*|vanilla[^)]*)\)/gi

/* A comma inside a kept parenthetical is not a separator —
   "Marvai Sukka (clams, seasonal)" is one dish. */
const GUARD = String.fromCharCode(1)

const SEPARATOR = /\s+OR\s+|\s*\/\s*|,\s+/

/**
 * @param {string} raw one line as a card writes it
 * @returns {{ parts: string[], course: string|null, hasChoice: boolean }}
 */
export function parseMenuLine(raw) {
  let text = String(raw ?? '')
  if (!text.trim()) return { parts: [], course: null, hasChoice: false }

  const lm = LABEL.exec(text)
  const course = lm ? (LABEL_COURSE[lm[1].trim().toLowerCase()] ?? null) : null
  if (lm && course) text = text.slice(lm[0].length)

  text = text.replace(NOISE, ' ')
  text = text.replace(/\([^)]*\)/g, m => m.replace(/,/g, GUARD))

  const parts = text.split(SEPARATOR)
    .map(p => p.split(GUARD).join(',').trim())
    .filter(Boolean)

  /* A choice is what the CARD offers, so it is counted on the original
     text: "Salt, Pickle, Papad" is three things the caterer brings, not
     three things to choose between. */
  return { parts, course, hasChoice: /\s+OR\s+/.test(raw) }
}

/** How the catalogue keys a dish name. */
export const normaliseDishName = s =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
