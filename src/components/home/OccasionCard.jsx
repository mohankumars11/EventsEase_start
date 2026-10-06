import { Link } from 'react-router-dom'
import RotatingPhoto from './RotatingPhoto'
import { Sparkles } from 'lucide-react'
import { BrandSeal } from '../ui/SambramoWordmark'
import { formatINR } from '../../utils/format'

/**
 * One occasion, as a square.
 *
 * ── Why square, and what it cost ──────────────────────────────────────────
 * This card used to be a 5:4 photograph with a white panel bolted under it
 * holding seven separate facts: a trust badge, a service count, a package
 * count, a "Starting at" label, the price, an arrow, and a coupon-code chip.
 * Fifteen of those in a two-column grid is a very tall page in which no single
 * card has a subject — the photograph, which is the only thing on the card that
 * makes somebody picture their own day, was getting a little over half the
 * height and the rest went to a spec sheet.
 *
 * A square is the right shape for a photo-led tile for the same reason every
 * photo grid ever built converges on it: at two-per-row on a 390px phone it
 * gives the image ~170×170 instead of ~170×136, the grid reads as an even field
 * rather than as a list of receipts, and nothing has to decide how tall a card
 * is — which is what made the old layout ragged whenever one tagline wrapped to
 * three lines and its neighbour's did not.
 *
 * It also puts this card in the same language as ServiceMosaic directly above
 * it on Home: photograph to the edges, copy on a tinted scrim, one arrow. Two
 * grids on one screen speaking two different card dialects was the strongest
 * argument for the change.
 *
 * ── The edit is the design ────────────────────────────────────────────────
 * A square holds a name and a number. It does not hold seven facts, so four of
 * them are gone rather than shrunk:
 *
 *   the tagline          "Another year. Another beautiful memory." is lovely and
 *                        it is the occasion PAGE's headline, one tap away. On a
 *                        170px tile it clamped to one line and read as a
 *                        fragment.
 *   the package count    the service count is the more concrete of the two and
 *                        both were competing for the same 9px row.
 *   "Starting at"        the label cost a whole line to say what "From ₹25,500"
 *                        says in one word.
 *   the coupon-code chip the ribbon already states the discount. The code
 *                        itself is not usable from this screen — you cannot
 *                        type it into anything here — so it belonged at
 *                        checkout, which is where it also still is.
 *
 * What survives is what a person actually chooses on: the photographs, the
 * name, the price, and who is answerable for it.
 *
 * ── What the card is allowed to claim ─────────────────────────────────────
 * `fromPrice` is the cheapest real package for this occasion, straight out of
 * eventServicesData — the same number the catalogue quotes. There is no
 * struck-through "was", because nothing has been marked up.
 *
 * The discount ribbon shows a live coupon from the database, chosen by
 * bestOfferFor against this occasion's entry price — the identical helper and
 * rule the shop's product cards use, so a coupon means the same thing on both
 * halves of the business. When no coupon applies, no ribbon.
 */
