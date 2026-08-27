/**
 * What the law actually requires of this platform, as data.
 *
 * ══════════════════════════════════════════════════════════════════════
 * READ THIS BEFORE TRUSTING ANY OF IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * This file was written by an engineer, not a lawyer. It is a STRUCTURED
 * DRAFT whose job is to make a solicitor's review cheap and short — the
 * obligations are enumerated, the gaps are marked TODO, and every number
 * is cited to the rule it comes from.
 *
 * It is not legal advice and must not ship to a customer as final terms.
 * `REVIEW.status` below says where it stands, and the admin console reads
 * it — so an unreviewed policy is visible to the business rather than
 * quietly live.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THING THAT IS EASY TO MISS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The moment Sambramo takes a customer's money for a service another
 * business performs, it is a MARKETPLACE E-COMMERCE ENTITY under the
 * Consumer Protection (E-Commerce) Rules, 2020. That status is not
 * elective and does not wait for scale. It arrives with the first
 * booking, and it carries duties — a named Grievance Officer, published
 * seller details, stated refund timelines — that a pilot is as bound by
 * as Amazon is.
 *
 * Most of those duties are cheap if built in now and expensive to
 * retrofit, which is the only reason this file exists during Milestone 1
 * rather than after it.
 */

/* ═══════════════════════════════════════════════════════════════════
   WHERE THIS STANDS
   ═══════════════════════════════════════════════════════════════════ */

export const REVIEW = {
  /** 'draft' | 'in_review' | 'approved'. Nothing ships to a customer on 'draft'. */
  status: 'draft',
  drafted: '2026-08-27',
  reviewedBy: null,
  reviewedOn: null,
  /**
   * The specific questions worth paying a solicitor to answer. Listed so
   * the engagement is an hour rather than a discovery exercise.
   */
  questionsForCounsel: [
    'Does holding customer funds until T+24h post-event make Sambramo a payment aggregator requiring RBI authorisation, or is Razorpay Route sufficient as the authorised PA?',
    'Is the 10–50% cancellation deduction paid to the partner enforceable as a genuine pre-estimate of loss, or does it risk being read as a penalty under s.74 Contract Act?',
    'Does the collared floating price for pre-bookings satisfy the prohibition on manipulating price, given the cap is disclosed and the index is published?',
    'TCS under GST s.52 and TDS under s.194-O: which applies at what point in the escrow flow, and who issues the tax invoice to the customer — Sambramo or the partner?',
    'Is Sambramo an intermediary under s.79 IT Act for partner-supplied photos and descriptions, and does that protection survive our editing of them?',
  ],
}

/* ═══════════════════════════════════════════════════════════════════
   ENTITY DISCLOSURE — CP(E-Commerce) Rules 2020, r.4(2) and r.5
   ═══════════════════════════════════════════════════════════════════

   Every one of these must be displayed prominently, not buried. The rule
   requires it be visible "in a clear and accessible manner". A footer
   link satisfies that; a PDF nobody can open does not.
*/
export const ENTITY = {
  // TODO(legal): fill from the certificate of incorporation before launch.
  legalName: null,
  brandName: 'Sambramo',
  cin: null,
  gstin: null,
  registeredAddress: null,
  customerCareEmail: null,
  customerCarePhone: null,
}

/**
 * The Grievance Officer. Rule 4(5).
 *
 * The most-missed obligation and the cheapest to satisfy: a NAME, not a
 * role inbox. The clock is statutory — acknowledge within 48 hours,
 * resolve within one month — and both are stamped on every complaint so
 * the SLA is measurable rather than aspirational.
 */
export const GRIEVANCE = {
  officerName: null,          // TODO(legal): a real person, named.
  email: null,
  phone: null,
  address: null,
  acknowledgeWithinHours: 48, // CP(E-Commerce) Rules 2020, r.4(5)
  resolveWithinDays: 30,      // Same. One month from receipt.
}

/* ═══════════════════════════════════════════════════════════════════
   TAX — and this one changes the money
   ═══════════════════════════════════════════════════════════════════

   An e-commerce operator that collects payment on behalf of a supplier
   has two statutory deductions that are NOT the platform's commission
   and must not be netted against it:

     TCS   GST s.52   1% of the net taxable value of supplies made
                      through the platform. Collected by us, deposited
                      by us, filed in GSTR-8, credited to the partner's
                      electronic cash ledger.

     TDS   IT 194-O   1% of the gross amount credited to the partner.
                      Nil for an individual/HUF below the annual
                      threshold who has furnished a PAN — which is most
                      of this supply base, and is why
                      partner_payout_accounts.pan_number exists.

   ── Why this is a schema fact and not an accounting detail ───────────
   A partner offered "You earn ₹10,540" who receives ₹10,329 will
   conclude they were short-changed, and they will be right to ask. The
   offer card must show the deduction, or the number on it is not what
   they earn. `booking_lines` splits fee and partner share; the statutory
   deductions are a THIRD slice and cannot be folded into either.

   Both rates are statutory and change by notification, not by us. They
   are here so there is exactly one place to change them.
*/
export const TAX = {
  tcsRate: 0.01,   // GST s.52
  tdsRate: 0.01,   // IT 194-O
  /**
   * Below this annual gross, an individual/HUF partner with a PAN on
   * file is exempt from 194-O. Re-check the figure at each budget.
   */
  tdsExemptionThresholdInr: 500000,
  gstOnCommissionRate: 0.18,  // Our commission is a service; 18% applies.
  note:
    'TCS and TDS are collected on the partner’s behalf and deposited with the ' +
    'authorities. They are not Sambramo’s income and are shown as separate ' +
    'lines on every earnings statement.',
}

