import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Plus, Sparkles, X } from 'lucide-react'
import { pairingFor, resolvePrompt, specialsFor } from '../../data/menuPairings'

/**
 * What opens when a dish is tapped.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ARGUMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A menu form asks you to tick forty boxes across seven courses in whatever
 * order they happen to be printed in. Nobody plans food that way. A family
 * says "chapati" and the very next words out of somebody's mouth are "then
 * what gravy?" — because a chapati on its own is not a decision, it is half
 * of one.
 *
 * So tapping a dish opens its other half. Chapati opens every gravy in this
 * cuisine with the four that actually go with it named first. A biryani opens
 * raita and mirchi ka salan, because a biryani served without them gets a
 * comment. Ragi mudde opens bassaru, because there is one right answer and a
 * Kannada family will notice.
 *
 * This is not upselling dressed as helpfulness. A caterer taking this order
 * over the phone would ask exactly these questions, in exactly this order,
 * and the family would think better of them for it. The app should be at
 * least as good as that phone call.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND IT SHOWS EVERYTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Under the recommendation, every remaining dish in that course, one tap
 * away. A recommender that hides the rest of the menu loses the customer the
 * first time their own family's dish is missing from the short list — and in
 * a country with this many regional variations, that is the first time.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "ANYTHING SPECIAL?"
 * ══════════════════════════════════════════════════════════════════════
 *
 * The second half of the sheet, and the half that does the real work. A dish
 * list cannot hold "my mother-in-law cannot take garlic", "the Jain side are
 * six people and they will not eat from the same counter", "my father is
 * diabetic and will still eat three sweets if you let him". Those are the
 * first sentences a family says to a caterer, and until now this app had one
 * 500-character box at the bottom of a long page for all of them.
 *
 * They are chips now, offered at the moment the dish they concern is being
 * chosen, and each writes a plain sentence into the note the kitchen reads.
 */
export default function PairingSheet({
  open, dish, courseId, cuisine, vegOnly, menu, onToggleDish, onClose,
  specialTags, onToggleSpecial,
}) {
  const [expanded, setExpanded] = useState({})

  // A fresh sheet is a fresh sheet. Without this, opening chapati, expanding
  // the full gravy list, closing, and opening poori shows poori's sheet
  // already expanded — which reads as the app having lost its place.
  useEffect(() => { if (open) setExpanded({}) }, [open, dish?.id])

  // Escape closes it, and the page behind stops scrolling. Both are the
  // difference between a sheet and a div that happens to be on top.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  const pairing = useMemo(
    () => (open && dish ? pairingFor(dish, courseId) : null),
    [open, dish, courseId],
  )
  const prompts = useMemo(
    () => (pairing && cuisine ? pairing.prompts.map(p => resolvePrompt(p, cuisine, { vegOnly })) : []),
    [pairing, cuisine, vegOnly],
  )
  const specials = useMemo(() => specialsFor(courseId), [courseId])

  if (!open || !dish || !pairing) return null

  const chosenIn = course => new Set(menu?.[course] ?? [])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-plum-950/45 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[88svh] flex-col rounded-t-[28px] bg-white shadow-[0_-8px_40px_-12px_rgba(17,15,25,0.35)]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="shrink-0 rounded-t-[28px] border-b border-hairline/[0.08] px-5 pb-3.5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-sunk/[0.15]" />
          <div className="flex items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className={dish.veg ? 'text-green-600' : 'text-red-600'}>●</span>
                <span className="truncate text-[16px] font-extrabold text-ink">{dish.name}</span>
                <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700">
                  Added
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-soft">
                {pairing.line}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-sunk/[0.06] text-ink-soft"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {prompts.map(prompt => {
            const chosen = chosenIn(prompt.course.id)
            const isOpen = !!expanded[prompt.course.id]
            return (
              <section key={prompt.course.id + prompt.label} className="mb-5 last:mb-0">
                <h3 className="text-[13px] font-extrabold text-ink">{prompt.label}</h3>
                {prompt.hint && (
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{prompt.hint}</p>
                )}

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {prompt.lead.slice(0, 8).map(d => (
                    <DishChip
                      key={d.id}
                      dish={d}
                      picked={chosen.has(d.id)}
                      onToggle={() => onToggleDish(prompt.course.id, d.id)}
                    />
                  ))}
                </div>

                {/* Everything else in this course. Never hidden — only
                    collapsed, and the count is on the control so nobody has
                    to guess whether it is worth opening. */}
                {prompt.rest.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpanded(e => ({ ...e, [prompt.course.id]: !isOpen }))}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-plum-700"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                      {isOpen
                        ? 'Hide the rest'
                        : `Show all ${prompt.rest.length + prompt.lead.length} ${prompt.course.label.toLowerCase()}`}
                    </button>
                    {isOpen && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {prompt.rest.map(d => (
                          <DishChip
                            key={d.id}
                            dish={d}
                            picked={chosen.has(d.id)}
                            onToggle={() => onToggleDish(prompt.course.id, d.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            )
          })}

          {/* ── The special requests ─────────────────────────────── */}
          <section className="mt-6 rounded-2xl bg-surface-sunk/[0.05] p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
              <Sparkles size={14} className="text-saffron-600" />
              Anything special we should know?
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
              Tap anything that applies. It goes straight to the kitchen with your menu — this is
              the part a dish list cannot hold.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {specials.map(s => {
                const on = specialTags?.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onToggleSpecial(s.id)}
                    aria-pressed={on}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-colors ${
                      on
                        ? 'bg-plum-700 text-white'
                        : 'bg-white text-ink-soft ring-1 ring-hairline/[0.12]'
                    }`}
                  >
                    <span aria-hidden="true">{s.emoji}</span>
                    {s.label}
                    {on && <Check size={12} strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 border-t border-hairline/[0.08] px-5 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <button type="button" onClick={onClose} className="a-btn-primary w-full">
            Done — back to the menu
          </button>
        </div>
      </div>
    </div>
  )
}

function DishChip({ dish, picked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={picked}
      className={`inline-flex min-h-[40px] max-w-full items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold transition-colors ${
        picked
          ? 'bg-teal-600 text-white'
          : 'bg-surface-sunk/[0.05] text-ink-soft ring-1 ring-hairline/[0.1]'
      }`}
    >
      <span className={picked ? 'text-white/80' : dish.veg ? 'text-green-600' : 'text-red-600'}>●</span>
      <span className="truncate">{dish.name}</span>
      {dish.delta > 0 && (
        <span className={`shrink-0 text-[10px] ${picked ? 'text-white/80' : 'text-plum-600'}`}>
          +₹{dish.delta}
        </span>
      )}
      {picked ? <Check size={12} strokeWidth={3} className="shrink-0" /> : <Plus size={12} className="shrink-0" />}
    </button>
  )
}
