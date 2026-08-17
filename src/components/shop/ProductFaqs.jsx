import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * The questions, answered on the page instead of on the phone.
 *
 * The list arrives already resolved by `fetchFaqs` — this product's own
 * answers first, then its shelf's, then the shop's. That order is the point:
 * somebody scanning for "is this eggless" should meet the answer about this
 * cake before the answer about delivery in general.
 *
 * The first one opens by default. An accordion where everything is shut reads
 * as an empty section, and the whole reason for writing these is that somebody
 * reads one without being asked to.
 */
export default function ProductFaqs({ faqs = [] }) {
  const [open, setOpen] = useState(0)

  if (!faqs.length) return null

  return (
    <section className="shop-card overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-extrabold text-plum-950">Questions people ask</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {faqs.map((f, i) => {
          const isOpen = open === i
          return (
            <div key={f.id ?? i}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="flex-1 text-sm font-bold text-gray-800">{f.question}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">{f.answer}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
