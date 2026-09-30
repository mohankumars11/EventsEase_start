/**
 * What is still unanswered on a listing screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A LISTING COULD BE SUBMITTED SAYING NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `canAdvance` gated four screens — trade, offerings, kitchen, cuisines —
 * and returned `true` for everything else. So a partner could press
 * Continue through the detail screen, all six operations screens, the
 * price and the review, and submit a listing whose only content was
 * "Photography".
 *
 * That listing is then matched on. Dispatch reads specs; a row with none
 * matches almost nothing, so the partner waits for jobs that never come
 * and has no way to know why. The form was polite and the outcome was
 * silence.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ANSWERED MEANS A TICK **OR** THE TYPED BOX
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every question already carries a "Something else? Type it here" box,
 * and it counts. That is what makes requiring an answer humane rather
 * than a trap: a mehendi artist whose style is not among our four can
 * type it and move on, and an operator reads it later.
 *
 * Without that rule, requiring an answer would mean a partner whose real
 * answer is missing from our list is stuck on a screen with no way
 * forward — which is worse than the empty listing this fixes.
 *
 * An exact typed number counts too. Somebody who types 9 servers has
 * answered "how many servers", and the chips lighting none of them is
 * the design working, not a gap.
 */

/** The key a group's answer is stored under — the same one the screen writes. */
export const keyOf = g => g.stateKey ?? g.id

/** Has this one group been answered, by any of the three routes? */
export function isAnswered(group, value) {
  const v = value[keyOf(group)]
  if (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '') {
    return true
  }
  /* The free-text escape hatch, stored beside the answer under
     `<key>__other` by DetailStep and OperationsStep alike. */
  const typed = value[`${keyOf(group)}__other`]
  return typeof typed === 'string' && typed.trim().length > 0
}

/**
 * What a screen still wants.
 *
 * @param {Array} groups the question groups on that screen
 * @param {object} value the answers so far
 * @returns {{ total: number, answered: number, missing: Array<{id, question}> }}
 */
export function completenessOf(groups = [], value = {}) {
  const missing = []
  for (const g of groups) {
    if (g.optional) continue
    if (!isAnswered(g, value)) missing.push({ id: keyOf(g), question: g.question })
  }
  return { total: groups.length, answered: groups.length - missing.length, missing }
}

/**
 * Every screen in a flow that is not finished, in flow order.
 *
 * Used twice: to mark a phase red in the stepper, and to list what is
 * left on the review screen. One source, so the dot and the list can
 * never disagree about whether a screen is done.
 *
 * @param {Array<{id, title, groups}>} screens
 * @param {object} value
 */
export function pendingScreens(screens = [], value = {}) {
  return screens
    .map(s => ({ ...s, ...completenessOf(s.groups, value) }))
    .filter(s => s.missing.length > 0)
}
