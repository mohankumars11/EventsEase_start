import { Check, Lock, Tag } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * A voucher that looks like a voucher.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE IS THE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A discount rendered as a row of text is a line item. The same discount
 * with a notch bitten out of each side and a dashed tear line is a
 * ticket, and people treat a ticket as something they HAVE. That is the
 * entire difference between "8% is applied" and "I got 8% off", and it
 * costs two pseudo-elements.
 *
 * ── On white, against the reference ─────────────────────────────────
 * The apps this borrows from do it on near-black with neon. Sambramo is
 * white grounds and always has been, so the ticket carries its colour in
 * a tinted panel and a coloured value, and the page around it stays
 * white. Copying the palette would have made one screen look like a
 * different product.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A LOCKED OFFER SAYS WHAT UNLOCKS IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Add ₹300 more" is worth more to a customer than hiding the card, and
 * hiding it until it applies is the sneaking pattern in reverse — they
 * find out afterwards that they nearly had something.
 *
 * The one thing it must not do is invent the condition. Every line here
 * comes from `offersFor()`, which computes it from the basket.
 */

const TONES = {
  saffron: {
    panel: 'bg-saffron-400/12',
    edge:  'ring-saffron-300/60',
    value: 'text-saffron-800',
    chip:  'bg-saffron-400 text-plum-950',
  },
  forest: {
    panel: 'bg-forest-50',
    edge:  'ring-forest-200/70',
    value: 'text-forest-800',
    chip:  'bg-forest-600 text-white',
  },
  plum: {
    panel: 'bg-plum-50',
    edge:  'ring-plum-200/70',
    value: 'text-plum-800',
    chip:  'bg-plum-700 text-white',
  },
}

export default function OfferCard({ offer, applied, onApply, compact = false }) {
  const t = TONES[offer.tone] ?? TONES.saffron
  const locked = !offer.eligible

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => !locked && onApply?.(applied ? null : offer.id)}
      className={`sb-ticket relative flex w-full items-stretch overflow-hidden rounded-[20px] text-left ring-1 transition ${
        locked ? 'bg-white ring-ink/[0.07] opacity-70' : `${t.panel} ${t.edge} active:scale-[0.995]`
      } ${applied ? 'ring-2' : ''}`}
    >
      {/* The stub. A dashed rule and two notches are what make the eye
          read "ticket" rather than "box". */}
      <span
        className={`sb-ticket-stub flex w-[74px] shrink-0 flex-col items-center justify-center px-2 py-3.5 ${
          locked ? 'text-ink-mute' : t.value
        }`}
      >
        <Tag size={15} className="mb-1 opacity-70" />
        <span className="text-center text-[10.5px] font-extrabold uppercase leading-tight tracking-wide">
          {offer.kind === 'flat' ? 'Flat off' : 'Percent off'}
        </span>
      </span>

      <span className="min-w-0 flex-1 py-3.5 pl-3.5 pr-3">
        <span className={`block text-[18px] font-extrabold leading-none ${locked ? 'text-ink-soft' : t.value}`}>
          {offer.headline}
        </span>

        <span className="mt-1 block text-[12px] leading-snug text-ink-soft">
          {offer.scan}
        </span>

        {/* What it is worth on THIS basket, or what would unlock it.
            Never both, never neither. */}
        {locked ? (
          <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold text-ink-mute">
            <Lock size={11} />{offer.blockedBy}
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold">
            {applied
              ? <><Check size={12} className="text-forest-700" /><span className="text-forest-800">Applied — you save {formatINR(Math.round(offer.discountPaise / 100))}</span></>
              : <span className={t.value}>Saves {formatINR(Math.round(offer.discountPaise / 100))} — tap to use</span>}
          </span>
        )}
      </span>

      {!compact && !locked && (
        <span className="flex items-center pr-3.5">
          <span className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ${applied ? 'bg-forest-600 text-white' : t.chip}`}>
            {applied ? 'Using' : 'Use'}
          </span>
        </span>
      )}
    </button>
  )
}
