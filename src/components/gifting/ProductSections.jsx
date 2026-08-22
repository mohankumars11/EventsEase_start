import { useState } from 'react'
import { ChevronDown, Plus, Check, ShieldAlert } from 'lucide-react'
import RemoteImage from '../common/RemoteImage'
import { formatINR } from '../../utils/format'

/**
 * The blocks below the fold on a product page.
 *
 * ── Accordions, and why they are open by default ─────────────────────────
 * Description opens on load; the rest are shut. A page that starts fully
 * collapsed hides the fact that there IS anything to read — which is exactly
 * how a "Delivery Info" panel that answers the customer's actual question
 * goes unread and turns into a support call. One open section teaches the
 * pattern; the remaining headers then read as more of the same rather than as
 * decoration.
 */
export function Accordion({ title, icon: Icon, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-hairline/[0.08]">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 py-3.5 text-left"
      >
        {Icon && <Icon size={15} className="shrink-0 text-forest-700" />}
        <span className="flex-1 text-[13.5px] font-extrabold text-ink">{title}</span>
        {badge && (
          <span className="rounded bg-forest-50 px-1.5 py-0.5 text-[10px] font-extrabold text-forest-700">
            {badge}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-mute transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </section>
  )
}

/** A bullet list in the page's reading voice. */
export function CopyList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
          <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-forest-600" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

/** The label/value table built by `productCopy`. */
export function SpecTable({ rows }) {
  if (!rows?.length) return null
  return (
    <dl className="divide-y divide-hairline/[0.07] overflow-hidden rounded-xl border border-hairline/[0.09]">
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[minmax(88px,34%)_1fr] gap-3 px-3 py-2.5">
          <dt className="text-[11.5px] font-bold text-ink-mute">{r.label}</dt>
          <dd className="text-[12px] font-semibold leading-snug text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The one limitation, stated in its own box.
 *
 * `productCopy.guard` is the thing we will not pretend about for this kind of
 * product — a perishable is not returnable, a personalised piece cannot be
 * resold. Every competitor buries these in a terms page and every one of them
 * has a review thread about it.
 *
 * Printed in amber rather than red on purpose. This is not a warning about
 * danger, it is a boundary being drawn honestly, and it is usually paired
 * with what we DO offer instead — so it should read as candour, not as a
 * refusal.
 */
export function GuardNote({ text }) {
  if (!text) return null
  return (
    <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <ShieldAlert size={15} className="mt-px shrink-0 text-amber-700" />
      <p className="text-[11.5px] leading-relaxed text-amber-900">{text}</p>
    </div>
  )
}

/**
 * "Add something small" — the companion shelf.
 *
 * ── Deliberately NOT an interstitial ─────────────────────────────────────
 * The pattern this replaces is a modal that throws itself in front of the
 * customer between "Add to cart" and the cart, with a tab bar of upsells and
 * a "Skip & continue" link at the bottom. It converts, and it is the single
 * most complained-about screen in this category, because it is a toll gate:
 * the customer has decided, and the shop is standing in the doorway.
 *
 * This is the same merchandise, inline, above the fold-line of the cart, with
 * nothing to dismiss. Somebody who wants a card taps the card. Somebody who
 * does not scrolls past and never knows it was there. We lose a few rupees of
 * attach rate and we do not spend the goodwill of the one moment in the whole
 * flow where the customer is happiest.
 *
 * The tabs group by what the thing IS, because "Gourmet / Flowers /
 * Keepsakes" is how somebody scanning for a small addition thinks — not by
 * price band, which is how a merchandiser thinks.
 */
export function AddOnShelf({ addOns, selected, onToggle, className = '' }) {
  const groups = ['All', ...Array.from(new Set(addOns.map(a => a.group)))]
  const [tab, setTab] = useState('All')
  const shown = tab === 'All' ? addOns : addOns.filter(a => a.group === tab)

  if (!addOns.length) return null

  return (
    <section className={className}>
      <h3 className="px-4 text-[15px] font-extrabold leading-tight text-ink">Add something small</h3>
      <p className="mt-0.5 px-4 text-[11.5px] leading-snug text-ink-mute">
        Optional, and there is no step that makes you say no to it.
      </p>

      {groups.length > 2 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setTab(g)}
              className={[
                'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors',
                tab === g
                  ? 'bg-forest-800 text-white'
                  : 'bg-surface-sunk/[0.05] text-ink-soft ring-1 ring-hairline/[0.09]',
              ].join(' ')}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {shown.map(a => {
          const on = selected.includes(a.id)
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              aria-pressed={on}
              className={[
                'relative flex w-[124px] shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-colors',
                on ? 'border-forest-700 bg-forest-50' : 'border-hairline/[0.09] bg-white',
              ].join(' ')}
            >
              <span className="relative block">
                <RemoteImage
                  src={a.image}
                  query={a.query}
                  emoji={a.emoji}
                  alt={a.name}
                  className="aspect-square w-full"
                />
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-white">
                    <Check size={12} />
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col p-2">
                <span className="line-clamp-2 text-[11px] font-bold leading-snug text-ink">{a.name}</span>
                <span className="mt-1 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-ink">
                    {a.price === 0 ? 'Free' : formatINR(a.price)}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                      on ? 'bg-forest-700 text-white' : 'bg-surface-sunk/[0.07] text-forest-700'
                    }`}
                  >
                    {on ? <Check size={11} /> : <Plus size={11} />}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
