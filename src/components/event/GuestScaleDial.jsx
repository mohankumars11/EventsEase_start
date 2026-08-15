import { useCallback } from 'react'
import { Users, Minus, Plus } from 'lucide-react'

/**
 * The headcount, and the ladder it puts you on — as one control.
 *
 * ── What this replaces ──────────────────────────────────────────────────
 * A number field and six preset chips (25 / 60 / 120 / 220 / 450 / 800),
 * under a sentence that said "120 guests puts you in The Full Celebration".
 *
 * That sentence was doing the most important work on the page and doing it in
 * grey 11px type below the fold of the control. The customer's actual question
 * at this moment is "which of these am I?", and the answer was a line of prose
 * they had to read, referring to one of eight cards further down that they had
 * not seen yet. Meanwhile the six chips were arbitrary — 220 and 450 are the
 * typical counts of two rungs and 25 is the typical of another, but nothing
 * said so, so they read as six random numbers.
 *
 * So the ladder is drawn instead of described. Eight segments, one per scale,
 * the customer's own lit as they move — and every segment is tappable, which
 * makes the chips redundant and takes a row back rather than adding one. The
 * scale you are in stops being a fact you are told and becomes a position you
 * can see yourself occupying, which is the difference between a form and a
 * configurator.
 *
 * ── Why the slider is logarithmic ───────────────────────────────────────
 * The ladder spans 10 to 3,500 guests. On a linear slider the first five rungs
 * — which is where nearly every real booking sits — are crushed into the first
 * sixth of the track, and a single pixel of thumb movement at the left-hand end
 * is worth about twenty guests. Log spacing gives each rung roughly comparable
 * travel, so picking 45 is as easy as picking 900.
 *
 * ── Quiet changes versus committed ones ─────────────────────────────────
 * `onQuietChange` fires on every keystroke and every frame of a drag;
 * `onCommit` fires only when the customer finishes a deliberate act — releasing
 * the slider, tapping a rung, using the stepper, leaving the field. Only the
 * second opens the scale dialog. This is the same rule TierMatchDialog already
 * documents for the builder: a modal between "2" and "220" would make the field
 * unusable, and a modal on every frame of a drag would be worse.
 */

/** The ends of the ladder, as guest counts. */
const G_MIN = 10
const G_MAX = 3500

const LOG_MIN = Math.log(G_MIN)
const LOG_MAX = Math.log(G_MAX)

