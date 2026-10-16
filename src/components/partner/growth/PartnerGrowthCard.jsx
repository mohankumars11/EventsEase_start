import { ArrowRight } from 'lucide-react'
import { rewardLabel } from '../../../lib/promotions'

/**
 * One card in the growth rail.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PALETTE IS PER TYPE, AND EVERY PAIR IS MEASURED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A campaign row carries copy and a route; it does NOT carry colours.
 * Letting an operator pick a background is how a card ends up with white
 * text on yellow at 1.45:1 — legible in the admin preview on a desktop,
 * unreadable on a phone in sunlight.
 *
 * So the ground is chosen here, keyed to `type`, from measured pairs:
 *
 *   profile / education   saffron-400 + plum-950   9.13:1
 *   referral              chilli-600  + white      5.62:1
 *   announcement/seasonal plum-700    + white      7.10:1
 *   calendar              plum-950    + white     15.24:1
 *
 * All four clear WCAG AA at the 4.5:1 this type scale requires — there
 * is no large-text relief below 18.66px and nothing here is that big.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO AMOUNT IS DECIDED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `reward_paise` comes from the row, in paise, and `rewardLabel` is the
 * only thing allowed to turn it into rupees. It returns null when no
 * amount is configured, so a campaign with no reward simply has a
 * shorter sentence rather than one with a hole in it — and no card ever
 * promises money nobody has set.
 */

const TONE = {
  profile: {
    ground: 'bg-saffron-400',
    ink: 'text-plum-950',
    dim: 'text-plum-950/75',
    chip: 'bg-plum-950/10 text-plum-950',
    cta: 'bg-plum-950 text-white',
  },
  education: {
    ground: 'bg-saffron-400',
    ink: 'text-plum-950',
    dim: 'text-plum-950/75',
    chip: 'bg-plum-950/10 text-plum-950',
    cta: 'bg-plum-950 text-white',
  },
  referral: {
    ground: 'bg-chilli-600',
    ink: 'text-white',
    /* Solid, not /85. chilli-600 is the darkest-but-one ground here and
       white at 85% on it is 4.42:1 -- under the floor for 12px. */
    dim: 'text-white',
    /* A LIGHT chip on chilli-600 lifts its own ground to L=0.204, where
       even solid white is 4.13:1. Tinting DOWN instead keeps the chip
       distinct from the card and puts the label at 7.56:1. */
    chip: 'bg-plum-950/25 text-white',
    cta: 'bg-saffron-400 text-plum-950',
  },
  announcement: {
    ground: 'bg-plum-700',
    ink: 'text-white',
    dim: 'text-white/85',
    chip: 'bg-white/20 text-white',
    cta: 'bg-saffron-400 text-plum-950',
  },
  seasonal: {
    ground: 'bg-plum-700',
    ink: 'text-white',
    dim: 'text-white/85',
    chip: 'bg-white/20 text-white',
    cta: 'bg-saffron-400 text-plum-950',
  },
  calendar: {
    ground: 'bg-plum-950',
    ink: 'text-white',
    dim: 'text-white/85',
    chip: 'bg-white/15 text-white',
    cta: 'bg-saffron-400 text-plum-950',
  },
}

export default function PartnerGrowthCard({ promotion, onAct }) {
  const t = TONE[promotion.type] ?? TONE.announcement
  const reward = rewardLabel(promotion.reward_paise)

  return (
    <article
      data-growth-card={promotion.type}
      className={`flex w-[86%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] p-4 xs:w-[82%] sm:w-[320px] ${t.ground}`}
    >
      <div className="min-w-0">
        {promotion.subtitle && (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] ${t.chip}`}>
            {promotion.subtitle}
          </span>
        )}

        <h3 className={`mt-2.5 font-serif text-[21px] font-extrabold uppercase leading-[1.05] tracking-tight ${t.ink}`}>
          {promotion.title}
        </h3>

        {promotion.body && (
          <p className={`mt-1.5 text-[12px] font-semibold leading-snug ${t.dim}`}>
            {promotion.body}
            {reward ? ` Unlock ${reward}.` : ''}
          </p>
        )}
      </div>

      <div className="mt-3.5">
        <button
          type="button"
          onClick={() => onAct?.(promotion)}
          className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-full px-4 text-[12.5px] font-extrabold transition active:scale-[0.97] ${t.cta}`}
        >
          {promotion.cta_label ?? 'Open'}
          <ArrowRight size={13} strokeWidth={3} />
        </button>

        {/* Only when a campaign actually has terms. "Terms apply" under a
            card with no terms is a disclaimer for nothing. */}
        {promotion.terms_url && (
          <a
            href={promotion.terms_url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className={`mt-2 block text-[10.5px] font-bold underline ${t.dim}`}
          >
            Terms apply
          </a>
        )}
      </div>
    </article>
  )
}
