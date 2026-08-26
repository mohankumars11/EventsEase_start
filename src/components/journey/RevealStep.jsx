import { useEffect, useState } from 'react'
import {
  BookmarkCheck, ChevronDown, Pencil, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles,
} from 'lucide-react'
import { quoteLines } from '../../utils/quote'
import { PACK_BY_ID, defaultPackQty } from '../../data/servicePacks'
import { formatINR } from '../../utils/format'
import { COURSES, dishesFor } from '../../data/cuisineMenus'
import { PART_LABEL } from '../../data/cateringModel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The one screen in this flow that shows a number.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS HERE AND NOWHERE ELSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every other planning surface in this app opens on a price. The occasion
 * page leads with "from ₹26,750". The builder pins a running estimate to the
 * bottom of the screen and tells you to watch it move. For a customer who
 * already knows what they want, that is exactly right.
 *
 * It is wrong for the customer who has just tapped "Birthday" — and that is
 * most of them. A five-figure number shown to somebody who has answered
 * nothing is not transparency. It is a stranger quoting at you before hello,
 * and in this market the reaction to being quoted at is not to negotiate. It
 * is to close the app and ring the caterer your cousin used, because at least
 * he asks about your family first.
 *
 * So the number waits. By the time it appears the customer has chosen the
 * cake, the seating, the gravies that go with the chapati and the colour of
 * the mandap, and the total is not a quote any more — it is the sum of things
 * they picked, each of which they can still remember choosing. That is a
 * completely different conversation, and it is the one this flow exists to
 * make possible.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THE SCREEN DOES BEFORE IT SHOWS IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * It reads the plan back first. Not as reassurance theatre — as the last
 * chance to catch a wrong answer while it is still free to change, and
 * because a total is only believable when the thing it is a total OF is on
 * the same screen. Then the figure, then every line that makes it up, then
 * what is not included. In that order, always.
 */
