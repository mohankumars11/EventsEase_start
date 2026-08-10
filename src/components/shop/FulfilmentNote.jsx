import { BadgeCheck } from 'lucide-react'
import { FULFILMENT } from '../../config/shop'

// "Delivered by Sambramo, on behalf of our partner bakers."
//
// This is the same claim in three sizes rather than three separately-written
// claims, because it appears at every point where the customer is deciding
// whether to trust the order — the shop header, the product page, the
// customiser footer, the cart, the confirmation — and the wording drifting
// between them is what turns a promise into marketing.
//
// It sits alongside ImageSourceBadge and answers the neighbouring question.
// That badge says what the *photo* is; this says who is responsible for the
// *box*. Both exist because Sambramo is pre-launch and sources per order, so
// neither answer is obvious from the page.
//
//   chip    one line, for a card or a filter bar
//   inline  one line with the icon, for a product page or a cart summary
//   card    the full explanation, where someone is about to pay
export default function FulfilmentNote({ variant = 'inline', className = '' }) {
  if (variant === 'chip') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold text-plum-700 bg-plum-50 border border-plum-100 rounded-full px-2 py-0.5 ${className}`}>
        <BadgeCheck size={11} /> {FULFILMENT.short}
      </span>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`flex items-start gap-3 rounded-2xl border border-plum-100 bg-plum-50/60 p-4 ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
          <BadgeCheck size={18} className="text-plum-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-plum-900">{FULFILMENT.line}</p>
          <p className="text-xs text-plum-700/80 mt-1 leading-relaxed">{FULFILMENT.detail}</p>
        </div>
      </div>
    )
  }

  return (
    <p className={`flex items-center gap-1.5 text-xs text-gray-500 ${className}`}>
      <BadgeCheck size={13} className="text-plum-500 shrink-0" />
      {FULFILMENT.line}
    </p>
  )
}
