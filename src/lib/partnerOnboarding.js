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
  { id: 'details', n: '01', title: 'Business Profile', blurb: 'Tell customers who you are and what your business does.' },
  { id: 'business', n: '02', title: 'Services & Pricing', blurb: 'Choose your trades, create an offer and set customer-ready pricing.' },
  { id: 'area', n: '03', title: 'Service Area & Availability', blurb: 'Where you work and when Sambramo can offer you scheduled jobs.' },
  { id: 'compliance', n: '04', title: 'Verification & Compliance', blurb: 'Only the verification required for your selected services.' },
  { id: 'bank', n: '05', title: 'Payout Setup', blurb: 'Where your Sambramo earnings are paid.' },
  { id: 'review', n: '06', title: 'Review & Submit', blurb: 'Review everything once, then send your application to Sambramo.' },
];

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
function detailsDone({ vendor }) {
  const businessName = String(vendor?.business_name ?? '').trim().length >= 3
  const phone = String(vendor?.contact_phone ?? '').replace(/\D/g, '').length >= 10
  return {
    done: businessName && phone,
    partial: !!vendor && (businessName || phone || !!String(vendor?.description ?? '').trim()),
    detail: businessName && phone ? 'Business profile ready' : null,
  }
}

function businessDone({ vendor, listings = [], pricing = {} }) {
  const configured = listings.filter(l => (l.offerings?.length ?? 0) > 0)
  const businessReady = !!String(vendor?.business_name ?? '').trim()
  const readyByService = pricing?.byService ?? {}
  const servicesReady = configured.length > 0 && configured.every(l =>
    l.offerings.every(s => readyByService[s.id]?.ready))
  const allReady = businessReady && configured.length > 0 && servicesReady
  return {
    done: allReady,
    partial: !!vendor || listings.length > 0,
    detail: allReady
      ? `${configured.length} service${configured.length === 1 ? '' : 's'} ready with pricing`
      : configured.length
        ? `${configured.length} service${configured.length === 1 ? '' : 's'} selected — finish listing + pricing`
        : listings.length ? 'Started — finish at least one service' : null,
  }
}

function areaDone({ vendor, weeklyRules = [], availability = {} }) {
  if (!vendor) return { done: false, partial: false, detail: null }
  const located = !!vendor.city && !!vendor.pincode
  const radius = Number(vendor.service_radius_km) > 0
  const calendarConfigured = weeklyRules.length > 0 || Object.keys(availability ?? {}).length > 0 || !!vendor.calendar_reviewed_through
  return {
    done: located && radius && calendarConfigured,
    partial: located || radius || calendarConfigured,
    detail: located && radius && calendarConfigured
      ? `${vendor.city} · ${vendor.service_radius_km} km · calendar set`
      : null,
  }
}

/**
 * Verification is still trade-specific. A photographer must not be asked
 * for a catering document simply because another service on the account needs it.
 */
function complianceDone({ listings = [], documents = {}, vendor }) {
  const trades = listings.map(l => l.trade)
  const reqs = requirementsFor(trades)
  const byRequirement = documents.byRequirement ?? documents
  const evaluated = evaluateAll(reqs, byRequirement)
  const acknowledged = (vendor?.completed_steps ?? []).includes('compliance')
  return {
    done: evaluated.canSubmit && acknowledged,
    partial: evaluated.satisfied > 0 || acknowledged,
    detail: evaluated.requiredTotal
      ? `${evaluated.requiredSatisfied} of ${evaluated.requiredTotal} required`
      : `${evaluated.satisfied} of ${reqs.length} required added`,
  }
}

/** Step 4 · somewhere to pay them. */
function bankDone({ payout }) {
  return {
    done: !!payout,
    partial: false,
    detail: payout ? (payout.method === 'upi' ? 'UPI added' : 'Bank account added') : null,
  }
}

/** Step 5 · they have asked us to look. */
function reviewDone({ vendor }) {
  const status = vendor?.verification_status
  return {
    done: ['submitted', 'approved'].includes(status),
    partial: false,
    detail: status === 'approved' ? 'Approved' : status === 'submitted' ? 'With our team' : null,
  }
}

const PREDICATE = {
  details: detailsDone,
  business: businessDone,
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

/** 0–5, for the progress line. Counts only genuinely finished steps. */
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
