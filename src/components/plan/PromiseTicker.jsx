import { PartyPopper, LayoutGrid, IndianRupee, ShieldCheck, Users, BadgeCheck, CheckCircle2 } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { CATALOG_STATS } from '../../data/planCatalog'
import { formatINR } from '../../utils/format'

/**
 * The seven reasons to keep scrolling, in one strip that never stops moving.
 *
 * ── What this replaced ─────────────────────────────────────────────────
 * A four-line paragraph ("15 occasions, 39 services … you approve every
 * rupee") followed by three static chips (no advance / one coordinator /
 * vetted vendors). Together they ate roughly a fifth of a phone screen at the
 * exact point the page is asking "what are we celebrating?" — so on a 6"
 * device the occasion grid, the only thing on this page anybody can actually
 * buy from, started below the fold. The customer had to scroll past our
 * credentials to reach our products.
 *
 * The strip holds the same seven claims in ~64px of height, and being in
 * motion it earns more attention than the static chips did, not less. Nobody
 * reads a paragraph of reassurance; everybody watches a thing that moves.
 *
 * ── Why a marquee and not a fading rotator ─────────────────────────────
 * A rotator (see DetailRotator) shows one fact at a time, which is right
 * inside a product card where the facts are footnotes. Here the *volume* is
 * the pitch — the fact that there are seven of these is itself the argument —
 * so the customer needs to see two or three at once and sense more arriving.
 * Continuous translation does that; a crossfade cannot.
 *
 * ── The ordering is a sales argument, not a list ───────────────────────
 * Breadth first (occasions, services, entry price) because a visitor who has
 * just tapped "Plan" is still asking "do these people even do my thing?";
 * then the three risk-removers (free to ask, one human, vetted vendors) which
 * are what actually converts an enquiry; then the guarantee last, because it
 * is the sentence people repeat to the spouse they have to convince.
 *
 * ── Mechanics ──────────────────────────────────────────────────────────
 *   · The track is the list twice over — the standard seamless-loop trick the
 *     app already uses (.marquee-track translates -50%, landing exactly on
 *     the copy's start). The duplicate half is aria-hidden so a screen reader
 *     hears each claim once.
 *   · It pauses on hover and focus (CSS, .marquee-viewport) so a desktop
 *     visitor can read a card that caught their eye.
 *   · Nothing here is a link. A tap target that is sliding under the thumb is
 *     a target you miss, and every claim is already actioned by a real CTA
 *     further down the page.
 *   · Under prefers-reduced-motion the CSS freezes the track, which would
 *     strand four of the seven claims off-screen forever — so that case gets
 *     a static two-column grid of all of them instead.
 */
export default function PromiseTicker({ city = null, className = '' }) {
  const reduced = useReducedMotion()

  // Four accents on a repeating rhythm rather than seven different hues:
  // saffron for what we sell, teal for scope, emerald wherever the card is
  // about money (the page's other price surfaces read green), berry for the
  // promise. Seven unrelated colours sliding past each other looks like a
  // toolbar; a rhythm looks designed.
  const promises = [
    {
      key: 'occasions',
      icon: PartyPopper,
      tint: 'text-saffron-300 bg-saffron-400/15',
      head: `${CATALOG_STATS.occasions} occasions`,
      sub: 'Birthday to wedding, all priced',
    },
    {
      key: 'services',
      icon: LayoutGrid,
      tint: 'text-teal-700 bg-teal-400/15',
      head: `${CATALOG_STATS.services} services`,
      sub: 'The whole day, or just the cook',
    },
    {
      key: 'from',
      icon: IndianRupee,
      tint: 'text-emerald-300 bg-emerald-400/15',
      head: `From ${formatINR(CATALOG_STATS.fromPrice)}`,
      sub: 'A real price, not a teaser',
    },
    {
      key: 'no-advance',
      icon: ShieldCheck,
      tint: 'text-berry-700 bg-berry-400/15',
      head: 'No advance to enquire',
      sub: 'No card, no deposit, no catch',
    },
    {
      key: 'coordinator',
      icon: Users,
      tint: 'text-saffron-300 bg-saffron-400/15',
      head: 'One coordinator',
      sub: 'One number, start to last guest',
    },
    {
      key: 'vendors',
      icon: BadgeCheck,
      tint: 'text-teal-700 bg-teal-400/15',
      head: 'Vetted vendors',
      // Naming the city is the single most persuasive word in the strip for
      // somebody who has told us where they are — "local" is a claim,
      // "in Hyderabad" is a fact about their street.
      sub: city ? `Hand-picked in ${city}` : 'Hand-picked, and accountable',
    },
    {
      key: 'approve',
      icon: CheckCircle2,
      tint: 'text-emerald-300 bg-emerald-400/15',
      head: 'You approve every rupee',
      sub: 'Nothing books till you say yes',
    },
  ]

  if (reduced) {
    return (
      <ul className={`grid grid-cols-2 gap-2 px-4 ${className}`}>
        {promises.map(p => (
          <li key={p.key} className="flex">
            <PromiseCard promise={p} className="w-full" />
          </li>
        ))}
      </ul>
    )
  }

  // ~7s per card keeps a claim legible at a glance without the strip reading
  // as a screensaver; the whole loop turns over in under a minute, which is
  // longer than anyone spends deciding on this screen — hence the ordering
  // above, since the first two cards are the only ones guaranteed to be seen.
  const duration = promises.length * 7

  return (
    <div
      className={`marquee-viewport promise-ticker overflow-hidden ${className}`}
      aria-label="Why book with us"
    >
      {/* The spacing lives on the cards, not as a flex `gap` on the track.
          A gap is only drawn *between* items, so the last card of the first
          half sits flush against the first card of the second — one gap short
          — and the -50% loop point lands half a gap out, which shows up as a
          visible twitch once every pass. A trailing margin on every card makes
          the two halves exactly equal. */}
      <div
        className="marquee-track"
        style={{ '--marquee-duration': `${duration}s` }}
      >
        {[...promises, ...promises].map((p, i) => (
          <PromiseCard
            key={`${p.key}-${i}`}
            promise={p}
            className="mr-2.5 w-[244px]"
            aria-hidden={i >= promises.length || undefined}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One claim. The caller sets the width: the ticker pins every card to 244px —
 * wide enough that no sub-line ellipses (they are the persuasive half, and
 * "or just the coo…" is worse than no line at all), narrow enough that a
 * second card is always part-visible at 360px, which is what makes the strip
 * read as "there is more of this" rather than as a banner. The reduced-motion
 * grid lets its column decide instead.
 */
function PromiseCard({ promise, className = '', ...rest }) {
  const Icon = promise.icon
  return (
    <div
      {...rest}
      className={`flex shrink-0 items-center gap-2.5 rounded-2xl bg-surface-sunk/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/[0.12] ${className}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${promise.tint}`}>
        <Icon size={15} strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-extrabold leading-tight text-ink">
          {promise.head}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-ink-mute">
          {promise.sub}
        </span>
      </span>
    </div>
  )
}
