import { Check } from 'lucide-react'
import { VISIBLE_DECOR_LEVELS, DECOR_THEMES, DECOR_ADDONS, DECOR_LEVEL_BY_ID } from '../../data/decorPackages'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/* ══════════════════════════════════════════════════════════════════════
   HOW IT LOOKS — three questions, not one form
   ══════════════════════════════════════════════════════════════════════

   Décor was one screen with a level dropdown, a theme dropdown and a list of
   add-on checkboxes. Three unrelated decisions stacked in a box, and the one
   that people genuinely enjoy making — the colours — was a <select>.

   Split, it becomes: how much of it, what colour, and what else. Each is a
   sentence, each is a screen, and the colour one is the single most enjoyable
   moment in the whole flow, which is worth having at the halfway point of a
   long journey. */

export function DecorLevelStep({ levelId, onLevel, circle, guests }) {
  const suggested = circle?.defaultDecor
  return (
    <StepFrame
      overline="How it looks"
      question="How much decoration are we doing?"
      why={`Everything is scaled to ${guests} guests — the same setup in a bigger hall needs more drape, and we would rather say that now than on the day.`}
    >
      <div className="space-y-2.5">
        {VISIBLE_DECOR_LEVELS.map(level => (
          <OptionCard
            key={level.id}
            emoji={level.emoji}
            name={level.name}
            desc={level.description}
            includes={level.inclusions}
            selected={levelId === level.id}
            recommended={level.id === suggested && !levelId}
            onToggle={() => onLevel(level.id)}
          />
        ))}

        {/* ── The answer this screen did not have ────────────────────────
            Every other chapter in the flow can be declined; this one could
            not. `none` exists in decorPackages.js and is marked hidden,
            which was right for the tier ladder — a tier IS a decorated
            celebration — and wrong here, where the customer is choosing one
            thing at a time. So a family whose cousin does the decoration, or
            who booked a hall that decorates it for them, had to pick a level
            they did not want and pay for it in the estimate, because Continue
            stayed disabled until they did.

            It is last rather than first: the honest default is that there IS
            decoration, and the refusal should be findable rather than
            leading. */}
        <div className="pt-1">
          <OptionCard
            emoji="🚫"
            name="No decoration needed"
            desc="The venue decorates it, or the family is doing it. Nothing is quoted for decor, and nobody will ring you about it."
            selected={levelId === 'none'}
            onToggle={() => onLevel('none')}
          />
        </div>
      </div>
    </StepFrame>
  )
}