export default function OccasionCard({ occasion, offer, stagger = 0 }) {
  const o = occasion

  // What the ribbon says. Percent coupons are stated as the percentage
  // (which is what people remember); flat ones as the rupee amount.
  // A celebration offer carries its own headline ("10% off"), because it comes
  // off a quote a coordinator writes rather than a subtotal a checkout adds
  // up. This was handed a shop coupon row and derived the label from
  // discount_type/discount_value; there are no coupon rows any more.
  const offerLabel = offer?.headline?.toUpperCase() ?? null

  return (
    <Link
      /* The guided journey, not the catalogue.
         This used to open /services/:id, which leads with "24 services · from
         ₹26,750" — a five-figure number shown to somebody whose only input so
         far was tapping the word "Birthday". The catalogue is still there and
         still right for a customer who knows what they want; it is reached
         from inside the journey and from the plan hub. What a cold tap on an
         occasion gets now is the first question instead of the first price.
         See pages/plan/CelebrationJourney. */
      to={`/book/when?occasion=${o.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_14px_30px_-18px_rgba(42,30,20,0.35)] transition-transform active:scale-[0.98]"
    >
      {/* ── The photograph ────────────────────────────────────────
          Four real frames of this occasion, cross-fading, rather than one
          still. A single stock frame says we own a stock photo; four says we
          have done this, which is what makes somebody picture their own day.
          `stagger` keeps the fifteen cards from flipping in unison, which
          reads as the page glitching.

          The plum ground stays underneath as the finished surface for a
          failed URL — but nothing is lettered on top of it any more, so it
          no longer has to survive being a text background. */}
      <div className="relative h-32 bg-plum-900">
        <RotatingPhoto
          photos={o.photos}
          alt={`${o.name} arranged by Sambramo`}
          className="absolute inset-0 h-full w-full"
          stagger={stagger}
        />

        {/* An offer that applies to every occasion equally, printed on every
            occasion equally, is a watermark. The grid used to carry fifteen
            identical "10% OFF" ribbons, which devalues both the offer and the
            cards it is stamped on — and the same offer already has a slide in
            the deck above and a tile in the offers row below.

            The ribbon stays for the case it was built for: an offer that is
            true of THIS occasion and not the others. Callers that pass a
            blanket offer now pass nothing. */}
        {offerLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-chilli-600 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
            {offerLabel}
          </span>
        )}

        {/* ── The hallmark ──────────────────────────────────────
            A square seal, because that is what a hallmark is: an assay mark,
            a GI seal, the punch on the back of a piece of Bidriware. A pill
            would read as one more UI badge; a square carrying a mark reads
            as something stamped onto the object, which is exactly the claim
            this card is making.

            The seal was plum with a saffron hairline, which was right when
            the mark inside it was a plum-ground kolam. The mark is gold now,
            and gold on plum is two warm-adjacent colours fighting: the S went
            muddy at 20px, which is the only size this is ever drawn at.

            Navy is the mark's own ground — it is what the wordmark stands on
            for the splash, and gold on navy is the highest-contrast pairing
            the brand owns.

            SOLID navy, not 78% over a blur. Translucent, the seal took the
            colour of whatever photograph was behind it, so on a bright frame
            it went pale and the gold S inside it disappeared — which is the
            one thing a hallmark must never do. A seal is stamped ON the
            object; it does not let the object show through.

            Bigger too: 40px carrying a 26px glyph rather than 36 carrying 20.
            A Spencerian S is mostly hairline, and 20px of it over a busy
            photograph is not a mark, it is a smudge. */}
        <span className="absolute right-3 top-3 shadow-[0_4px_12px_-4px_rgba(12,53,67,0.85)]">
          <BrandSeal size={40} radius={12}>
            <Sparkles size={17} strokeWidth={2.4} />
          </BrandSeal>
        </span>
      </div>

      {/* ── The plate ─────────────────────────────────────────────
          Everything that used to be lettered over the photograph, now on
          white. The old card needed two stacked scrims to keep this copy
          legible over frames it could not art-direct, and the name still
          measured near the AA boundary on the brightest ones. On white it
          is full contrast for free, and the photograph is no longer half
          covered by the gradient that was protecting the text. */}
      <div className="flex flex-1 flex-col px-4 py-3.5">
        {/* There was an eyebrow here. First it said "Arranged by Sambramo"
            on all fifteen cards, which the eye stops reading by the third;
            then it carried the occasion's tagline, which is a sentence and
            clamped to one line arrived as "BIRTHDAYS DESERVE TO B…".

            A truncated sentence is worse than no line at all, and the card
            does not need one: a photograph, a name, a price and a count is
            the whole grammar of a catalogue card, and every extra row above
            the name pushes the price further from the thing it prices. */}
        {/* Two lines, then ellipsis — not `truncate`. Half these names are
            two words ("Naming Ceremony", "Housewarming (Griha Pravesh)") and
            a single-line clamp cut most of them mid-word, which is how a
            catalogue of fifteen occasions ends up looking like a list of
            database keys. */}
        <span className="line-clamp-2 text-[15px] font-extrabold leading-tight tracking-tight text-ink">
          {o.name}
        </span>

        {/* Stacked, not inline. The price and the service count were on one
            baseline with a gap, and at two-per-row on a phone that row is
            ~150px — so "From ₹27,000 · 22 services" wrapped the count onto
            its own line anyway, but ragged and mid-phrase. */}
        <span className="mt-1.5 block text-[13px] font-extrabold leading-none text-ink">
          {Number.isFinite(o.fromPrice) ? `From ${formatINR(o.fromPrice)}` : 'On request'}
        </span>
        <span className="mt-1 block text-[10px] font-medium text-ink-mute">
          {o.serviceCount} services
        </span>
      </div>
    </Link>
  )
}
