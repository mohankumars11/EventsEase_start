/**
 * Account-level identity and payout status — one answer for every trade.
 *
 * A partner has ONE identity and ONE payout profile, however many trades
 * they list. Every trade flow, the service selector and the Jobs tab read
 * these two functions, so "is my payout set up?" cannot have one answer
 * on Catering and another on Photography.
 *
 * Both are derived from rows the backend wrote — vendor_documents and the
 * operator's decision on `vendors`, vendor_payout_details, and the
 * Razorpay Route status in partner_payout_accounts. Nothing here can say
 * "verified" or "active" on the strength of a saved form:
 *
 *   saved bank details       → DETAILS_SAVED, not active
 *   Razorpay account created → ACTIVATION_PENDING, not active
 *   Razorpay says activated  → ACTIVE, the only state instant booking
 *                              (resolve_booking, migration 20261010_15) accepts
 */

export const IDENTITY = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  ACTION_REQUIRED: 'action_required',
  NOT_STARTED: 'not_started',
}

export const PAYOUT = {
  NOT_STARTED: 'not_started',
  DETAILS_SAVED: 'details_saved',
  DETAILS_VERIFIED: 'details_verified',
  ACTIVATION_PENDING: 'activation_pending',
  ACTION_REQUIRED: 'action_required',
  ACTIVE: 'active',
  RESTRICTED: 'restricted',
}

/* The shared identity requirements (lib/verification/requirements.js
   BASELINE). Trade licences are deliberately NOT here: a verified
   identity never stands in for a licence. */
const IDENTITY_REQUIREMENTS = ['VER-ID-IDENTITY', 'VER-ID-SELFIE']

/**
 * @param vendor  the vendors row (is_verified is set only by an operator)
 * @param docs    { [requirement_id]: status } from vendor_documents
 */
export function identityStatus(vendor, docs = {}) {
  if (vendor?.is_verified) return IDENTITY.VERIFIED
  const states = IDENTITY_REQUIREMENTS.map(id => docs[id]).filter(Boolean)
  if (states.includes('rejected')) return IDENTITY.ACTION_REQUIRED
  if (docs['VER-ID-IDENTITY']) return IDENTITY.PENDING
  return IDENTITY.NOT_STARTED
}

/**
 * @param details  vendor_payout_details row (method, verified_at) or null
 * @param account  partner_payout_accounts row (route_status) or null
 */
export function payoutStatus(details, account) {
  const route = account?.route_status ?? null
  if (route === 'activated') return PAYOUT.ACTIVE
  if (route === 'suspended' || route === 'rejected') return PAYOUT.RESTRICTED
  if (route === 'needs_clarification') return PAYOUT.ACTION_REQUIRED
  if (account?.route_account_id || route) return PAYOUT.ACTIVATION_PENDING
  if (!details) return PAYOUT.NOT_STARTED
  return details.verified_at ? PAYOUT.DETAILS_VERIFIED : PAYOUT.DETAILS_SAVED
}

/** Words for a status chip, and whether it is good, waiting or needs the partner. */
export const IDENTITY_TEXT = {
  verified: { label: 'Verified', note: 'No action needed.', tone: 'good' },
  pending: { label: 'Pending', note: 'Our team is checking your ID.', tone: 'wait' },
  action_required: { label: 'Action required', note: 'Upload or correct your document.', tone: 'act' },
  not_started: { label: 'Not started', note: 'Add your ID once — every service uses it.', tone: 'act' },
}

export const PAYOUT_TEXT = {
  active: { label: 'Active', note: 'Ready for eligible payouts.', tone: 'good' },
  activation_pending: { label: 'Pending', note: 'Razorpay is verifying your payout account.', tone: 'wait' },
  details_verified: { label: 'Pending', note: 'Bank details checked. Finish Razorpay setup in Payouts.', tone: 'wait' },
  details_saved: { label: 'Pending', note: 'Details saved. Finish verification in Payouts.', tone: 'wait' },
  action_required: { label: 'Action required', note: 'Razorpay needs more details.', tone: 'act' },
  restricted: { label: 'Restricted', note: 'Payouts are on hold. Contact Sambramo support.', tone: 'act' },
  not_started: { label: 'Not configured', note: 'Set up your payout account.', tone: 'act' },
}
