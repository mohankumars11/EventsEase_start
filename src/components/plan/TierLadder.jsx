import { Check, Users, Sparkles } from 'lucide-react'
import { CELEBRATION_TIERS, BESPOKE_TIER } from '../../data/celebrationTiers'

/**
 * The scale picker.
 *
 * Ordered smallest first, and the smallest one is a full card with the same
 * treatment as the largest. That is not a layout accident — putting Close
 * Circle in a thin row at the bottom under six big cards tells a customer
 * exactly where they rank, which is the one thing the naming strategy in
 * celebrationTiers.js exists to avoid.
 *
 * Guest count drives the highlight rather than the other way round: type 220
 * and Special Day lights up. People know their guest list before they know
 * what to call the event, so the number is the way in.
 *
 * ── Discrete taps say so ────────────────────────────────────────────────
 * The quick-count chips pass a second argument, and the builder uses it to
 * open the confirmation dialog (see TierMatchDialog). Typing into the field
 * does not — a dialog between "2" and "220" would fire three times on the
 * way to one number. The distinction is "the user completed an act" versus
 * "the user is mid-keystroke", and only the first deserves an interruption.
 */
export default function TierLadder({ guestCount, onGuestCount, selectedId, onSelect, suggestedId }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <label className="block text-sm font-bold text-gray-800 mb-1.5">
          <Users size={15} className="inline mr-1.5 -mt-0.5 text-plum-600" />
          How many guests are you expecting?
        </label>
        <p className="text-xs text-gray-500 mb-3">
          A rough number is fine — it is the single thing that moves the price most, and you can change it later.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={guestCount || ''}
            onChange={e => onGuestCount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="e.g. 150"
            className="w-36 px-4 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-lg text-gray-900 focus:border-saffron-400 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {[25, 60, 120, 220, 450, 800].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onGuestCount(n, true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  guestCount === n
                    ? 'bg-plum-700 text-white border-plum-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-plum-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {CELEBRATION_TIERS.map(tier => {
          const selected = selectedId === tier.id
          const suggested = suggestedId === tier.id && !selected
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(tier.id)}
              aria-pressed={selected}
              className={`w-full text-left card overflow-hidden transition-all ${tier.accent} ${
                selected ? 'ring-2 ring-plum-600 ring-offset-2 shadow-md' : 'hover:shadow-md'
              }`}
            >
              {/* The chosen scale gets a banner, not a badge in a corner.
                  A moved highlight among six near-identical cards is what
                  made this screen read as "it picked its own option" — the
                  selection has to announce itself in words, at the top of
                  the card, where the eye lands first. */}
              {selected && (
                <span className="block bg-plum-700 px-5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                  <Check size={12} className="inline -mt-0.5 mr-1" />
                  Your scale
                </span>
              )}

              <div className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-2xl">{tier.emoji}</span>
                    <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                    <span className="text-xs text-gray-400 font-medium italic">{tier.localName}</span>
                    {tier.popular && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tier.badge}`}>★ Most booked</span>
                    )}
                    {suggested && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-plum-100 text-plum-700">
                        Fits your {guestCount} guests
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{tier.tagline}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tier.description}</p>

                  <ul className="mt-3 space-y-1">
                    {tier.highlights.map(h => (
                      <li key={h} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <Check size={12} className="mt-0.5 shrink-0 text-green-600" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 text-right">
                  <div className="px-3 py-1.5 rounded-lg bg-white/80 border border-white">
                    <p className="text-[10px] text-gray-400 leading-tight">Guests</p>
                    <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
                      {tier.guests.min}–{tier.guests.max}
                    </p>
                  </div>
                  {!selected && (
                    <span className="mt-2 inline-block text-[11px] font-bold text-plum-700">
                      Choose →
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {/* The honest exit. No price, on purpose — see BESPOKE_TIER. */}
        <div className={`card p-5 ${BESPOKE_TIER.accent}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{BESPOKE_TIER.emoji}</span>
            <h3 className="text-lg font-bold text-gray-900">{BESPOKE_TIER.name}</h3>
            <span className="text-xs text-gray-400 font-medium italic">{BESPOKE_TIER.localName}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">{BESPOKE_TIER.tagline}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{BESPOKE_TIER.description}</p>
          <a
            href="/plan/custom"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-plum-700 hover:text-plum-800"
          >
            <Sparkles size={14} /> Tell us about it instead →
          </a>
        </div>
      </div>
    </div>
  )
}
