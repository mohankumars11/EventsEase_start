import { requirementsFor } from '../data/compliance'
import { evaluateAll } from './verification/satisfaction'

/**
 * The six steps, and who is allowed to say a partner has finished them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROBLEM THIS EXISTS TO FIX
 * ══════════════════════════════════════════════════════════════════════
 *
 * Saving a trade used to end with "Submit", a success toast and the
 * dashboard. A caterer who filled in forty questions about their kitchen
 * was shown the working app and reasonably concluded they were live.
 *
 * They were not. Nobody had checked their identity, nobody knew where
 * they worked or how far they travelled, there was no account to pay
 * them into, and no operator had read a word of it.
 *
 * The questionnaire was never the problem — it is the most valuable
 * thing in the product, and it is untouched. What was wrong is that it
 * was the WHOLE journey instead of the first sixth of it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE PLACE DECIDES, AND IT IS NOT A SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every step's status is DERIVED from what is actually in the database,
 * never from a flag a screen sets on its way out. A component that can
 * write "step 1 done" is a component that can be wrong about it, and the
 * partner finds out three screens later.
 *
 * So the trade flow saves a service and returns to the hub. It does not
 * know whether that completed anything. This file works that out.
 *
 * ── The persisted columns are a bookmark, not the truth ────────────
 * 119 added `current_onboarding_step` and `completed_steps`. They are
 * used to RESUME — to reopen the screen somebody left — and never to
 * decide whether a step is finished. If the two disagree, the data wins.
 */

export const STEPS = [
  {
    id: 'business',
    n: '01',
    title: 'Business & Services',
    blurb: 'What you offer and the services you provide.',
  },
  {
    id: 'details',
    n: '02',
    title: 'Partner Details',
    blurb: 'Your identity, business and experience.',
  },
  {
    id: 'area',
    n: '03',
    title: 'Service Area & Availability',
    blurb: 'Where you work, how far you travel and when you are available.',
  },
  {
    id: 'compliance',
    n: '04',
    title: 'Verification & Compliance',
    blurb: 'Only the verification required for your selected services.',
  },
  {
    id: 'bank',
    n: '05',
    title: 'Bank & Payments',
    blurb: 'Where your Sambramo earnings are paid.',
  },
  {
    id: 'review',
    n: '06',
    title: 'Review & Publish',
    blurb: 'Review everything and submit your profile for approval.',
  },
]

export const STEP_IDS = STEPS.map(s => s.id)
export const STEP_BY_ID = Object.fromEntries(STEPS.map(s => [s.id, s]))

