import { useMemo, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { PACK_BY_ID, defaultPackQty } from '../../data/servicePacks'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/**
 * What kind of thing each extra is, for the headings on this screen.
 *
 * ── Why this table and not `groupForService` ────────────────────────────
 * servicePricing.js already groups services six ways and carries a palette
 * for them, which looks like exactly the right thing to reuse and is not.
 * That table only covers the ~30 services the estimator prices directly;
 * more than half of what lands on this shelf — nadaswaram, bhajan, folk,
 * drone, livestream, valet, washrooms, medical, hospitality, nanny — is not
 * in it, and `groupForService` falls back to the first group. Grouping by it
 * would have filed nine of a reception's fourteen extras under "The basics",
 * which is worse than no grouping at all.
 *
 * So the shelf keeps its own, and it is exhaustive over every serviceId any
 * blueprint uses. Anything unlisted falls to the last section rather than the
 * first, because "the unglamorous things" is the honest home for a service
 * nobody has classified yet — and it sorts to the bottom, where a mystery
 * belongs.
 */
const SECTIONS = [
  { id: 'rite', label: 'The rite', services: ['priest', 'pooja', 'nadaswaram', 'bhajan', 'inauguration'] },
  { id: 'table', label: 'Food & drink', services: ['cake', 'dining', 'live_counters', 'bar', 'ice_cream', 'sweets'] },
  { id: 'memories', label: 'Photos & film', services: ['photography', 'videography', 'drone', 'livestream', 'photobooth', 'memory_wall'] },
  { id: 'moments', label: 'Music & the moments', services: ['dj', 'live_music', 'drum', 'folk', 'entertainment', 'choreography', 'emcee', 'fireworks', 'av_setup', 'signage'] },
  { id: 'ready', label: 'Getting ready', services: ['makeup', 'mehendi', 'bridal_wear', 'wedding_car', 'baraat'] },
  { id: 'vehicle', label: 'The vehicle', services: ['vehicle_decor', 'vehicle_care'] },
  { id: 'guests', label: 'Looking after guests', services: ['hospitality', 'nanny', 'kids_play', 'transport', 'valet', 'bouncers', 'medical'] },
  { id: 'ground', label: 'The unglamorous things', services: ['power', 'cooling', 'washrooms', 'tent', 'cleanup', 'venue', 'return_gifts', 'gifting', 'invitations'] },
]

const SECTION_OF = Object.fromEntries(
  SECTIONS.flatMap(sec => sec.services.map(id => [id, sec.id])),
)
const FALLBACK_SECTION = SECTIONS[SECTIONS.length - 1].id

/**
 * Everything else, on one screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROBLEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Measured at each occasion's own default headcount, the flow was twenty-four
 * screens for an aksharabhyasa, twenty-six for a vahana pooja and forty-one
 * for a reception. Twenty-four screens to arrange a slate, a lamp and a
 * purohit is not a guided journey; it is an endurance test, and the person
 * who abandons it at screen nine is the person who would have booked.
 *
 * The cause was not that the catalogue is too big. It is that every chapter
 * was equally important — a generator, a portable washroom and an ambulance
 * each interrupting a family between the cake and the photographer, in a
 * living room, for thirty guests.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ANSWER IS NOT A SHORTER CATALOGUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing is removed. Every service the occasion offers is still offered,
 * priced identically, choosable with the same packages — it is simply
 * collected here instead of being thirteen separate interruptions. The
 * blueprint's `core` list decides what earns its own screen, and it is
 * answer-aware: a four-year-old's birthday has the bouncy castle in core and
 * the memory wall on this shelf, and a seventieth has exactly the reverse.
 *
 * A card here shows what it is and what it costs nothing to ignore. Tapping
 * it opens the same packages the full screen would have shown, in place, with
 * the same "most chosen" pre-selection — so choosing from the shelf is not a
 * lesser experience, it is the same decision without the queue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND STILL NO PRICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Same rule as everywhere else in this flow, and it is under more pressure
 * here than anywhere: a shelf of thirteen optional add-ons with a number on
 * each is a shop, and a family scrolling it would be buying rather than
 * planning. What each card carries instead is the sentence that says why the
 * thing exists. The total arrives once, at the end, itemised.
 */
export default function ExtrasShelf({ chapters, selections, onChange, onSkip, guestCount, circleId }) {
  const [openId, setOpenId] = useState(null)

  const chosenCount = chapters.filter(ch => (selections?.[ch.id]?.packIds?.length ?? 0) > 0).length

  /**
   * Grouped, because fourteen identical cards in a column is the wall this
   * screen was built to replace, one level down. Blueprint order is preserved
   * inside each section — it is the order a family decides in, and re-sorting
   * by name or by price would undo the one thing the blueprint knows.
   *
   * Empty sections do not render, so a vahana pooja shows two headings and a
   * reception shows five.
   */
  const grouped = useMemo(() => {
    const byId = new Map()
    for (const ch of chapters) {
      const key = SECTION_OF[ch.serviceId] ?? FALLBACK_SECTION
      if (!byId.has(key)) byId.set(key, [])
      byId.get(key).push(ch)
    }
    return SECTIONS
      .map(sec => ({ ...sec, items: byId.get(sec.id) ?? [] }))
      .filter(sec => sec.items.length)
  }, [chapters])

  if (!chapters.length) return null

  return (
    <StepFrame
      overline="Anything else"
      question="A few more things families add."
      why={`None of these is expected, and none of them is a decision you have to make now. They are here in one place rather than as ${chapters.length} more questions — open anything you are curious about, and ignore the rest.`}
      footnote="Everything here is optional. Continue without opening any of it."
    >
      {chosenCount > 0 && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-[11.5px] font-extrabold text-teal-700 ring-1 ring-teal-200">
          <Check size={12} strokeWidth={3} /> {chosenCount} added
        </p>
      )}

      {grouped.map(section => (
        <section key={section.id} className="mb-5 last:mb-0">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
            {section.label}
            <span className="ml-1.5 font-bold text-ink-mute/70">{section.items.length}</span>
          </p>
          <div className="space-y-2.5">
        {section.items.map(chapter => {
          const selection = selections?.[chapter.id] ?? { packIds: [], qty: {} }
          const picked = selection.packIds ?? []
          const declined = !!selection.skipped
          const isOpen = openId === chapter.id
          const packs = (chapter.packIds ?? []).map(id => PACK_BY_ID[id]).filter(Boolean)
          const recommended = chapter.recommend?.[circleId] ?? null
          const multi = !!chapter.multi

          function toggle(packId) {
            const already = picked.includes(packId)
            const nextIds = multi
              ? (already ? picked.filter(p => p !== packId) : [...picked, packId])
              : (already ? [] : [packId])
            const qty = { ...(selection.qty ?? {}) }
            if (!nextIds.includes(packId)) delete qty[packId]
            else if (qty[packId] == null) qty[packId] = defaultPackQty(PACK_BY_ID[packId], guestCount)
            onChange(chapter, { packIds: nextIds, qty, skipped: false })
          }

          return (
            <div
              key={chapter.id}
              className={`overflow-hidden rounded-[22px] bg-white transition-all ${
                picked.length
                  ? 'ring-2 ring-teal-400'
                  : isOpen ? 'ring-2 ring-saffron-400' : 'ring-1 ring-hairline/[0.12]'
              } ${declined && !picked.length ? 'opacity-60' : ''}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : chapter.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.995]"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[19px] ${
                    picked.length ? 'bg-teal-50' : 'bg-surface-sunk/[0.06]'
                  }`}
                >
                  {chapter.emoji ?? '•'}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[14px] font-extrabold leading-snug text-ink">{chapter.title}</span>
                    {picked.length > 0 && (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white">
                        Added
                      </span>
                    )}
                    {declined && !picked.length && (
                      <span className="rounded-full bg-surface-sunk/[0.08] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-ink-mute">
                        No thanks
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft">
                    {picked.length
                      ? picked.map(id => PACK_BY_ID[id]?.name).filter(Boolean).join(', ')
                      : chapter.question}
                  </span>
                </span>

                <ChevronDown
                  size={18}
                  className={`mt-1 shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.02] p-3">
                  {/* The reason the thing exists, which is what a shelf card
                      has to carry in place of a price. */}
                  <p className="mb-3 px-1 text-[12px] leading-relaxed text-ink-soft">{chapter.why}</p>

                  <div className="space-y-2">
                    {packs.map(pack => (
                      <OptionCard
                        key={pack.id}
                        emoji={pack.emoji}
                        name={pack.name}
                        desc={pack.blurb}
                        includes={pack.includes}
                        note={pack.note}
                        multi={multi}
                        selected={picked.includes(pack.id)}
                        recommended={pack.id === recommended && !picked.length}
                        onToggle={() => toggle(pack.id)}
                        qty={selection.qty?.[pack.id] ?? defaultPackQty(pack, guestCount)}
                        qtyLabel={pack.unit === 'unit' ? `${pack.unitLabel ?? 'unit'}s` : null}
                        onQty={pack.unit === 'unit'
                          ? n => onChange(chapter, { ...selection, qty: { ...(selection.qty ?? {}), [pack.id]: n }, skipped: false })
                          : null}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => { onSkip(chapter); setOpenId(null) }}
                    className="mt-2.5 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[12.5px] font-bold text-ink-soft ring-1 ring-hairline/15 transition-colors hover:bg-surface-sunk/[0.05]"
                  >
                    <X size={13} strokeWidth={2.6} />
                    <span className="truncate">{chapter.skipLabel ?? 'No, not this one'}</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
          </div>
        </section>
      ))}
    </StepFrame>
  )
}
