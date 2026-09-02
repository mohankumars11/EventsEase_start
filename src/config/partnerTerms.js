import { PLATFORM_FEE_RATE } from './instantBooking'

/**
 * What a partner is agreeing to, in the words they would use.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SEVEN CARDS AND NOT A WALL OF TEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nobody reads terms. That is not cynicism, it is the measured behaviour
 * of every user of every product, and a screen designed as though people
 * do read them is a screen designed to produce a tap rather than an
 * understanding.
 *
 * So the rules that actually bite are stated as seven short cards a
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
 */
export const PARTNER_TERMS_VERSION = '2026-09-01.v1'

const FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100)

/** The seven that would otherwise be a surprise. */
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
]
