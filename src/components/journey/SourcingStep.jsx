import { Info } from 'lucide-react'
import { SOURCING_MODES, PLATE_SPLIT, PART_HEADING } from '../../data/cateringModel'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/**
 * "Who is buying the groceries?"
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SCREEN EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every quote this app produced assumed full catering — we buy the
 * provisions, we cook them, we serve them, one per-plate rate. That is how a
 * caterer quotes and it is not how a very large share of Indian families
 * feed a function. The family buys the rice, the dal, the oil and the
 * vegetables themselves, often at a wholesale market somebody in the family
 * knows, and then hires a cook.
 *
 * For that family, a per-plate rate that silently includes groceries is
 * wrong by more than half the food cost. They read "₹450 a plate", assume it
 * is the cook's charge, and find out at the confirmation. That argument is
 * the single most common one in Indian catering, and the app was walking
 * every customer straight into it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND WHY IT SHOWS THE SPLIT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A price that moves when you answer a question is only trustworthy if you
 * can see WHY it moved. So the screen states, in plain figures, what a plate
 * is actually made of — a little under three-fifths ingredients, a fifth
 * cooking, a fifth serving — before it asks. That is the number a family is
 * mentally doing anyway when they decide to go to the market themselves, and
 * putting it on screen is the difference between a menu of options and an
 * explanation.
 *
 * It is the one place in this flow that shows a percentage before the
 * reveal, and it earns the exception the same way the extra-dish surcharge
 * does: a customer who is not told this is a customer who is surprised
 * later, and a surprise at the confirmation costs far more than a figure
 * here.
 */
export default function SourcingStep({ value, onChange, cuisine }) {
  return (
    <StepFrame
      overline="The food"
      question="Who is buying the groceries?"
      why="Plenty of families buy the provisions themselves and hire a cook — that is completely normal here, and it changes the price by more than half the food cost. So we ask rather than assume."
      footnote="Whatever you choose, your coordinator confirms the quantities with you before anything is bought."
    >
      {/* The arithmetic, before the choice. */}
      <div className="mb-4 rounded-[22px] bg-surface-sunk/[0.05] p-4">
        <p className="flex items-start gap-2 text-[12.5px] font-extrabold leading-snug text-ink">
          <Info size={14} className="mt-0.5 shrink-0 text-ink-mute" />
          What a plate is actually made of
        </p>
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full">
          <span className="bg-teal-500" style={{ width: `${PLATE_SPLIT.provisions * 100}%` }} />
          <span className="bg-saffron-400" style={{ width: `${PLATE_SPLIT.kitchen * 100}%` }} />
          <span className="bg-plum-400" style={{ width: `${PLATE_SPLIT.service * 100}%` }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {[
            ['provisions', 'bg-teal-500'],
            ['kitchen', 'bg-saffron-400'],
            ['service', 'bg-plum-400'],
          ].map(([part, dot]) => (
            <li key={part} className="flex items-center gap-2 text-[12px] text-ink-soft">
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
              <span className="flex-1">{PART_HEADING[part]}</span>
              <span className="font-extrabold tabular-nums text-ink">
                {Math.round(PLATE_SPLIT[part] * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mute">
          Roughly, for {cuisine ? `a ${cuisine.name.toLowerCase()} spread` : 'a vegetarian spread'} at
          volume. Choosing to buy a part of it yourself takes that share out of your estimate.
        </p>
      </div>

      <div className="space-y-2.5">
        {SOURCING_MODES.map(mode => (
          <OptionCard
            key={mode.id}
            emoji={mode.emoji}
            name={mode.name}
            desc={mode.desc}
            includes={mode.includes}
            note={mode.note}
            selected={value === mode.id}
            recommended={mode.id === 'full' && !value}
            onToggle={() => onChange(mode.id)}
          />
        ))}
      </div>
    </StepFrame>
  )
}