/** What a step can be. LOCKED is the default for anything ahead. */
export const STATUS = {
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  REQUIRES_ACTION: 'REQUIRES_ACTION',
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT "DONE" MEANS FOR EACH STEP
   ══════════════════════════════════════════════════════════════════════

   One predicate each, reading the same rows the rest of the app reads.
   Each returns { done, partial, detail } — `partial` is what separates
   "not started" from "started and left", which is the difference between
   a locked-looking step and one that says Continue. */

/**
 * Step 1 · at least one trade fully configured.
 *
 * "Fully configured" is deliberately not "they tapped a trade". A
 * container with no offerings under it is a partner who opened the
 * questionnaire and closed it, and letting that unlock step 2 is how
 * somebody reaches Review & Publish with nothing to sell. §17: one
 * complete service; the others may sit in draft.
 */
function businessDone({ listings = [] }) {
  const configured = listings.filter(l => (l.offerings?.length ?? 0) > 0)
  return {
    done: configured.length > 0,
    partial: listings.length > 0,
    detail: configured.length
      ? `${configured.length} service${configured.length === 1 ? '' : 's'} configured`
      : listings.length ? 'Started — no service finished yet' : null,
  }
}

/**
 * Step 2 · who they are.
 *
 * `business_name` is created by the onboarding form, so its presence is
 * not evidence of anything. The fields below are the ones a coordinator
 * needs before ringing somebody on the day.
 */
function detailsDone({ vendor }) {
  if (!vendor) return { done: false, partial: false, detail: null }
  const have = [
    vendor.business_name,
    vendor.contact_phone,
    vendor.description,
    vendor.years_active ?? vendor.years_experience,
  ]
  const filled = have.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  return {
    done: filled.length === have.length,
    partial: filled.length > 0,
    detail: filled.length === have.length ? null : `${filled.length} of ${have.length} filled`,
  }
}

/**
 * Step 3 · where and when.
 *
 * `location` is the geography point set by set_partner_location, and it
 * is the one dispatch actually measures from — a pincode with no point
 * is the bug that made a fully onboarded partner undispatchable twice.
 */
function areaDone({ vendor }) {
  if (!vendor) return { done: false, partial: false, detail: null }
  const located = !!vendor.city && !!vendor.pincode
  const radius = Number(vendor.service_radius_km) > 0
  return {
    done: located && radius,
    partial: located || radius,
    detail: located && radius ? `${vendor.city} · ${vendor.service_radius_km} km` : null,
  }
}

/**
 * Step 4 · only what their trades actually require.
 *
 * The requirement list is computed from the trades in step 1, so a
 * photographer is never blocked by a food licence. A requirement that is
 * not applicable is not in the list at all — see data/compliance.js.
 */
function complianceDone({ listings = [], documents = {}, vendor }) {
  const trades = listings.map(l => l.trade)
  const reqs = requirementsFor(trades)

  /* ── Counted by requirement, never by kind ────────────────────────
     This used to be `documents[r.documentKind]` — truthy if any row
     existed under that kind. Five trade requirements share the kind
     'shop_licence', so a partner listing Catering AND Venue uploaded
     one food licence and BOTH read as satisfied. It showed as a tick,
     which is worse than showing as a gap.

     `evaluateAll` asks each requirement what it declares — two sides,
     a number, a holder name, an expiry — and checks the row has it,
     and that it has not expired. A photograph on its own is no longer
     a satisfied requirement. */
  const byRequirement = documents.byRequirement ?? documents
  const evaluated = evaluateAll(reqs, byRequirement)

  /* ── Why this step needs an acknowledgement and the others do not ──
     Every other step is proved by its own data: a phone number is
     there or it is not. This step can be satisfied by an empty list —
     `MANDATORY_FROM` is unset, so nothing is required of anybody yet,
     and "zero of zero required documents are missing" is true for a
     partner who has never seen the screen.

     Auto-completing on that would skip the step entirely: the
     individual requirements are dynamic, the STEP is mandatory. So the
     partner has to have been here and said so, and that act is
     recorded in `completed_steps` (119) — which is what a persisted
     marker is legitimately for, as opposed to recording something the
     data already knows. */
  const acknowledged = (vendor?.completed_steps ?? []).includes('compliance')

  return {
    done: evaluated.canSubmit && acknowledged,
    partial: evaluated.satisfied > 0 || acknowledged,
    detail: evaluated.requiredTotal
      ? `${evaluated.requiredSatisfied} of ${evaluated.requiredTotal} required`
      : `${evaluated.satisfied} of ${reqs.length} added`,
  }

}

/** Step 5 · somewhere to pay them. */
function bankDone({ payout }) {
  return {
    done: !!payout,
    partial: false,
    detail: payout ? (payout.method === 'upi' ? 'UPI added' : 'Bank account added') : null,
  }
}

/** Step 6 · they have asked us to look. */
function reviewDone({ vendor }) {
  const status = vendor?.verification_status
  return {
    done: ['submitted', 'approved'].includes(status),
    partial: false,
    detail: status === 'approved' ? 'Approved' : status === 'submitted' ? 'With our team' : null,
  }
}

const PREDICATE = {
  business: businessDone,
  details: detailsDone,
  area: areaDone,
  compliance: complianceDone,
  bank: bankDone,
  review: reviewDone,
}

/**
 * Every step, with its status, for the given partner.
 *
 * ── Strictly sequential, and that is a product decision ────────────
 * A step is LOCKED until every step before it is COMPLETE. §11 asks for
 * exactly this, and the reason is worth keeping: the compliance step
 * cannot know which documents to ask for until the trades are chosen,
 * and the review step cannot show a profile that does not exist yet.
 * Letting somebody jump to step 4 first produces a screen that is
 * either empty or wrong.
 *
 * Completed steps stay editable — they are COMPLETE, not frozen.
 *
 * @param account { vendor, listings, documents, payout }
 * @returns [{ ...step, status, detail, done }]
 */
export function onboardingSteps(account = {}) {
  const out = []
  let blocked = false

  for (const step of STEPS) {
    const { done, partial, detail } = PREDICATE[step.id](account)

    let status
    if (done) status = STATUS.COMPLETE
    else if (blocked) status = STATUS.LOCKED
    else status = partial ? STATUS.IN_PROGRESS : STATUS.AVAILABLE

    /* An operator sent something back. It outranks everything else on
       that step, including LOCKED — a partner has to be able to reach
       the thing they are being asked to fix. */
    if (step.id === 'review' && account.vendor?.verification_status === 'rejected') {
      status = STATUS.REQUIRES_ACTION
    }

    out.push({ ...step, status, detail, done })
    if (!done) blocked = true
  }

  return out
}

/** The step a partner should be looking at right now. */
export function currentStep(account = {}) {
  const steps = onboardingSteps(account)
  return steps.find(s => s.status === STATUS.REQUIRES_ACTION)
    ?? steps.find(s => s.status !== STATUS.COMPLETE)
    ?? steps[steps.length - 1]
}

/** Has the whole thing been finished and submitted? */
export function onboardingComplete(account = {}) {
  return onboardingSteps(account).every(s => s.status === STATUS.COMPLETE)
}

/** 0–6, for the progress line. Counts only genuinely finished steps. */
export function completedCount(account = {}) {
  return onboardingSteps(account).filter(s => s.status === STATUS.COMPLETE).length
}

/**
 * May the partner open this step?
 *
 * The router asks this before rendering, so a typed URL cannot walk
 * into step 5 — §11 and TEST 12. Editing a finished step is allowed;
 * skipping an unfinished one is not.
 */
export function canOpen(stepId, account = {}) {
  const s = onboardingSteps(account).find(x => x.id === stepId)
  return !!s && s.status !== STATUS.LOCKED
}

/**
 * Where a partner lands once onboarding is behind them.
 *
 * Submitted is NOT live. §28/§29: until an operator approves, the
 * dashboard says so and Jobs stays shut — being shown the working app
 * is what made people think they were already verified.
 */
export const LIFECYCLE = {
  ONBOARDING: 'ONBOARDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REQUIRES_ACTION: 'REQUIRES_ACTION',
  LIVE: 'LIVE',
}

export function partnerLifecycle(account = {}) {
  const v = account.vendor
  if (!v) return LIFECYCLE.ONBOARDING
  if (v.verification_status === 'rejected') return LIFECYCLE.REQUIRES_ACTION
  if (v.is_verified && v.status === 'APPROVED') return LIFECYCLE.LIVE
  if (onboardingComplete(account)) return LIFECYCLE.UNDER_REVIEW
  return LIFECYCLE.ONBOARDING
}
