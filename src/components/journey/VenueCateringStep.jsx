import { Info } from 'lucide-react'
import { capabilitiesFor } from '../../data/venueCapabilities'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/**
 * "Does your venue let you bring a caterer?"
 *
 * Asked only where the honest answer is "it depends" — a banquet hall, an
 * office, a hall the customer has already booked and we know nothing about.
 * Everywhere else the venue's own capability table settles it and this screen
 * never appears: a resort caters, a lawn does not, and asking either would be
 * asking a question we already know the answer to.
 *
 * ── Why it is worth a screen ────────────────────────────────────────────
 * Because it decides whether the estimate contains the food. A hall that
 * sells per-plate is quoting the whole meal; a hall that rents by the hour is
 * quoting a room. Those are different numbers by a factor of several, and
 * guessing wrong is wrong in whichever direction we guess. It also decides
 * whether the groceries question is asked at all — nobody buys provisions for
 * a kitchen they are not allowed into.
 *
 * ── And why "I do not know" is a real answer ────────────────────────────
 * Most people genuinely do not, because it is in the hall's contract and
 * nobody reads it until there is a reason to. Making them guess produces a
 * confident wrong answer; letting them say so produces a coordinator phone
 * call to the hall, which is the correct outcome and takes four minutes.
 */
export default function VenueCateringStep({ venueId, value, onChange }) {
  const venue = capabilitiesFor(venueId)

  return (
    <StepFrame
      overline="The food"
      question={`Does ${venue.label} let you bring your own caterer?`}
      why="It decides whether the food is in this estimate at all. A hall that sells per plate is quoting you the whole meal; one that rents by the hour is quoting a room, and we would be pricing two very different things."
      footnote="If you are not sure, say so — your coordinator will ring the venue and confirm before anything is quoted."
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-surface-sunk/[0.05] px-4 py-3.5">
        <Info size={14} className="mt-0.5 shrink-0 text-ink-mute" />
        <p className="text-[12px] leading-relaxed text-ink-soft">
          Most kalyana mantapas allow an outside caterer and most hotels and resorts do not.
          Banquet halls go both ways, and it is usually written into the hire agreement.
        </p>
      </div>

      <div className="space-y-2.5">
        <OptionCard
          emoji="🧑‍🍳"
          name="Yes — we can bring our own caterer"
          desc="We cook and serve at the venue. You will be asked next who is buying the provisions, because that is yours to decide."
          includes={[
            'Our kitchen team works at the venue',
            'You choose the spread dish by dish',
            'You choose who buys the groceries',
            'We handle serving and clearing',
          ]}
          selected={value === true}
          onToggle={() => onChange(true)}
        />
        <OptionCard
          emoji="🏨"
          name="No — the venue’s own kitchen cooks"
          desc="Their chef, their licence, their per-plate rate. We negotiate the menu and the rate with them on your behalf rather than cooking ourselves."
          includes={[
            'Menu chosen from what their kitchen does well',
            'Per-plate rate negotiated on your behalf',
            'Dietary and Jain requirements put to them in writing',
            'No outside provisions — nothing for you to buy',
          ]}
          note="You will not be asked about groceries — there is nothing for you to source when the venue cooks."
          selected={value === false}
          onToggle={() => onChange(false)}
        />
        <OptionCard
          emoji="🤷"
          name="I am not sure"
          desc="Completely normal — it is in the hire agreement and almost nobody has read it. We will ring the venue and confirm before quoting the food."
          selected={value === 'unsure'}
          onToggle={() => onChange('unsure')}
        />
      </div>
    </StepFrame>
  )
}