export function DecorThemeStep({ themeId, onTheme, levelId }) {
  const level = DECOR_LEVEL_BY_ID[levelId]
  return (
    <StepFrame
      overline="The colours"
      question="What should it look like?"
      why="The palette the designer works from. Everything is fresh flowers and real fabric — send a reference photo later if you have one in mind, and they will work from that instead."
      footnote={level ? `Applied across your ${level.name} setup.` : null}
    >
      <div className="space-y-2.5">
        {DECOR_THEMES.map(theme => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onTheme(theme.id)}
            aria-pressed={themeId === theme.id}
            className={`flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left transition-all active:scale-[0.995] ${
              themeId === theme.id
                ? 'shadow-[0_8px_22px_-16px_rgba(42,30,20,0.4)] ring-2 ring-saffron-400'
                : 'ring-1 ring-hairline/[0.1]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-9 w-9 shrink-0 rounded-full ring-1 ring-hairline/10 ${SWATCH[theme.id] ?? 'bg-gradient-to-br from-slate-200 to-slate-400'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold leading-snug text-ink">{theme.name}</span>
              {theme.note && (
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">{theme.note}</span>
              )}
            </span>
            {themeId === theme.id && (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-saffron-500 text-white">
                <Check size={14} strokeWidth={3.2} />
              </span>
            )}
          </button>
        ))}
      </div>
    </StepFrame>
  )
}

/**
 * A real swatch beside every palette.
 *
 * A colour choice described only in words is a colour choice made blind, and
 * "Mysuru royal — purple, gold and ivory" is exactly the kind of name that
 * means something different to the customer and the decorator. Two gradient
 * stops is not the finished mandap, but it settles the argument about whether
 * "pastel" means blush or mint before anybody orders flowers.
 */
const SWATCH = {
  traditional_red_gold: 'bg-gradient-to-br from-red-500 via-amber-400 to-yellow-300',
  pastel: 'bg-gradient-to-br from-rose-200 via-emerald-100 to-amber-50',
  white_gold: 'bg-gradient-to-br from-white via-amber-100 to-yellow-300',
  mysuru_royal: 'bg-gradient-to-br from-purple-700 via-amber-400 to-stone-100',
  marigold_temple: 'bg-gradient-to-br from-orange-500 via-yellow-400 to-lime-500',
  rose_gold: 'bg-gradient-to-br from-rose-300 via-pink-200 to-amber-200',
  tropical_green: 'bg-gradient-to-br from-emerald-600 via-lime-400 to-white',
  royal_blue_silver: 'bg-gradient-to-br from-blue-800 via-blue-400 to-slate-200',
  earthy_boho: 'bg-gradient-to-br from-amber-200 via-stone-300 to-amber-700',
  rainbow_kids: 'bg-gradient-to-br from-fuchsia-500 via-yellow-400 to-cyan-400',
  monochrome: 'bg-gradient-to-br from-black via-white to-amber-400',
  imported_florals: 'bg-gradient-to-br from-violet-400 via-white to-rose-300',
  match_my_invite: 'bg-gradient-to-br from-slate-200 via-white to-slate-300',
}

export function DecorAddonStep({ addonIds, onAddons }) {
  function toggle(id) {
    onAddons(addonIds.includes(id) ? addonIds.filter(a => a !== id) : [...addonIds, id])
  }
  return (
    <StepFrame
      overline="Finishing touches"
      question="Anything else on the day?"
      why="Every one of these is something a decorator would otherwise ring about three days before — which is the worst possible moment to be making a spending decision. Asked here instead, while you are still comparing."
      footnote="Choose as many as you like, or none."
    >
      <div className="space-y-2.5">
        {DECOR_ADDONS.map(addon => (
          <OptionCard
            key={addon.id}
            emoji="✨"
            name={addon.name}
            desc={addon.note}
            multi
            selected={addonIds.includes(addon.id)}
            onToggle={() => toggle(addon.id)}
          />
        ))}
      </div>
    </StepFrame>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   THE OCCASION'S OWN DECORATION
   ══════════════════════════════════════════════════════════════════════

   One screen instead of three, with options written for this occasion
   rather than for a hall.

   The generic ladder above asks how much, then what colour, then what
   extras — three real decisions when the answer is a styled function in a
   banquet hall, and three wrong ones everywhere else. "Home Touch — the
   entrance, the cake table, and the corner everyone photographs" is a
   description of a birthday party, and it was being shown on a screen about
   a motorcycle, a plot of bare land, and a shop shutter.

   So an occasion can bring its own setups: "banana stems either side of the
   shutter", "the kunda area levelled and laid out", "marigold curtains and
   painted matkas". Each one carries the décor level and palette it is
   actually built from, so the estimate comes out of exactly the same engine
   and the price does not move. What changes is that the customer is asked
   about their own function.

   See the `decor` block in data/celebrationBlueprints.js. */

export function DecorOwnStep({ step, choiceId, onChoose }) {
  return (
    <StepFrame
      overline="How it looks"
      question={step.question}
      why={step.why}
      footnote="Fresh flowers and real fabric, set up before your guests arrive and cleared afterwards."
    >
      <div className="space-y-2.5">
        {step.options.map(option => (
          <OptionCard
            key={option.id}
            emoji={option.emoji}
            name={option.name}
            desc={option.desc}
            includes={option.includes}
            note={option.note}
            selected={choiceId === option.id}
            onToggle={() => onChoose(option)}
          />
        ))}

        {/* Declining is a card here rather than only a button in the bar, so
            it reads as one of the answers rather than as giving up on the
            screen. Same argument as the refusal control itself. */}
        <div className="pt-1">
          <OptionCard
            emoji="🚫"
            name={step.skipLabel ?? 'No decoration needed'}
            desc="Nothing is quoted for decor, and nobody will ring you about it."
            selected={choiceId === 'none'}
            onToggle={() => onChoose({ id: 'none', levelId: 'none', themeId: null })}
          />
        </div>
      </div>
    </StepFrame>
  )
}
