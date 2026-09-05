// Why a partner should take the next tap.
//
// ── The problem this solves ─────────────────────────────────────────────
// Listing a catering business runs to a dozen screens. Every one of them is
// a place somebody can put the phone down, and the ones in the middle are
// the worst: far enough in to feel like work, far enough from the end that
// finishing is not yet in sight.
//
// On those screens a hook is not decoration. It is the answer to "why am I
// still doing this", and it has to be answered in the language of the
// person's own trade, on the screen where the doubt appears.
//
// ── Every number here is one this repo can produce ──────────────────────
// 6,587 is the median partner earning across the rate card, and 1,000 to
// 50,000 its real range -- the same figures PartnerLanding.jsx shows, from
// the same source. The commission is the 8% in the partner terms. Zero to
// join is zero to join.
//
// There are deliberately NO countdowns, no "3 caterers joined this hour",
// no scarcity and no figure that cannot be traced to something committed.
// A partner who catches one invented number stops believing 6,587 too --
// and 6,587 is real and is the strongest thing we have to say.
//
// ── Shape ───────────────────────────────────────────────────────────────
// Keyed by the screen it belongs on. `line` is the claim, `detail` is the
// sentence under it, `tone` picks the card's colour. HookCard renders them;
// nothing here imports a component, so this file stays testable in node.

/** The three objections a caterer actually raises, answered once. */
export const PROMISES = [
  {
    id: 'free',
    icon: 'wallet',
    line: '₹0 to join, ₹0 a month',
    detail: 'Free while we build the network. Sambramo takes 8% of a job it brings you, and nothing otherwise.',
  },
  {
    id: 'choice',
    icon: 'hand',
    line: 'You choose every job',
    detail: 'Decline anything, for any reason. No penalty, and it does not push you down the list.',
  },
  {
    id: 'money',
    icon: 'shield',
    line: 'The money exists before you set out',
    detail: 'The customer pays up front and Sambramo holds it. You are never chasing a payment after the event.',
  },
]

/**
 * One hook per screen.
 *
 * `tone`:
 *   'plum'   the strong one — used where somebody is deciding whether to start
 *   'quiet'  a light card, for the middle of the form
 *   'green'  reassurance, for the screens people are wary of
 */
export const HOOKS = {
  /* Before anything is listed at all. The hardest screen in the app: the
     partner has nothing invested and no reason yet. */
  empty: {
    tone: 'plum',
    line: 'Nobody can book what they cannot see',
    detail: 'A typical job pays ₹6,587. Every one of them goes to a partner whose listing says they can do it — and right now yours says nothing at all.',
  },

  kitchen: {
    tone: 'quiet',
    line: 'One tap and we stop showing you food you do not cook',
    detail: 'This single answer decides every screen after it.',
  },

  cuisines: {
    tone: 'quiet',
    line: 'Say it precisely and the jobs fit',
    detail: 'A family wanting a Kerala sadya should reach the kitchen that makes sadya — not the nearest caterer who will try.',
  },

  dishes: {
    tone: 'quiet',
    line: 'This is how somebody looking for Majjige Huli finds you',
    detail: 'Nobody searches for "catering". They search for the dish their mother made.',
  },

  ops: {
    tone: 'quiet',
    line: 'Answer these once and never be sent the wrong job again',
    detail: 'No outdoor kitchen, nothing past midnight, no jobs over 500 — say it here and it is honoured every time.',
  },

  /* The screen where somebody worries that saying no counts against them.
     It does not, and the card exists to say so before they soften an
     answer they should be giving straight. */
  limits: {
    tone: 'green',
    line: 'Nothing here counts against you',
    detail: 'A caterer who says they will not cook pork gets fewer offers and better ones. Every no makes the yeses fit.',
  },

  price: {
    tone: 'green',
    line: 'Your rate is your floor, not your ceiling',
    detail: 'Sambramo prices the customer from your rate and the market, and the difference is what protects your margin on the jobs where it is tight.',
  },

  upload: {
    tone: 'quiet',
    line: 'You already have this printed',
    detail: 'Photograph your menu card and we will do the typing. You see what we read before any of it goes live.',
  },

  submitted: {
    tone: 'plum',
    line: 'We read every one by hand, usually within 24 hours',
    detail: 'Meanwhile, block the days you are already busy — dispatch only offers work on days nobody has closed.',
  },

  live: {
    tone: 'green',
    line: 'You are visible across Bengaluru from now',
    detail: 'Jobs arrive with the price already on them. You tap yes or no.',
  },
}

/** Never throws on a screen id nobody wrote a hook for. */
export function hookFor(id) {
  return HOOKS[id] ?? null
}
