import { Users, Minus, Plus } from 'lucide-react'
import { DECOR_SCALES } from '../../data/decorThemes'

/**
 * "How big is this?" — asked once, at the top, before anything is priced.
 *
 * ── Why it is above the grid and not below it ───────────────────────────
 * Every price on the page is a function of these two answers. Ask them at the
 * bottom and the entire grid shows numbers computed for somebody else's event
 * until the customer scrolls past all of it; ask them in a modal and you have
 * put a form in front of the goods, which is precisely what the old
 * "get a quote" flow did and precisely what this page exists to stop.
 *
 * Both have honest defaults — 100 guests, a hall — so the page is usable
 * without touching either. Nothing is blocked on answering.
 *
 * ── Presets, then an exact number ───────────────────────────────────────
 * Guest count is the field people fudge: "about a hundred" is the real answer
 * and typing 100 into an empty number input feels like a commitment. Presets
 * make the common answers one tap and the stepper handles the rest, with the
 * text input still there for anyone who knows their number exactly.
 */
const GUEST_PRESETS = [30, 75, 150, 300, 500]

export default function EventScaleBar({
  guestCount, onGuests, scaleId, onScale, showScale = true, perGuestMatters = true,
}) {
  return (
    <div className="home-glass mx-4 space-y-3 p-3.5">
      {/* ── How many people ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/60">
            <Users size={12} /> How many guests
          </p>
          <div className="flex items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <button
              type="button"
              onClick={() => onGuests(Math.max(10, guestCount - 10))}
              aria-label="Ten fewer guests"
              className="p-1.5 text-white/70"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={e => onGuests(Math.max(1, Number(e.target.value) || 0))}
              aria-label="Number of guests"
              className="w-14 bg-transparent text-center text-[14px] font-extrabold text-white outline-none"
            />
            <button
              type="button"
              onClick={() => onGuests(guestCount + 10)}
              aria-label="Ten more guests"
              className="p-1.5 text-white/70"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {GUEST_PRESETS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onGuests(n)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                guestCount === n
                  ? 'bg-saffron-400 text-plum-950'
                  : 'bg-white/10 text-white/70 ring-1 ring-white/15'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {!perGuestMatters && (
          <p className="mt-1.5 text-[10.5px] leading-snug text-white/45">
            This service is priced for the job rather than per head — the count still
            tells us what to send.
          </p>
        )}
      </div>

      {/* ── How big the room is ─────────────────────────────────────
          Separate from the guest count on purpose: forty people in a
          400-seat hall still needs a stage that fills it, and one number
          cannot express both. */}
      {showScale && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/60">
            Where is it happening
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DECOR_SCALES.map(s => {
              const active = s.id === scaleId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onScale(s.id)}
                  aria-pressed={active}
                  className={`rounded-2xl p-2.5 text-left transition-all ${
                    active
                      ? 'bg-saffron-400 text-plum-950'
                      : 'bg-white/[0.07] text-white/75 ring-1 ring-white/12'
                  }`}
                >
                  <span className="block text-[15px] leading-none" aria-hidden="true">{s.emoji}</span>
                  <span className="mt-1 block text-[12px] font-extrabold leading-tight">{s.name}</span>
                  <span className={`mt-0.5 block text-[9.5px] leading-snug ${active ? 'text-plum-900/70' : 'text-white/45'}`}>
                    {s.note}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
