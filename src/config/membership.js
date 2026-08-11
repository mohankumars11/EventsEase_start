/**
 * Sambramo Bandhu — the membership.
 *
 * ── The name ───────────────────────────────────────────────────────────
 * "Prime" was the brief and is the one thing this could not be called. It is
 * Amazon's word; borrowing it makes a young brand read as a copy of a bigger
 * one at the exact moment it is trying to establish that it is not.
 *
 * *Bandhu* is kin — the relative who turns up the day before the wedding and
 * stays until the hall is cleared. It is the right word for this business
 * because it is what the product actually claims to be: not a discount club,
 * but the family member who handles it. It also matches how the app already
 * names things — the celebration tiers carry Kannada localNames (Aptaru,
 * Manetumba) — so it sounds like Sambramo rather than like a feature.
 *
 * ── Why it takes no money ──────────────────────────────────────────────
 * Sambramo is pre-launch and sources per order. There is no billing, no
 * renewal, and no code that could enforce a member's entitlement at checkout.
 * A paid tier whose perks silently fail to apply is worse than no paid tier,
 * so this is founding-member enrolment through a conversation, and every
 * benefit below is one a coordinator can honour by hand today.
 *
 * When billing exists, this file is where the price goes, and the card in
 * PerksDeck is the only thing that has to change.
 */
export const MEMBERSHIP = {
  name: 'Sambramo Bandhu',
  /** Literal meaning, for the one place it is worth explaining. */
  meaning: 'bandhu — kin, the one who handles it for you',
  status: 'Founding members',
  pitch:
    'We are opening a small first circle of families. No fee while we are in pilot — we would rather earn the renewal than charge for the promise.',
  benefits: [
    'A named coordinator who already knows your family, your venue and last year’s menu',
    'First call on dates during festival season, before they open publicly',
    'Member pricing held on your quote for 30 days instead of 7',
    'Your celebration reviewed by a senior planner before anything is booked',
    'Priority on the shop — festival stock reserved before it sells out',
  ],
  cta: 'Ask about Bandhu on WhatsApp',
  disclaimer: 'No payment, no card, no auto-renewal. We will talk first.',
}
