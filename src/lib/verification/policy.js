/**
 * Which requirements are actually mandatory, here, today.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE ROW IS THE DIFFERENCE BETWEEN A CHECKLIST AND A GATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `MANDATORY_FROM` was a single null in a JavaScript module, and it made
 * the requirement engine technically correct and operationally inert:
 * every requirement, including an FSSAI licence somebody is committing
 * an offence to cook without, rendered as "Optional".
 *
 * Replacing that null with a date would have been worse. It is one
 * switch for twenty-six trades in every market, so turning FSSAI on for
 * caterers would have simultaneously demanded a PSARA licence from every
 * security partner and vehicle papers from every transport partner, on
 * the same morning, retroactively.
 *
 * `verification_policy` (migration 146) makes it a row per rule, scoped
 * by market, trade, service and date. Migration 149 puts eight of them
 * in. This reads them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A POLICY THAT CANNOT BE READ MEANS NOTHING IS MANDATORY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every failure here — table missing because 146 was never pasted, a
 * timeout, an offline phone — resolves to `null`, and `requirementsFor`
 * reads a null policy as today's behaviour: nothing required.
 *
 * The opposite default is the tempting one and it is wrong. "We could
 * not read the rules, so assume everything is required" locks every
 * partner out of their own account the first time a SELECT is slow. A
 * partner wrongly allowed to submit meets a human reviewer, who is the
 * real gate. A partner wrongly locked out just cannot work.
 *
 * ── Specificity, matching requirement_is_mandatory() ────────────────
 * A rule naming the trade beats a wildcard, so "FSSAI everywhere from
 * March" can be overridden by "FSSAI in Mysuru from June" without
 * deleting the first. The SQL function orders the same way; the two must
 * agree, because the UI uses this one and submission is gated by that
 * one, and a partner told "optional" by a screen and "required" by the
 * database has been lied to by one of them.
 */

const istToday = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

export function policyFrom(rows = [], { market = null, today = null } = {}) {
  const on = today ?? istToday()

  /* Only rules in force. The view already filters by date, but the rows
     may come from the table directly in a test or a future caller. */
  const live = rows.filter(r =>
    r.mandatory_from && r.mandatory_from <= on &&
    (!r.effective_until || r.effective_until >= on))

  return {
    rows: live,

    /**
     * The most specific rule wins. Service is not scoped here because
     * nothing in the app asks per service yet; when it does, add it
     * above trade, matching the ORDER BY in 146.
     */
    isMandatory(requirementId, trade = null) {
      let best = null
      let bestScore = -1
      for (const r of live) {
        if (r.requirement_id !== requirementId) continue
        if (r.market && r.market !== market) continue
        if (r.trade && r.trade !== trade) continue
        const score = (r.trade ? 2 : 0) + (r.market ? 1 : 0)
        if (score > bestScore) { best = r; bestScore = score }
      }
      return !!best
    },

    /** For the banner: is anything at all being enforced? */
    get enforcing() { return live.length > 0 },
  }
}