export default function RevealStep({
  quote, occasionName, occasionEmoji, circle, guests, cuisine, menu, vegOnly,
  decorLevel, decorLabel, chapters, selections, onEdit, savings,
  onOpenMap, onRestart, onSaveExit, extrasCount, sourcing,
}) {
  const reduced = useReducedMotion()
  const [revealed, setRevealed] = useState(reduced)
  const [openBreakdown, setOpenBreakdown] = useState(false)

  // A single beat before the figure lands. Long enough to read the summary
  // above it, short enough not to feel like a loading spinner pretending to
  // be suspense — and skipped entirely when the OS asks for reduced motion,
  // because a delayed reveal for somebody who has turned animation off is
  // just a page that appears broken.
  useEffect(() => {
    if (reduced) return setRevealed(true)
    const t = setTimeout(() => setRevealed(true), 620)
    return () => clearTimeout(t)
  }, [reduced])

  if (!quote) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-[14px] text-ink-soft">
          We need a headcount and a scale before we can put a number on this.
        </p>
      </div>
    )
  }

  const lines = quoteLines(quote)
  const dishCount = COURSES.reduce((n, c) => n + (menu?.[c.id]?.length ?? 0), 0)
  const chosenChapters = chapters.filter(
    ch => ch.kind === 'service' && (selections?.[ch.id]?.packIds?.length ?? 0) > 0,
  )

  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
      <p className="type-overline text-saffron-700">Your plan</p>
      <h1 className="mt-1.5 font-serif text-[27px] font-extrabold leading-[1.12] tracking-tight text-ink sm:text-[31px]">
        Here is your {occasionName.toLowerCase()}.
      </h1>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
        Everything you chose, and what it comes to. Nothing is booked and nothing is owed —
        this is an estimate you can send to a coordinator, change, or walk away from.
      </p>

      {/* ── The plan, read back ──────────────────────────────────── */}
      <div className="a-card mt-5 divide-y divide-hairline/[0.07]">
        <SummaryRow
          emoji={occasionEmoji}
          label={occasionName}
          value={`${guests} guests · ${circle?.name}`}
          onEdit={() => onEdit('guests')}
        />
        {cuisine && (
          <SummaryRow
            emoji={cuisine.emoji}
            label={cuisine.name}
            /* The BILLED rate, not the full-plate rate. A family who is
               buying their own groceries must not read back a number they
               are not paying, on the screen whose whole job is reading the
               plan back before they send it. */
            value={`${dishCount} dishes${vegOnly ? ' · pure veg' : ''} · ₹${quote.catering.perPlate}/plate`}
            onEdit={() => onEdit('cuisine')}
          />
        )}
        {cuisine && sourcing && (
          <SummaryRow
            emoji={sourcing.emoji}
            label={sourcing.name}
            value={
              quote.catering.share < 1
                ? `${Math.round(quote.catering.share * 100)}% of a full plate — you are buying the rest`
                : 'Provisions, cooking and serving, all of it'
            }
            onEdit={() => onEdit('sourcing')}
          />
        )}
        {decorLevel && decorLevel.id !== 'none' && (
          <SummaryRow
            emoji={decorLevel.emoji}
            /* The occasion's own name for the setup where it has one.
               A family who chose "Banana stems and a toran" should not be
               read back "Home Touch" — that is the rung underneath, and it
               is a word they have never seen. */
            label={decorLabel ?? decorLevel.name}
            value={decorLabel ? decorLevel.name : (quote.decor.theme?.name ?? 'Décor and styling')}
            onEdit={() => onEdit(decorLabel ? 'decor_own' : 'decor_level')}
          />
        )}
        {chosenChapters.map(ch => (
          <SummaryRow
            key={ch.id}
            emoji={ch.emoji}
            label={ch.title}
            /* Resolved from the catalogue, not from `quote.extras`.
               `buildQuote` normalises every extra down to
               `{ key, label, detail, amount, serviceId, packId, qty }` — it
               deliberately does not carry the pack object through, because
               the engine has no business holding catalogue records. Reading
               `.pack.name` off it therefore produced `undefined` for every
               row, and each summary line rendered as a bare title with the
               choice missing: "The act — Change", with no way to tell what
               had been chosen. On the one screen whose entire job is reading
               the plan back before somebody sends it. */
            value={(selections[ch.id].packIds)
              .map(id => {
                const pack = PACK_BY_ID[id]
                if (!pack) return null
                const qty = selections[ch.id].qty?.[id] ?? defaultPackQty(pack, guests)
                return pack.unit === 'unit' && qty > 1 ? `${pack.name} × ${qty}` : pack.name
              })
              .filter(Boolean).join(', ')}
            onEdit={() => onEdit(ch.id)}
          />
        ))}
      </div>

      {/* ── The number ───────────────────────────────────────────── */}
      <div
        className={`a-aurora relative mt-5 overflow-hidden rounded-[28px] p-6 text-center transition-opacity duration-700 ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">
          Estimated, everything included
        </p>
        <p className="mt-2 font-serif text-[32px] font-extrabold leading-none tracking-tight text-white sm:text-[38px]">
          {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
        </p>
        <p className="mt-2.5 text-[12.5px] font-semibold text-white/85">
          About {formatINR(quote.perGuest)} a guest · GST and our fee already in it
        </p>
        {savings?.active && savings.total > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-extrabold text-white ring-1 ring-white/25">
            <Sparkles size={12} />
            You save {formatINR(savings.total)} booking it together
          </p>
        )}
      </div>

      {/* ── Why it is a range and not a figure ───────────────────── */}
      <p className="mt-3 flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-ink-mute">
        <ShieldCheck size={14} className="mt-px shrink-0 text-teal-600" />
        <span>
          A range, not a quote, and deliberately so. We are pricing against researched Bengaluru
          and Mysuru market rates, and the final figure moves with the vegetable rate that week
          and what your venue charges for a Saturday. Your coordinator confirms every line before
          anything is booked.
        </span>
      </p>

      {/* ── Every line ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpenBreakdown(o => !o)}
        aria-expanded={openBreakdown}
        className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-sunk/[0.05] px-4 py-3.5 text-left"
      >
        <span className="text-[13.5px] font-extrabold text-ink">
          {openBreakdown ? 'Hide the breakdown' : `See all ${lines.length} lines`}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-ink-mute transition-transform ${openBreakdown ? 'rotate-180' : ''}`} />
      </button>

      {openBreakdown && (
        <div className="a-card mt-2.5 overflow-hidden">
          <div className="divide-y divide-hairline/[0.07]">
            {lines.map(line => (
              <div key={line.key} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-snug text-ink">{line.label}</span>
                  {line.detail && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-mute">{line.detail}</span>
                  )}
                </span>
                <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-ink">
                  {formatINR(line.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 border-t border-hairline/10 bg-surface-sunk/[0.03] px-4 py-3.5">
            <Total label="Subtotal" amount={quote.subtotal} />
            {quote.bundle.applied && (
              <Total
                label={`Booking it all together (−${Math.round(quote.bundle.rate * 100)}%)`}
                amount={-quote.bundle.amount}
                tone="text-teal-700"
              />
            )}
            <Total
              label={`Sambramo fee (${Math.round(quote.platformFee.rate * 100)}%)`}
              amount={quote.platformFee.amount}
            />
            {quote.tax.parts.map(part => (
              <Total
                key={part.label}
                label={`GST on ${part.label} @ ${Math.round(part.rate * 100)}%`}
                amount={part.amount}
              />
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-hairline/10 pt-2.5">
              <span className="text-[13.5px] font-extrabold text-ink">Estimated total</span>
              <span className="text-[15px] font-extrabold tabular-nums text-ink">
                {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── What is deliberately not in it ───────────────────────── */}
      <div className="mt-5 rounded-2xl bg-surface-sunk/[0.04] p-4">
        <p className="text-[12.5px] font-extrabold text-ink">What this does not include</p>
        <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-ink-mute">
          <li>· Anything you told us you were arranging yourselves.</li>
          <li>· Venue hire, where you said you already have a place.</li>
          <li>· Priests’ dakshine and offerings, which are given directly by the family.</li>
          <li>· Anything added after the coordinator’s call — it goes on a revised estimate first.</li>
        </ul>
      </div>

      {/* ── The groceries, said out loud ──────────────────────────────
          A customer who chose to buy their own provisions has an estimate
          that is missing the single largest line in their real spend, and
          the estimate must say so where they cannot miss it. Being under-
          quoted is not a kindness; it is the same surprise as being over-
          charged, arriving later. */}
      {cuisine && sourcing && quote.catering.share < 1 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3.5 ring-1 ring-amber-200">
          <ShieldCheck size={16} className="mt-px shrink-0 text-amber-700" />
          <p className="text-[12px] leading-relaxed text-amber-900">
            <span className="font-extrabold">This figure does not include {
              quote.catering.excludes.map(part => PART_LABEL[part]).join(' or ')
            }.</span>{' '}
            You told us you are arranging that yourself, so it is not ours to quote. Your
            coordinator will send a costed shopping list by weight so you know what to expect at
            the market.
          </p>
        </div>
      )}

      {/* The menu, in full, because it is the thing most likely to be
          checked twice and the hardest to remember thirty screens later. */}
      {cuisine && (
        <details className="mt-4 rounded-2xl bg-surface-sunk/[0.04] p-4">
          <summary className="cursor-pointer text-[12.5px] font-extrabold text-ink">
            Your menu, dish by dish ({dishCount})
          </summary>
          <div className="mt-3 space-y-2.5">
            {COURSES.map(course => {
              const ids = menu?.[course.id] ?? []
              if (!ids.length) return null
              const available = dishesFor(cuisine, course.id, { vegOnly })
              const names = ids.map(id => available.find(d => d.id === id)?.name).filter(Boolean)
              if (!names.length) return null
              return (
                <p key={course.id} className="text-[11.5px] leading-relaxed text-ink-soft">
                  <span className="font-extrabold text-ink">{course.label}: </span>
                  {names.join(', ')}
                </p>
              )
            })}
          </div>
        </details>
      )}

      {/* ══════════════════════════════════════════════════════════════
          WHAT YOU CAN DO WITH IT
          ══════════════════════════════════════════════════════════════

          Every row above has its own "Change", which is the right control
          for "the photographer should be full day". It is the wrong control
          for the three things a person actually wants at the end of a long
          flow and could not do:

            · see everything at once, including what they DECLINED — the
              summary above lists only what was chosen, so a family who said
              no to the videographer on screen nine has no way to find that
              decision again from here;
            · look at the eleven optional things they skipped past, now that
              they have seen the number and know what they have left to
              spend;
            · put it down and come back, without the anxiety of wondering
              whether a half-finished plan survives closing the app.

          The last one is the reason this block exists at all. The bar at the
          top has always said "Save", and nobody reads an app bar at the
          moment they are deciding whether to spend two lakh rupees. It is
          said here, in words, next to the number it applies to.

          "Start again" is deliberately last, deliberately plain, and
          deliberately confirms — it is the least-used control on the screen
          and the most expensive to hit by accident. */}
      <div className="mt-5 rounded-[24px] bg-surface-sunk/[0.04] p-4">
        <p className="text-[12.5px] font-extrabold text-ink">Not quite right yet?</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
          Nothing here is booked. Change any part of it, or come back to it later — your plan is
          saved on this device as you go.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12.5px] font-bold text-ink ring-1 ring-hairline/15 transition-colors hover:bg-surface-sunk/[0.04]"
            >
              <SlidersHorizontal size={14} /> Every part of it
            </button>
          )}
          {extrasCount > 0 && (
            <button
              type="button"
              onClick={() => onEdit('extras')}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12.5px] font-bold text-ink ring-1 ring-hairline/15 transition-colors hover:bg-surface-sunk/[0.04]"
            >
              <Plus size={14} /> Add something
            </button>
          )}
          {onSaveExit && (
            <button
              type="button"
              onClick={onSaveExit}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12.5px] font-bold text-ink ring-1 ring-hairline/15 transition-colors hover:bg-surface-sunk/[0.04]"
            >
              <BookmarkCheck size={14} /> Save for later
            </button>
          )}
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12.5px] font-bold text-ink-mute ring-1 ring-hairline/15 transition-colors hover:bg-surface-sunk/[0.04]"
            >
              <RotateCcw size={14} /> Start again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ emoji, label, value, onEdit }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span aria-hidden="true" className="text-[18px] leading-none">{emoji ?? '•'}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold leading-snug text-ink">{label}</span>
        {value && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">{value}</span>}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold text-plum-700 transition-colors hover:bg-plum-50"
      >
        <Pencil size={11} /> Change
      </button>
    </div>
  )
}

function Total({ label, amount, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-ink-mute">{label}</span>
      <span className={`text-[11.5px] font-bold tabular-nums ${tone ?? 'text-ink-soft'}`}>
        {amount < 0 ? `−${formatINR(Math.abs(amount))}` : formatINR(amount)}
      </span>
    </div>
  )
}