/* ═══════════════════════════════════════════════════════════════════
   DARK PATTERNS — CCPA Guidelines, 2023
   ═══════════════════════════════════════════════════════════════════

   Thirteen named practices, prohibited outright, each carrying penalties
   under the Consumer Protection Act. This is not a principles document a
   designer can argue with.

   Listed here as a SELF-AUDIT with the specific place THIS app could
   plausibly commit each one, because a checklist of abstractions gets
   ticked without being read. Every `risk` below is a real screen in this
   codebase.
*/
export const DARK_PATTERNS = [
  {
    id: 'false_urgency',
    risk: 'The 45-second offer countdown, and any "3 masters left" copy on the matching screen.',
    rule: 'The countdown must be the real dispatch_offers.expires_at. A scarcity count must be a real COUNT(*), never a decorative number.',
  },
  {
    id: 'basket_sneaking',
    risk: 'Adding a service the customer did not tap.',
    rule: 'Nothing enters booking_lines without an explicit tap. No pre-ticked extras.',
  },
  {
    id: 'confirm_shaming',
    risk: 'The cancellation sheet.',
    rule: 'State the deduction and the reason. Never "are you sure you want to disappoint them?"',
  },
  {
    id: 'forced_action',
    risk: 'Requiring signup to see a price.',
    rule: 'The quote is visible before auth. Sign-in is asked at payment, as the shop already does.',
  },
  {
    id: 'subscription_trap',
    risk: 'Partner subscription plans (vendor_subscriptions).',
    rule: 'Cancelling must be as easy as signing up: in-app, no phone call.',
  },
  {
    id: 'interface_interference',
    risk: 'Making "Pay for 3 now" visually dominant over "keep looking".',
    rule: 'Equal visual weight. Partial fill is not a failure state and must not be styled as one.',
  },
  {
    id: 'bait_and_switch',
    risk: 'The `discuss` services — advertising a price for "standard setup" and delivering less.',
    rule: 'The standard setup must be specified concretely enough to be checked against. This is the highest-risk pattern in this product.',
  },
  {
    id: 'drip_pricing',
    risk: 'Revealing the platform fee, GST or any charge only at checkout.',
    rule: 'The number on the matching screen is the number charged. No line appears later.',
  },
  {
    id: 'disguised_advertisement',
    risk: 'Promoted partners in match results.',
    rule: 'If a partner ever pays for placement it must be labelled. Today match_partners() orders by rating and distance only — that is a promise.',
  },
  {
    id: 'nagging',
    risk: 'Repeat push to finish a booking.',
    rule: 'At most one reminder per abandoned basket.',
  },
  {
    id: 'trick_wording',
    risk: 'Wording the cancellation deduction as a "service adjustment".',
    rule: 'Call it what it is: money that goes to your master.',
  },
  { id: 'saas_billing',  risk: 'Not applicable — no recurring consumer billing.', rule: 'Re-audit if a customer membership ships.' },
  { id: 'rogue_malware', risk: 'Not applicable.', rule: '—' },
]

/* ═══════════════════════════════════════════════════════════════════
   WHAT THE CUSTOMER IS ACTUALLY SHOWN
   ═══════════════════════════════════════════════════════════════════

   Six lines, because terms nobody reads are consent in form and not in
   fact — the same reasoning RETURN_TERMS in policies.js already follows.
   The full document sits behind a link; these are the points that change
   what happens to somebody's money, and they are stated before payment
   rather than after.
*/
export const BOOKING_TERMS = {
  version: REVIEW.drafted,
  heading: 'Before you pay',
  points: [
    'Sambramo connects you with independent masters. They perform the service; we arrange it, hold the payment and stand behind it.',
    'Your money is held until 24 hours after your event. The master is paid once it is done and you have had a chance to raise anything.',
    'The price shown is what is charged. No fee, tax or charge is added later.',
    'Where the setup is agreed on a call, the price covers the standard setup described. Anything beyond it is agreed with you before work starts.',
    'Cancel before a master accepts and you get everything back. After that, part goes to the master — not to us — because they cleared their day.',
    'Something wrong? Raise it within 24 hours and the payment stays held until it is settled.',
  ],
  confirm: 'I have read and agree to the booking terms.',
}

/** Statutory footer block. Rule 4(2) wants these visible, not filed away. */
export const DISCLOSURE_FOOTER = {
  lines: [
    () => ENTITY.legalName && `${ENTITY.legalName}${ENTITY.cin ? ` (CIN ${ENTITY.cin})` : ''}`,
    () => ENTITY.registeredAddress,
    () => ENTITY.gstin && `GSTIN ${ENTITY.gstin}`,
    () => GRIEVANCE.officerName && `Grievance Officer: ${GRIEVANCE.officerName}${GRIEVANCE.email ? ` · ${GRIEVANCE.email}` : ''}`,
  ],
}

/**
 * Is the platform legally ready to take money from a real customer?
 *
 * Deliberately a hard list rather than a checklist somebody reads. The
 * admin console shows it, and it stays non-empty until the blanks above
 * are filled and counsel has signed off — so "we never got round to the
 * Grievance Officer" cannot survive contact with the launch decision.
 */
export function complianceGaps() {
  const gaps = []
  if (REVIEW.status !== 'approved')  gaps.push('Terms have not been reviewed by counsel')
  if (!ENTITY.legalName)             gaps.push('Registered legal name not set')
  if (!ENTITY.gstin)                 gaps.push('GSTIN not set — required before collecting TCS')
  if (!ENTITY.registeredAddress)     gaps.push('Registered address not published')
  if (!GRIEVANCE.officerName)        gaps.push('No named Grievance Officer (CP e-Comm Rules r.4(5))')
  if (!GRIEVANCE.email)              gaps.push('No grievance contact published')
  return gaps
}

export const isLaunchReady = () => complianceGaps().length === 0
