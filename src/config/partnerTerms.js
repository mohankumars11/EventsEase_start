import { PLATFORM_FEE_RATE } from './instantBooking'
import { ENTITY, GRIEVANCE } from './legal'

/**
 * ══════════════════════════════════════════════════════════════════════
 * DRAFTED BY AN ENGINEER. NOT REVIEWED BY COUNSEL.
 * ══════════════════════════════════════════════════════════════════════
 *
 * The same warning config/legal.js carries, and for the same reason:
 * this is now a SIGNED agreement, taken from every partner during
 * onboarding and stored against their account with their name and the
 * moment they signed. That makes it the document Sambramo would be
 * holding up in a consumer forum, and it was written by somebody who
 * reads the Companies Act for fun and is not admitted to practise.
 *
 * It is here because a marketplace that dispatches jobs to strangers
 * needs SOMETHING signed on day one, and an unreviewed agreement a
 * partner has actually read beats a reviewed one nobody was ever shown.
 * It is not a substitute for the review.
 *
 * ── What counsel must settle before this is called final ─────────────
 * TERMS_REVIEW.questionsForCounsel, below. Every one of them changes
 * what a clause here can say.
 *
 * ── The blanks are real blanks ───────────────────────────────────────
 * ENTITY.legalName, ENTITY.cin, ENTITY.gstin and GRIEVANCE.officerName
 * are all null until the certificate of incorporation exists. The
 * agreement renders what it has and says plainly what is outstanding
 * rather than printing a plausible-looking placeholder — an invented CIN
 * in a signed document is worse than an admitted gap.
 */
export const TERMS_REVIEW = {
  /** 'draft' | 'in_review' | 'approved'. */
  status: 'draft',
  drafted: '2026-09-09',
  draftedBy: 'engineering',
  reviewedBy: null,
  reviewedOn: null,
  questionsForCounsel: [
    'Is the genuineness undertaking (clause "What you promise") enforceable as a contractual warranty, and does a breach of it support removal plus recovery of the customer refund, or only removal?',
    'Does taking this agreement by hold-to-sign with a typed name satisfy s.10A of the IT Act 2000 for a contract of this value, or is an Aadhaar/DSC e-signature needed for the indemnity and set-off clauses to hold?',
    'Sambramo is the "e-commerce entity" and the partner the "seller" under CP(E-Commerce) Rules 2020 r.5 — confirm which of the r.5(3) seller disclosures we must collect from the partner at onboarding rather than at first booking.',
    'Is the set-off of a customer refund against a partner\'s unpaid earnings lawful without a separate written authority, or must it be a distinct authorisation?',
    'Does a partner listing work they have not done constitute an unfair trade practice by Sambramo under s.2(47) CPA 2019 if we published it, and does our review step discharge that?',
    'The Companies Act 2013 disclosures below are stated as applying "once incorporated" — confirm what must appear before incorporation completes, given we are taking signatures now.',
  ],
}

/**
 * What a partner is agreeing to, in the words they would use.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS CARDS AND NOT A WALL OF TEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nobody reads terms. That is not cynicism, it is the measured behaviour
 * of every user of every product, and a screen designed as though people
 * do read them is a screen designed to produce a tap rather than an
 * understanding.
 *
 * So the rules that actually bite are stated as short cards a
 * person can scan in twenty seconds — the fee, the call, the
 * cancellation ladder, the strikes, when money arrives, and the one that
 * gets partners removed. The long-form version is underneath for anybody
 * who wants it, and for the record.
 *
 * The test each card had to pass: would a master be surprised by this
 * later? If yes it is on a card. If no it belongs in the long form.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY NUMBER HERE IS READ FROM THE CODE THAT ENFORCES IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The fee comes from PLATFORM_FEE_RATE. The strike count and window come
 * from migration 083; the refund ladder from 081. They are quoted here
 * rather than retyped, because terms that disagree with the software are
 * worse than no terms — they are a promise the product breaks by itself.
 *
 * ── The version matters ─────────────────────────────────────────────
 * Stamped into `vendors.terms_version` on acceptance (migration 090).
 * Changing these words must not silently rewrite what somebody already
 * agreed to: a partner who accepted v1 is held to v1 until they accept
 * the next one, which is the same rule config/policies.js applies to
 * customers.
 *
 * Bump this ONLY when the substance changes. A typo fix is not a new
 * agreement and should not log every partner out of their own consent.
 *
 * v2 is a substantive change and therefore a real bump: it adds the
 * genuineness undertaking and what follows from breaking it, the entity
 * and grievance disclosures the CP(E-Commerce) Rules require, and it
 * becomes a signed agreement rather than a ticked box. Everybody on v1
 * is asked again, which is the correct outcome — v1 said nothing about
 * misrepresentation and cannot be used to act on it.
 */
