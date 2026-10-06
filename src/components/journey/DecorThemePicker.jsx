import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { CATALOG_BY_OCCASION, DECOR_CATEGORIES } from '../../data/decorCatalog'
import { StepFrame } from './JourneyChrome'
import CustomRequest from './CustomRequest'

/**
 * The decoration, as setups a person can see — not as a paint chart.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES, AND WHY IT WAS WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The colour step asked "What should it look like?" and answered it with
 * thirteen palettes: "Traditional red & gold", "Pastel — blush, mint and
 * cream", "Marigold & temple traditional". Two gradient stops and a name.
 *
 * Nobody books decoration that way. A palette is not a setup, and somebody
 * who taps "Decoration" has a THING in their head — a mandap, a flower wall,
 * a marigold canopy over the haldi, a cradle for the namakarana, a heart of
 * balloons on a bedroom wall. Showing them a colour swatch answers a question
 * they did not ask, with information they cannot judge: "Marigold & temple
 * traditional" means something different to the customer and to the
 * decorator, and the difference surfaces on the morning.
 *
 * The catalogue already knew this. data/decorCatalog.js holds sixty real
 * setups with a photograph each, what gets installed, how long it takes, and
 * where it goes — and it was reachable from the shop-style décor browser and
 * from nowhere in the guided flow. So this step now shows the real thing,
 * filtered to the occasion, and the palette question is gone: a marigold
 * temple setup is already marigold, and asking a family to also pick a colour
 * for it is a screen that exists to be answered rather than to be decided.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FILTERED TO THE OCCASION, AND SAYING SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * `CATALOG_BY_OCCASION` is the tagging, and it is per-occasion for a reason a
 * wedding makes obvious: a mandap and a varmala stage are the entire question
 * at a muhurtham and are noise at a first birthday, where the answer is a
 * balloon arch and a themed room. The categories across the top are the
 * second cut — "what people stand in front of" versus "the entrance" versus
 * "the table" — because ten setups in one column is a list and ten in three
 * labelled groups is a choice.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND THE WAY OUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Decoration is the single most likely thing for somebody to have a picture
 * of on their phone. So the custom box sits at the bottom of this screen
 * specifically, in its own words: describe it, or send the photograph to your
 * coordinator. A family copying a setup they saw at a cousin's wedding is the
 * most common decoration brief there is, and until now there was nowhere to
 * say it.
 */
export default function DecorThemePicker({ occasionId, chosenIds, onToggle, custom, onCustom, levelName }) {
  const [category, setCategory] = useState('all')

  const items = CATALOG_BY_OCCASION[occasionId] ?? []

  /** Only the categories this occasion actually has setups in. */
  const categories = useMemo(() => {
    const present = new Set(items.map(i => i.category))
    return [
      { id: 'all', label: 'Everything' },
      ...DECOR_CATEGORIES.filter(c => present.has(c.id)).map(c => ({ id: c.id, label: c.name })),
    ]
  }, [items])

  const shown = category === 'all' ? items : items.filter(i => i.category === category)

  return (
    <StepFrame
      overline="How it looks"
      question="Which setups are we building?"
      why={
        levelName
          ? `Real setups for this occasion, photographed. Choose as many as you want built — they sit inside your ${levelName} scale, and your coordinator confirms the exact flowers against what the market has that week.`
          : 'Real setups for this occasion, photographed. Choose as many as you want built — your coordinator confirms the exact flowers against what the market has that week.'
      }
      footnote="Every photograph is a similar setup, not our own work — we are pre-launch and say so everywhere."
    >
      {categories.length > 2 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map(c => {
            const active = category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-saffron-400 to-plum-500 text-white'
                    : 'bg-surface-sunk/[0.06] text-ink-soft'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shown.map(item => {
          const picked = chosenIds.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={picked}
              className={`group flex flex-col overflow-hidden rounded-[20px] bg-white text-left transition-all active:scale-[0.98] ${
                picked ? 'ring-2 ring-saffron-400' : 'ring-1 ring-hairline/[0.12]'
              }`}
            >
              <span className="relative block aspect-square w-full overflow-hidden bg-surface-sunk/[0.06]">
                {/* `resolve()` in decorCatalog.js flattens the photo to a
                    plain URL string with `alt` beside it — not a nested
                    object. Reading `.url` off a string is silently undefined
                    and every card falls back to the emoji plate. */}
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.alt ?? item.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[34px]">{item.emoji}</span>
                )}
                {picked && (
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-saffron-500 text-white shadow">
                    <Check size={15} strokeWidth={3.2} />
                  </span>
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col p-3">
                <span className="text-[12.5px] font-extrabold leading-tight text-ink">{item.name}</span>
                <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-mute">{item.blurb}</span>
                {item.where && (
                  <span className="mt-auto pt-2 text-[10.5px] font-bold text-ink-mute">{item.where}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-center text-[13px] text-ink-mute">
          Nothing catalogued in this group yet — describe what you want below and a designer will
          come back with options.
        </p>
      )}

      <CustomRequest
        value={custom}
        onChange={onCustom}
        label="Have something else in mind?"
        placeholder="e.g. the marigold and mirror-work mandap from my cousin’s wedding in Mysuru"
      />
    </StepFrame>
  )
}
