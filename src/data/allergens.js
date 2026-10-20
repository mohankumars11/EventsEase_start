/**
 * One allergen vocabulary, for every trade that serves food.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ONE LIST AND NOT A BOX TO TYPE IN
 * ══════════════════════════════════════════════════════════════════════
 *
 * A free-text allergen box is a safety question answered in prose. It is
 * the one form of that answer nobody can filter on, warn on or act on,
 * and it is also the form most likely to be left blank.
 *
 * These are the names that appear on an Indian packaged-food label under
 * FSSAI's labelling regulation, plus the two cross-contamination lines a
 * kitchen is actually asked about.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "NOT DECLARED" IS NOT "NONE"
 * ══════════════════════════════════════════════════════════════════════
 *
 * The most dangerous bug available here is showing a customer "no
 * allergens" for a dish nobody has been asked about. So everywhere this
 * vocabulary is stored, NULL means nobody answered and an empty array
 * means somebody answered "none of these". The two must never render the
 * same way, and `allergenLabel` below is the only function that decides
 * what a reader sees.
 */
/* The catering flow has used these fifteen since it was written and
   there is partner data behind them, so they are the spelling that
   wins. Onion, garlic and coconut are not allergens in the European
   sense and are on the list anyway: in this market they are the three
   things a Jain, satvik or temple-catering customer asks about first,
   and a list that cannot express them is a list caterers work around. */
export const ALLERGENS = [
  'Milk / dairy', 'Nuts (tree nuts)', 'Peanuts', 'Gluten / wheat', 'Soy',
  'Egg', 'Fish', 'Shellfish', 'Sesame', 'Mustard', 'Celery', 'Sulphites',
  'Coconut', 'Garlic', 'Onion', 'Alcohol',
]

/** The one answer that means "I was asked, and the answer is none". */
export const NONE_OPTION = 'None of these'

/** For a question that must distinguish "none" from "unanswered". */
export const ALLERGEN_OPTIONS = [...ALLERGENS, NONE_OPTION]

/**
 * What a reader is told about a menu, dish or product.
 *
 * Returns { state, text }. `state` is 'undeclared' | 'none' | 'listed',
 * so a caller can colour it; the text is never optimistic about an
 * answer nobody gave.
 */
export function allergenLabel(value) {
  if (value === null || value === undefined) {
    return { state: 'undeclared', text: 'Allergens not declared — ask the partner' }
  }
  const list = (Array.isArray(value) ? value : [value]).filter(Boolean)
  const real = list.filter(x => x !== NONE_OPTION)
  if (!real.length) return { state: 'none', text: 'No listed allergens' }
  return { state: 'listed', text: real.join(' · ') }
}