export const PARTNER_TERMS_VERSION = '2026-09-09.v2'

const FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100)

/** The ones that would otherwise be a surprise. */
export const PARTNER_RULES = [
  {
    id: 'fee',
    icon: 'percent',
    title: 'What you see is what you get',
    /* The commission is NOT quoted here, and that is deliberate.
     *
     * A percentage on a consent card is a number somebody does mental
     * arithmetic against instead of reading the rest, and the figure
     * that actually matters to a partner is on every job already: what
     * THEY earn, net, before they accept.
     *
     * It is stated in full in the long terms below, under Pricing.
     * Removing it entirely would be hiding it — a partner who finds out
     * at their first payout has been misled, and says so publicly. */
    body: 'The earning shown on a job is what reaches you. No joining fee, no monthly fee, and nothing deducted for showing you work. Our share is set out in full in the terms below.',
  },
  {
    id: 'call',
    icon: 'phone',
    title: 'Call the customer within 30 minutes',
    body: 'Their number unlocks the moment their payment clears. Ring them and agree the details — colours, timings, what exactly you are bringing — before the day.',
  },
  {
    id: 'money',
    icon: 'wallet',
    title: 'You are paid after the job is delivered',
    body: 'The customer pays up front and Sambramo holds it. It is released to you once the event is completed successfully and nothing is disputed. That protects you as much as them: the money already exists before you set out.',
  },
  {
    id: 'accept',
    icon: 'check',
    title: 'Only accept what you can actually do',
    body: 'Accepting blocks that date for you and stops us looking for anyone else. A job you take and cannot do costs the customer their celebration and costs you your standing.',
  },
  {
    /* ══════════════════════════════════════════════════════════════════
       THE ONE THIS AGREEMENT EXISTS FOR
       ══════════════════════════════════════════════════════════════════

       Everything a partner types into the listing flow is an unverified
       claim, and dispatch sends real jobs on the strength of it. A
       decorator who ticks "vintage car" because it might get them work
       is not committing fraud in their own mind — they are hoping to
       arrange one. The family standing in a hall at 6pm experiences it
       as fraud regardless.

       So it is said here, in a card, before any of it is typed, and
       again on the listing signature at the end of the flow. Said once
       it is a policy; said at both ends it is an understanding. */
    id: 'genuine',
    icon: 'badge',
    title: 'Only list work you have actually done',
    body: 'Everything you tick becomes a promise we make to a customer on your behalf. Do not list a service, a dish, a vehicle or a capacity you have not done before, hoping to arrange it later. Listing what you cannot deliver is the fastest way off Sambramo, and where a customer is left without their booking we will recover what it cost to put right.',
  },
  {
    id: 'cancel',
    icon: 'undo',
    title: 'Cancelling after you accepted has a cost',
    body: 'More than 48 hours before the event, you keep 10% of the line. Inside 48 hours it is 25%, inside 12 hours 50%, and once the event has started the full amount. Before you accept, nothing is owed either way.',
  },
  {
    id: 'strikes',
    icon: 'alert',
    title: 'Three cancellations in 90 days and you are suspended',
    body: 'Counted only where you cancelled a job you had already accepted. Genuine emergencies are reviewed — tell us rather than letting it lapse.',
  },
  {
    id: 'offplatform',
    icon: 'ban',
    title: 'Do not take the booking off Sambramo',
    body: 'Asking a customer we introduced you to for cash outside the app removes you permanently. It also removes their protection, and ours: no escrow, no record, and no recourse for either of you if the day goes wrong.',
  },
]

