import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { formatINR } from '../../utils/format'
import OfferCard from './OfferCard'

/**
 * The moment an offer becomes real.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A MOMENT AND NOT A TOAST
 * ══════════════════════════════════════════════════════════════════════
 *
 * A discount that appears silently in a total is arithmetic. The same
 * discount announced — held on screen, with the number large — is a
 * thing that happened to somebody, and it is what they tell a friend
 * about. That is the difference the reference apps understand and it
 * costs one sheet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT ONLY FIRES ON SOMETHING REAL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Shown when a basket CROSSES a threshold it did not previously meet —
 * a fourth service added, a spend passed. Never on load, never on a
 * timer, never for an offer that was already applying.
 *
 * That distinction is the whole of the honesty here. A celebration
 * fired on arrival is `false_urgency` wearing a party hat: it teaches
 * somebody that the excitement is decoration, and then the one that
 * matters is ignored too.
 *
 * ── And it never blocks the way out ─────────────────────────────────
 * Dismissable by tap, by escape, and by the backdrop. A modal somebody
 * has to hunt to close is the `nagging` pattern from config/legal.js,
 * and a celebration that traps you is not a celebration.
 */
export default function OfferUnlocked({ offer, onClose, onUse }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20)
    const esc = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', esc)
    return () => { clearTimeout(t); document.removeEventListener('keydown', esc) }
  }, [onClose])

  if (!offer) return null

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm overflow-hidden rounded-[26px] bg-white transition-all duration-300 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {/* The band. The one place colour is allowed to be loud, because
            it is bounded and the page under it stays white. */}
        <div className="relative bg-saffron-400 px-5 pb-7 pt-6 text-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1.5 text-plum-950/50 hover:bg-plum-950/10"
          >
            <X size={17} />
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-plum-950/70">
            <Sparkles size={13} /> Unlocked
          </p>

          <p className="mt-2 font-serif text-[30px] font-extrabold leading-none text-plum-950">
            {offer.headline}
          </p>

          <p className="mt-2 text-[12.5px] font-semibold leading-snug text-plum-950/75">
            {offer.scan}
          </p>
        </div>

        <div className="px-5 pb-5 pt-5">
          <p className="text-center text-[14px] font-extrabold text-ink">
            You save {formatINR(Math.round(offer.discountPaise / 100))} on this booking
          </p>

          {/* Where the money comes from, said out loud.
              Not a legal footnote: a customer who understands the master
              is paid in full is a customer who does not suspect the
              discount came out of the decorator's pocket. It is also
              true, and enforced by applyOffer(). */}
          <p className="mt-1.5 text-center text-[11.5px] leading-relaxed text-ink-mute">
            Sambramo funds this. Your masters are paid their full rate.
          </p>

          <div className="mt-4">
            <OfferCard offer={offer} applied compact />
          </div>

          <button
            onClick={() => { onUse?.(offer.id); onClose?.() }}
            className="mt-4 w-full rounded-2xl bg-plum-950 py-3.5 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
          >
            Use it on this booking
          </button>

          <button
            onClick={onClose}
            className="mt-1.5 w-full py-2 text-[12.5px] font-bold text-ink-mute"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
