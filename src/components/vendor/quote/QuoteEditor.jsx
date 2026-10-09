/**
 * A custom quote the partner finishes rather than writes.
 *
 * The server pre-fills every line it could price from the partner's own
 * published rates; lines it could not price arrive flagged and empty.
 * The partner fills the flagged ones, may adjust or add, and sends. The
 * countdown is drawn from the server's expires_at and never restarts.
 * Totals are integer paise; the fee is the same 8% as instant bookings.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Timer, Plus, TriangleAlert, Trash2, MapPin, Users, Languages, CalendarDays } from 'lucide-react'
import { rupees, FEE_RATE } from '../../../lib/tierPackages'

const left = ms => {
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1e3)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function quoteTotals(lines, advancePct, discountPaise = 0) {
  const partner = lines.reduce((t, l) => t + (l.charged === false ? 0 : (Number(l.qty) || 0) * (Number(l.unit_paise) || 0)), 0) - discountPaise
  const customer = Math.round(partner / (1 - FEE_RATE) / 10) * 10
  const advance = Math.round(customer * advancePct / 100 / 10) * 10
  return { partner, fee: customer - partner, customer, advance, balance: customer - advance }
}

export default function QuoteEditor({ request, lines: lines0, expiresAt, advancePct = 30, now: now0, onSend, onReject, onAsk }) {
  const [lines, setLines] = useState(lines0)
  const [now, setNow] = useState(now0 ?? Date.now())
  useEffect(() => { if (now0) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [now0])
  const ms = new Date(expiresAt).getTime() - now
  const t = quoteTotals(lines, advancePct)
  const missing = lines.filter(l => l.needs && !(Number(l.unit_paise) > 0)).length
  const put = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 ${ms < 3.6e6 ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-plum-50 ring-1 ring-plum-100'}`}>
        <Timer size={16} className={ms < 3.6e6 ? 'text-rose-600' : 'text-plum-700'} />
        <span className="flex-1 text-[12.5px] font-bold text-ink/70">Time allowed to respond</span>
        <span className={`font-mono text-[15px] font-extrabold ${ms < 3.6e6 ? 'text-rose-700' : 'text-plum-800'}`}>{left(ms)}</span>
      </div>

      <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[16px] font-extrabold text-ink">{request.title}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-ink/65">
          <span className="flex items-center gap-1.5"><CalendarDays size={13} />{request.dates}</span>
          <span className="flex items-center gap-1.5"><MapPin size={13} />{request.venue}</span>
          <span className="flex items-center gap-1.5"><Users size={13} />{request.guests} guests</span>
          <span className="flex items-center gap-1.5"><Languages size={13} />{request.languages}</span>
        </div>
        <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[11.5px] font-bold text-amber-900">Why a quote: {request.reason}</p>
      </div>

      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.07]">
        <AnimatePresence initial={false}>
          {lines.map((l, i) => (
            <motion.div key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
              className={`border-b border-ink/[0.05] px-4 py-3 last:border-0 ${l.needs && !(l.unit_paise > 0) ? 'bg-amber-50/60' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[13.5px] font-bold text-ink">{l.description}</span>
                {l.auto && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-extrabold text-forest-700">From your rates</span>}
                {l.needs && !(l.unit_paise > 0) && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800"><TriangleAlert size={10} />Needs you</span>}
                {!l.auto && <button type="button" aria-label="Remove line" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-ink/30"><Trash2 size={14} /></button>}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[12.5px]">
                <span className="text-ink/45">{l.qty} × {l.unit}</span>
                <input inputMode="numeric" value={l.unit_paise ? Math.round(l.unit_paise / 100) : ''} placeholder="₹ amount"
                  onChange={e => put(i, { unit_paise: Number(e.target.value.replace(/\D/g, '')) * 100 })}
                  className="ml-auto h-9 w-[110px] rounded-xl bg-[#f6f4fb] px-2.5 text-right text-[13px] font-extrabold outline-none ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-plum-500" />
                <span className="w-[76px] text-right font-extrabold text-ink">{rupees((Number(l.qty) || 0) * (l.unit_paise || 0))}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <button type="button" onClick={() => setLines(ls => [...ls, { id: `new-${ls.length}`, description: 'New item', qty: 1, unit: 'item', unit_paise: 0 }])}
          className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] font-extrabold text-plum-700"><Plus size={15} /> Add a line</button>
      </div>

      <div className="rounded-[22px] bg-gradient-to-br from-plum-800 to-plum-950 p-4 text-white">
        {[['You receive', t.partner], ['Sambramo platform fee', t.fee]].map(([k, v]) => (
          <div key={k} className="flex justify-between py-0.5 text-[12.5px] text-plum-100"><span>{k}</span><span className="font-bold">{rupees(v)}</span></div>
        ))}
        <div className="mt-1.5 flex items-baseline justify-between border-t border-white/15 pt-2">
          <span className="text-[13px] font-bold">Customer pays</span><span className="text-[22px] font-extrabold">{rupees(t.customer)}</span>
        </div>
        <p className="mt-1 text-right text-[11.5px] text-plum-200">{advancePct}% advance {rupees(t.advance)} · balance {rupees(t.balance)}</p>
      </div>

      <div className={`grid gap-2 ${onAsk ? 'grid-cols-[1fr_1fr_1.6fr]' : 'grid-cols-[1fr_1.8fr]'}`}>
        {onReject && <button type="button" onClick={onReject} className="h-12 rounded-full text-[13px] font-extrabold text-rose-700 ring-1 ring-rose-200">Reject</button>}
        {onAsk && <button type="button" onClick={onAsk} className="h-12 rounded-full text-[13px] font-extrabold text-plum-700 ring-1 ring-plum-200">Ask</button>}
        <button type="button" disabled={missing > 0 || ms <= 0} onClick={() => onSend?.(lines, t)}
          className="h-12 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[13.5px] font-extrabold text-white disabled:from-ink/20 disabled:to-ink/20">
          {missing > 0 ? `Fill ${missing} more` : 'Send quote →'}
        </button>
      </div>
    </div>
  )
}