/**
 * The long form. Deliberately after the cards, deliberately shorter than
 * a lawyer would write it, and deliberately in the second person — an
 * agreement somebody cannot read is not consent, whatever a court says.
 */
export const PARTNER_TERMS_LONG = [
  {
    heading: 'Who you are contracting with',
    text: 'Sambramo operates a marketplace that introduces customers to independent event professionals in Bengaluru. You are not employed by Sambramo. You set your own availability, decline any job, and work for whoever else you like.',
  },
  {
    heading: 'What you promise',
    text: 'That you are able and equipped to do the work you list; that the details you give us — your business, your services, your bank account — are true; and that you will turn up, on time, for what you accept.',
  },
  {
    /* The genuineness undertaking, stated as an obligation rather than
       as advice, because a "please be honest" is not something anybody
       can be held to. */
    heading: 'Everything you list must be work you have really done',
    text: 'When you list a trade, a service, a dish, a vehicle, a capacity or an option, you are telling us you have done that work before and can do it again. Sambramo publishes it to customers as a statement of fact about you and takes bookings on it. Do not tick anything on the strength of being able to arrange it, subcontract it or learn it in time. If you are not sure whether something counts, leave it off — nothing is held against you for a shorter list, and a shorter list you can deliver earns more than a long one you cannot.',
  },
  {
    heading: 'What happens if something you listed is not true',
    text: 'If a listing turns out to describe work you have not done, we may take that listing down, hold or cancel bookings made against it, suspend or permanently remove your account, and withhold payment for the affected booking. Where a customer has to be refunded or their event put right at our cost because you could not deliver what you listed, we may recover that amount from you, including by setting it off against earnings we are holding for you. Where a misrepresentation was deliberate and caused loss, we may report it to the authorities and pursue it in the civil courts. None of this applies to an honest mistake you tell us about before the event — say so and we will move the booking.',
  },
  {
    heading: 'Your reviews, photographs and testimonials',
    text: 'Photographs and testimonials you upload must be of work you did yourself. Do not upload another business\'s photographs, stock images presented as your own work, or reviews you wrote or paid for. Under the Consumer Protection Act 2019 a false or misleading representation about a service is an unfair trade practice, and publishing one through Sambramo exposes both of us.',
  },
  {
    heading: 'Pricing',
    text: `Sambramo sets the customer price from a published rate card. You see your earning on every job before you accept it, and you are free to decline. Sambramo's share of each booking is ${FEE_PCT}%, already deducted from the earning shown to you — you are never invoiced for it separately.`,
  },
  {
    heading: 'Payment and holding',
    text: 'Customer money is held against your booking and released to you once the event is completed successfully and no dispute is open — in practice within 24 hours of the event ending. Payouts go to the account you give us, once we have verified it. We do not hold your money for any other purpose and we do not lend it.',
  },
  {
    heading: 'Cancellation',
    text: 'The ladder in the cards above applies per service and against the time you accepted it. Cancelling a service you have not accepted costs nothing. Repeated cancellation after acceptance leads to suspension.',
  },
  {
    heading: 'Your customer’s details',
    text: 'You receive a customer’s name and number to do their job and for nothing else. Do not add them to marketing lists, do not pass them on, and do not contact them after the event except about that event.',
  },
  {
    heading: 'Suspension and removal',
    text: 'We may suspend an account for repeated cancellation, for not turning up, for taking bookings off the platform, or for conduct that puts a customer at risk. You will be told why. Money already earned for delivered work is still paid.',
  },
  {
    heading: 'Changes',
    text: 'If these terms change in substance you will be asked to accept the new version before continuing. The version you accepted is recorded against your account with the date.',
  },
  {
    /* ── Statutory disclosures ─────────────────────────────────────────
       CP(E-Commerce) Rules 2020 r.4(2) requires the entity's legal name,
       registered address and contact details to be displayed in a clear
       and accessible manner. Rule 4(5) requires a NAMED grievance
       officer with a 48-hour acknowledgement and one-month resolution.

       These read from config/legal.js rather than being retyped, so the
       day the certificate of incorporation arrives, one file changes and
       the agreement is correct everywhere. Until then they say what is
       missing — see the note at the head of this file. */
    heading: 'Who Sambramo is',
    text: ENTITY.legalName
      ? `${ENTITY.legalName} (trading as ${ENTITY.brandName}), a company incorporated under the Companies Act 2013, CIN ${ENTITY.cin ?? 'to be confirmed'}, GSTIN ${ENTITY.gstin ?? 'to be confirmed'}, registered at ${ENTITY.registeredAddress ?? 'the address on our website'}. Contact ${ENTITY.customerCareEmail ?? 'the address on our website'}.`
      : `${ENTITY.brandName} is being incorporated as a private limited company under the Companies Act 2013. The registered legal name, CIN, GSTIN and registered office will be published here and notified to you as soon as incorporation completes, and this agreement will be reissued for signature at that point. Until then you are contracting with the promoters of ${ENTITY.brandName}, and nothing in this agreement limits any right you have against them personally.`,
  },
  {
    heading: 'Complaints, and who handles them',
    text: GRIEVANCE.officerName
      ? `Our Grievance Officer is ${GRIEVANCE.officerName} (${GRIEVANCE.email ?? 'see our website'}${GRIEVANCE.phone ? `, ${GRIEVANCE.phone}` : ''}). Any complaint is acknowledged within ${GRIEVANCE.acknowledgeWithinHours} hours and resolved within ${GRIEVANCE.resolveWithinDays} days, as required by the Consumer Protection (E-Commerce) Rules 2020.`
      : `A named Grievance Officer will be appointed and published before Sambramo takes public bookings, as the Consumer Protection (E-Commerce) Rules 2020 require. Until then, raise anything with the Sambramo person who signed you up, or through the app. We will acknowledge within ${GRIEVANCE.acknowledgeWithinHours} hours and aim to resolve within ${GRIEVANCE.resolveWithinDays} days.`,
  },
  {
    heading: 'Your status, and your own obligations',
    text: 'You are an independent business, not an employee, agent or partner of Sambramo, and nothing here creates a partnership under the Indian Partnership Act 1932 or an employment relationship. You remain responsible for your own registrations and returns — GST where your turnover requires it, shop and establishment registration, food safety licensing under FSSAI if you handle food, and any trade licence, permit or insurance your work requires. Sambramo deducts TCS under s.52 CGST Act and TDS under s.194-O of the Income Tax Act where they apply, and gives you the certificate for each; that is not a substitute for your own filings.',
  },
  {
    heading: 'Tax on what you earn',
    text: 'The earning shown to you on a job is net of our fee and of the statutory deductions above. You are responsible for the tax you owe on it. We will make the deduction statements available in the app.',
  },
  {
    heading: 'If we disagree',
    text: 'Talk to us first — most of what reaches a court here was a phone call that did not happen. Anything not resolved that way is governed by the laws of India, and the courts at Bengaluru, Karnataka have exclusive jurisdiction. Nothing here takes away a right you have under the Consumer Protection Act 2019 or any other law that cannot be contracted out of.',
  },
  {
    heading: 'What you are signing',
    text: 'Signing this records your name, the moment you signed, and the version of these terms shown to you, against your account. Under s.10A of the Information Technology Act 2000 an agreement is not invalid merely because it was formed electronically. You can read this again at any time from your account, and you will be asked to sign again if these terms change in substance.',
  },
]
