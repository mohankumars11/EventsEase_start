/**
 * Can this partner be booked and paid instantly — as the SERVER sees it.
 *
 * Every row comes from anchor_readiness(vendor_id); the partner cannot
 * tick anything here. Each failing row says what to do next and opens it.
 */
import { motion } from 'motion/react'
import { Check, X, Loader2, ChevronRight, Zap, MessageSquareQuote } from 'lucide-react'

const LOOK = {
  pass: ['bg-forest-600 text-white', Check],
  fail: ['bg-rose-100 text-rose-700', X],
  pending: ['bg-amber-100 text-amber-800', Loader2],
}

export default function ReadinessChecklist({ state, items, quotesOk, onOpen }) {
  const ready = state === 'READY_FOR_INSTANT_BOOKING'
  const done = items.filter(i => i.status === 'pass').length
  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.07]">
      <div className={`p-4 ${ready ? 'bg-gradient-to-br from-forest-600 to-emerald-500 text-white' : 'bg-gradient-to-br from-plum-50 to-white'}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-80"><Zap size={13} /> Instant Book & Pay</p>
        <p className={`mt-1.5 text-[16px] font-extrabold ${ready ? '' : 'text-ink'}`}>
          {ready ? 'Your profile is ready for Instant Book & Pay' : 'Complete these items before enabling Instant Book & Pay'}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
          <motion.div className={`h-full rounded-full ${ready ? 'bg-white' : 'bg-forest-500'}`} initial={{ width: 0 }} animate={{ width: `${(done / items.length) * 100}%` }} />
        </div>
        <p className={`mt-1.5 text-[11.5px] font-bold ${ready ? 'text-white/85' : 'text-ink/50'}`}>{done} of {items.length} complete</p>
      </div>
      {items.map(i => {
        const [cls, Icon] = LOOK[i.status]
        return (
          <button key={i.id} type="button" disabled={i.status === 'pass'} onClick={() => onOpen?.(i.id)}
            className="flex w-full items-center gap-3 border-t border-ink/[0.05] px-4 py-3 text-left">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon size={14} strokeWidth={3} /></span>
            <span className="flex-1">
              <span className="block text-[13.5px] font-extrabold text-ink">{i.label}</span>
              {i.status !== 'pass' && <span className="block text-[11.5px] leading-snug text-ink/55">{i.next}</span>}
            </span>
            {i.status !== 'pass' && <ChevronRight size={17} className="text-ink/30" />}
          </button>
        )
      })}
      <div className="flex items-center gap-2 border-t border-ink/[0.05] bg-[#faf9fd] px-4 py-3">
        <MessageSquareQuote size={15} className={quotesOk ? 'text-forest-600' : 'text-ink/35'} />
        <span className="text-[12px] font-bold text-ink/65">{quotesOk ? 'You can already receive Custom Quote requests.' : 'Custom Quotes open once your profile is approved.'}</span>
      </div>
    </div>
  )
}
