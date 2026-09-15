/**
 * Where a partner belongs right now, asked in one place.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS TO CLOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Three separate places decided where a signed-in vendor lands —
 * `homeFor()`, `RootScreen` and `PartnerEntry`'s own effect — and all
 * three said the same thing: `/dashboard/vendor`. Unconditionally.
 *
 * So a partner who verified their email two seconds ago, who has no
 * vendors row, no trade, no listing and no terms signed, was dropped on
 * the working dashboard. `/partner/setup` — "Great! Let's get started",
 * the screen that tells them what setup is going to ask for — was
 * written, routed, and never navigated to by anything. It was reachable
 * only by typing the URL.
 *
 * A fourth copy of the rule would not have helped. The rule has to be
 * ONE function that every entry point asks, because the failure was not
 * a wrong answer — it was three answers that could drift.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DERIVED FROM WHAT IS ALREADY ON THE ROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Deliberately no new columns are REQUIRED. Every stage below is
 * answerable from data that exists in production today, so this works
 * before migration 119 is pasted in as well as after:
 *
 *   no vendors row          they have an auth account and nothing else
 *   vendors row, 0 services onboarded, never picked a trade
 *   services, none live     waiting on an operator
 *   any service rejected    an operator asked for a change
 *
 * Migration 119 adds `onboarding_status` and `current_onboarding_step`,
 * which make "Complete Later" and per-trade resume server-side rather
 * than inferred. This file READS them when they are present and falls
 * back to the inference when they are not — so nothing here breaks on a
 * database where 119 has not been applied yet.
 */

export const STAGE = {
  /** Auth account, no vendors row. → "Great! Let's get started" */
  NEW:             'NEW',
  /** Started setup and left it. → back into the form they left */
  ONBOARDING:      'ONBOARDING',
  /** Set up, but has never said what they do. → What You Offer */
  CHOOSE_TRADES:   'CHOOSE_TRADES',
  /** Everything submitted, an operator has not read it yet. */
  UNDER_REVIEW:    'UNDER_REVIEW',
  /** An operator sent something back. */
  REQUIRES_ACTION: 'REQUIRES_ACTION',
  /** At least one listing live. The working app. */
  LIVE:            'LIVE',
}

/* The vendors row column names that 119 adds. Read defensively: a row
   from a database without 119 simply has neither, and `undefined` falls
   through every branch below to the inferred answer. */
const DEFERRED = 'setup_later'

/**
 * @param vendor   the `vendors` row, or null when there is none
 * @param services `vendor_services` rows for that vendor (may be [])
 */
export function partnerStage({ vendor, services = [] } = {}) {
  if (!vendor) return STAGE.NEW

  /* Server-side resume, when 119 is applied. A partner who tapped
     "Complete Later" is not NEW — they have a row — but they have not
     finished either, and the intro screen is where they asked to be
     put back. */
  if (vendor.onboarding_status === DEFERRED && !services.length) return STAGE.NEW

  const live     = services.filter(s => s.review_status === 'live')
  const rejected = services.filter(s => s.review_status === 'rejected')

  if (rejected.length) return STAGE.REQUIRES_ACTION
  if (live.length)     return STAGE.LIVE
  if (!services.length) return STAGE.CHOOSE_TRADES
  return STAGE.UNDER_REVIEW
}

/**
 * The route a stage opens on.
 *
 * UNDER_REVIEW, REQUIRES_ACTION and LIVE all land on the dashboard: it
 * already renders the right thing for each of them (the review banner,
 * the rejection card, the jobs list). Only the two pre-dashboard stages
 * route somewhere else.
 */
export function routeForStage(stage) {
  switch (stage) {
    case STAGE.NEW:           return '/partner/setup'
    case STAGE.ONBOARDING:    return '/onboarding/vendor'
    case STAGE.CHOOSE_TRADES: return '/dashboard/vendor?tab=list'
    default:                  return '/dashboard/vendor'
  }
}

/** Both at once, for the entry points that only want a destination. */
export function partnerRoute(account) {
  return routeForStage(partnerStage(account))
}

/* ══════════════════════════════════════════════════════════════════════
   "COMPLETE LATER", REMEMBERED
   ══════════════════════════════════════════════════════════════════════

   The brief asks for a persistent state, not a temporary screen, and the
   difference shows on the next sign-in: a partner who chose to come back
   later should be met with "Let's finish setting up", not asked to start
   something they already started.

   Two places, because they cover different partners:

     the vendors row   for somebody who has one. Survives a reinstall and
                       a new phone, and is what an operator can see.
     localStorage      for somebody who does NOT have one yet — which is
                       every partner who taps this on their first visit,
                       since the vendors row is not created until the
                       onboarding form is submitted. Device-local is all
                       there is to write to at that point, and it is
                       honest about that: it is a convenience, not a
                       record.

   Both are best-effort. A partner tapping "Complete Later" with no
   signal, or on a database where migration 119 has not been applied,
   still gets to leave — the write failing must never trap them on the
   screen they are trying to step away from. */

const LOCAL_KEY = 'sb_partner_setup_deferred_v1'

export function readLocalDeferral() {
  try { return localStorage.getItem(LOCAL_KEY) === '1' } catch { return false }
}

export async function deferSetup(vendorId) {
  try { localStorage.setItem(LOCAL_KEY, '1') } catch { /* private mode */ }
  if (!vendorId) return
  try {
    const { supabase } = await import('./supabase')
    await supabase.from('vendors')
      .update({ onboarding_status: DEFERRED })
      .eq('id', vendorId)
  } catch {
    /* No column yet (119 unapplied) or no signal. The local flag stands
       in, and the inferred stage is unchanged either way. */
  }
}

/** Setup was resumed or finished — stop calling them a returning drop-off. */
export function clearDeferral() {
  try { localStorage.removeItem(LOCAL_KEY) } catch { /* private mode */ }
}