/** Slider position (0–1000) for a headcount, and back again. */
function toSlider(guests) {
  const g = Math.min(G_MAX, Math.max(G_MIN, guests || G_MIN))
  return Math.round(((Math.log(g) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000)
}

function fromSlider(pos) {
  const raw = Math.exp(LOG_MIN + (pos / 1000) * (LOG_MAX - LOG_MIN))
  // Snapped to a number a person would actually say. Dragging to "1,247
  // guests" is precision the estimate does not have and nobody asked for.
  if (raw < 50)   return Math.round(raw)
  if (raw < 200)  return Math.round(raw / 5) * 5
  if (raw < 600)  return Math.round(raw / 10) * 10
  if (raw < 1500) return Math.round(raw / 25) * 25
  return Math.round(raw / 50) * 50
}

/** One step of the +/− buttons, sized to where you are on the ladder. */
function stepFor(guests) {
  if (guests < 50)   return 5
  if (guests < 200)  return 10
  if (guests < 600)  return 25
  if (guests < 1500) return 50
  return 100
}

export default function GuestScaleDial({
  guestCount,
  tiers,
  matchedTierId,
  selectedTierId,
  bespoke = false,
  onQuietChange,
  onCommit,
  verdict = null,
}) {
  const step = stepFor(guestCount)

  const bump = useCallback(delta => {
    onCommit(Math.max(1, (guestCount || 0) + delta))
  }, [guestCount, onCommit])

  return (
    <section className="event-glass rise-in p-4" style={{ '--rise-delay': '260ms' }}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <Users size={15} style={{ color: 'var(--event-glow-ink)' }} />
          <p className="text-[13px] font-extrabold text-ink">How many people are coming?</p>
        </div>

        {/* ── The number, as a control rather than a field ───────
            The stepper is here because on a phone a numeric input means
            summoning a keyboard that then covers the ladder the customer is
            trying to watch. Nudging by a sensible increment keeps the whole
            control visible while the number moves. */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => bump(-step)}
            disabled={(guestCount || 0) <= 1}
            aria-label={`Fewer guests, in steps of ${step}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-90 disabled:opacity-30"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={guestCount || ''}
            onChange={e => onQuietChange(Math.max(0, Number(e.target.value) || 0))}
            onBlur={e => {
              const n = Math.max(0, Number(e.target.value) || 0)
              if (n > 0) onCommit(n)
            }}
            aria-label="Expected guest count"
            className="w-[74px] rounded-xl bg-surface-sunk/[0.07] px-2 py-1.5 text-center text-[16px] font-extrabold text-ink ring-1 ring-hairline/10 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--event-glow-line)' }}
          />
          <button
            type="button"
            onClick={() => bump(step)}
            aria-label={`More guests, in steps of ${step}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-90"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ── The track ─────────────────────────────────────────
          `onChange` is the drag itself and stays quiet; the commit handlers
          fire once, when the thumb is let go or the keyboard interaction
          ends. */}
      <input
        type="range"
        min="0"
        max="1000"
        value={toSlider(guestCount)}
        onChange={e => onQuietChange(fromSlider(Number(e.target.value)))}
        onPointerUp={e => onCommit(fromSlider(Number(e.currentTarget.value)))}
        onKeyUp={e => onCommit(fromSlider(Number(e.currentTarget.value)))}
        aria-label="Guest count"
        aria-valuetext={`${guestCount} guests`}
        className="scale-slider mt-3.5 w-full"
        style={{ '--fill': `${toSlider(guestCount) / 10}%` }}
      />

      {/* ── The ladder, drawn ─────────────────────────────────
          Eight rungs plus the honest exit past the top. Each one is a button,
          so this is the guest-count preset row as well as the readout — the
          preset it sets is that rung's typical headcount, which is a number
          that means something, unlike the six round figures it replaces. */}
      <div className="mt-3 flex items-end gap-[3px]" role="group" aria-label="Scales of celebration">
        {tiers.map(t => {
          const isMatch = !bespoke && t.id === matchedTierId
          const isChosen = t.id === selectedTierId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onCommit(t.typicalGuests, t.id)}
              title={`${t.name} — ${t.guests.min}–${t.guests.max} guests`}
              aria-label={`${t.name}, ${t.guests.min} to ${t.guests.max} guests`}
              aria-pressed={isChosen}
              className={`tap-tall group relative flex-1 rounded-lg pb-1 pt-1.5 text-center transition-all duration-300 ${
                isMatch ? 'ring-1' : 'hover:bg-surface-sunk/[0.07]'
              }`}
              style={{
                background: isMatch
                  ? 'color-mix(in srgb, var(--event-glow) 20%, transparent)'
                  : isChosen ? 'rgba(255,255,255,0.10)' : 'rgb(var(--hairline) / 0.06)',
                ...(isMatch ? { '--tw-ring-color': 'var(--event-glow-line)' } : null),
              }}
            >
              <span
                className={`block text-[13px] leading-none transition-transform duration-300 ${
                  isMatch ? 'scale-110' : 'opacity-45 group-hover:opacity-90'
                }`}
                aria-hidden="true"
              >
                {t.emoji}
              </span>
              {/* The height of the bar carries the ordering, so the row still
                  reads as a ladder to anyone who cannot tell the emoji apart
                  at 13px. */}
              <span
                aria-hidden="true"
                className="mx-auto mt-1 block rounded-full transition-all duration-300"
                style={{
                  height: '3px',
                  width: isMatch ? '80%' : '46%',
                  background: isMatch ? 'var(--event-glow)' : 'rgba(255,255,255,0.22)',
                }}
              />
            </button>
          )
        })}

        {/* Past the top rung. Not tappable to a price, because it has none —
            it lights up to say the ladder has ended rather than to sell a
            ninth scale. */}
        <span
          aria-hidden="true"
          className="flex-1 rounded-lg pb-1 pt-1.5 text-center transition-all duration-300"
          style={{ background: bespoke ? 'color-mix(in srgb, var(--event-glow) 20%, transparent)' : 'rgb(var(--hairline) / 0.06)' }}
        >
          <span className={`block text-[13px] leading-none ${bespoke ? 'scale-110' : 'opacity-45'}`}>✨</span>
          <span
            className="mx-auto mt-1 block rounded-full transition-all duration-300"
            style={{
              height: '3px',
              width: bespoke ? '80%' : '46%',
              background: bespoke ? 'var(--event-glow)' : 'rgba(255,255,255,0.22)',
            }}
          />
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-mute">
        A rough number is enough — tap a rung to jump to it. Everything on this page reprices as
        you move.
      </p>

      {/* ── The verdict ────────────────────────────────────────
          Rendered inside this control rather than beside it, because the
          complaint it answers is precisely that the answer was somewhere
          else. Nine 40px segments with no room for a word between them
          cannot say "you are in The Full Celebration"; a card attached to
          the bottom of the same control can, and does, on every keystroke.
          See ScaleVerdict. */}
      {verdict}
    </section>
  )
}
