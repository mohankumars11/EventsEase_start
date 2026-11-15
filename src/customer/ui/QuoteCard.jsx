/**
 * One service's quotation, set like a real one (Mohan, 2026-11-13:
 * "prepare that quotation like a real quotation bill … like a real
 * platform application"): a numbered document with the event on it, an
 * itemised body — the level, every choice with its quantity, every
 * add-on — an estimated total from the masters really listed near the
 * event (lib/prefPrice), and the terms in three plain lines.
 *
 * The number is honest: an ESTIMATE, cheapest to median of the masters
 * who fit exactly this. The exact figure is each master's own reply on
 * the live checkout, and nothing is paid until one is accepted.
 */
import { useEffect, useState } from 'react'
import { BadgeCheck, FileText, Loader2, Lock, MapPin, Paperclip, Pencil, PenLine, ShieldCheck } from 'lucide-react'
import { serviceArt } from '../data/art'
import { TRADE } from '../data/trades'
import { estimateFor, rangeText, rupees } from '../lib/prefPrice'
import { dayLabel, timeLabel } from '../lib/format'
import { ArtFill } from './art'
import { peopleLine } from '../data/occasionProfile'

/* A stable quotation number for this service on this event. */
export function quoteNo(o, t, ev) {
  const s = `${o?.id}|${t}|${ev?.date}|${ev?.time}`
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return `SBM-Q-${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`
}

export default function QuoteCard({ o, t, lines, needs, ev, place, onEdit = null, onNote = null }) {
  const [e, setE] = useState(null)
  const key = JSON.stringify([t, needs, ev.guests, ev.hours, place?.lat])
  useEffect(() => {
    let live = true
    setE(null)
    estimateFor(t, needs, ev, place).then(r => { if (live) setE(r) }, () => { if (live) setE({ low: null, high: null, n: 0, near: 0, extras: [] }) })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const label = TRADE[t]?.label ?? t
  const range = rangeText(e)
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const level = lines.find(l => l.label === 'Level')
  const body = lines.filter(l => l !== level)
  return (
    <article className="cx-slide-in overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EEE8F8,0_24px_46px_-30px_rgba(58,18,144,.7)]" data-quote-card={t}>
      {/* Letterhead: the service, the number, the date. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2A124F] via-[#4C1D95] to-[#6D28D9] p-4 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-3">
          <ArtFill art={serviceArt(t)} tone="#FFFFFF" className="h-14 w-14 shrink-0 rounded-[16px]" inset="10%" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#F4D99A]"><FileText size={12} />Quotation</span>
            <span className="mt-0.5 block text-[19px] font-black leading-tight tracking-[-0.02em]">{label}</span>
            <span className="block text-[11.5px] font-semibold text-white/80">for your {o.name.toLowerCase()} · {peopleLine(o, ev)}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="cx-num block text-[11px] font-black tracking-[0.06em] text-white/90" data-quote-no>{quoteNo(o, t, ev)}</span>
            <span className="block text-[10px] font-semibold text-white/65">{today}</span>
            {onEdit && <button type="button" onClick={onEdit} className="cx-press mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#4C1D95]" data-quote-edit><Pencil size={11} />Edit choices</button>}
          </span>
        </div>
        <dl className="relative mt-3 grid grid-cols-3 gap-2 rounded-[14px] bg-white/10 px-3 py-2 text-[11px]">
          <div><dt className="font-bold text-white/60">Event</dt><dd className="truncate font-extrabold">{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</dd></div>
          <div><dt className="font-bold text-white/60">Where</dt><dd className="truncate font-extrabold">{place?.area ?? 'Your place'}</dd></div>
          <div><dt className="font-bold text-white/60">Prepared by</dt><dd className="truncate font-extrabold">Sambramo</dd></div>
        </dl>
      </div>

      {/* The itemised body. */}
      <div className="px-4 pt-3" data-quote-lines>
        <div className="flex items-center justify-between border-b-2 border-[#1C1033] pb-1.5 text-[10.5px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
          <span>Item</span><span>Your choice</span>
        </div>
        <ol className="divide-y divide-dashed divide-[#E9E3F2]">
          <li className="flex items-start justify-between gap-3 py-2.5">
            <span className="min-w-0"><span className="block text-[13px] font-extrabold text-[#1C1033]">{label}{level?.value ? ` · ${level.value}` : ''}</span><span className="block text-[11px] font-semibold text-[var(--ink-3)]">{needs.$hours && e?.hours ? `${e.hours} hours` : 'As the master packages it'}{e?.guests ? ` · ${peopleLine(o, { ...ev, guests: e.guests })}` : ''}</span></span>
            <span className="cx-num shrink-0 text-right text-[12.5px] font-extrabold text-[#1C1033]">{e ? (range ? 'Base' : 'On request') : '…'}</span>
          </li>
          {body.map(l => (
            <li key={l.label} className="flex items-start justify-between gap-3 py-2.5" data-quote-line={l.label}>
              <span className="min-w-0"><span className="block text-[12px] font-bold text-[var(--ink-3)]">{l.label}</span><span className="block text-[13px] font-extrabold leading-snug text-[#1C1033]">{l.value}</span></span>
              <span className="flex shrink-0 items-center gap-2">
                {l.qty != null && <span className="cx-num text-right text-[12px] font-extrabold text-[#5B21B6]">× {Number(l.qty).toLocaleString('en-IN')}{l.unit ? ` ${l.unit}` : ''}</span>}
                {onEdit && <button type="button" onClick={() => onEdit(l.label)} aria-label={`Edit ${l.label}`} className="cx-press grid h-7 w-7 place-items-center rounded-full bg-[#F4EEFF] text-[#5B21B6]" data-quote-line-edit={l.label}><Pencil size={12} /></button>}
              </span>
            </li>
          ))}
          {e?.extras?.map(x => (
            <li key={x.id} className="flex items-start justify-between gap-3 py-2.5" data-quote-extra>
              <span className="min-w-0"><span className="block text-[12px] font-bold text-[var(--ink-3)]">Add-on</span><span className="block text-[13px] font-extrabold text-[#1C1033]">{x.label ?? x.id}</span></span>
              <span className="cx-num shrink-0 text-right text-[12.5px] font-extrabold text-[#1C1033]">{x.paise ? `~${rupees(x.paise)}` : 'Master prices'}</span>
            </li>
          ))}
          {!body.length && !level && <li className="py-3 text-[12.5px] font-semibold text-[var(--ink-3)]">No preferences yet — masters quote their standard package.</li>}
        </ol>
      </div>

      {/* The total. */}
      <div className="mx-4 mt-2 rounded-[18px] bg-[#FFFAEB] p-3 shadow-[inset_0_0_0_1px_#FBE7B5]" data-quote-estimate>
        <div className="flex items-end justify-between gap-2">
          <span>
            <span className="block text-[10.5px] font-black uppercase tracking-[0.14em] text-[#8A6A2A]">Estimated total</span>
            <span className="cx-num block text-[24px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">
              {!e ? <span className="flex items-center gap-2 text-[14px] font-bold text-[#8A6A2A]"><Loader2 size={14} className="animate-spin" />Reading live prices…</span> : range ?? 'Priced on request'}
            </span>
          </span>
          {e && e.n > 0 && <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#0B7A45] shadow-[0_0_0_1px_#DCEFE2]"><span className="cx-live-dot h-2 w-2 rounded-full bg-[#16A34A]" />{e.n} masters priced</span>}
        </div>
        {e && <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#8A6A2A]"><MapPin size={11} />{e.near} masters near {place?.area ?? 'you'} · cheapest to typical for exactly this</p>}
      </div>

      {/* What travels with the quotation, and anything the master must know (Mohan, 2026-11-14: "every specific detail, editable"). */}
      <div className="mx-4 mt-2.5 space-y-2" data-quote-extras>
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[var(--ink-3)]">
          <Paperclip size={12} className="shrink-0" />Goes with it:
          <span className="rounded-full bg-[#F4F1F8] px-2 py-0.5 text-[#2E1A4F]">{dayLabel(ev.date)}{ev.time ? ` · ${timeLabel(ev.time)}` : ''}</span>
          <span className="rounded-full bg-[#F4F1F8] px-2 py-0.5 text-[#2E1A4F]">{peopleLine(o, ev)}</span>
          <span className="rounded-full bg-[#F4F1F8] px-2 py-0.5 text-[#2E1A4F]">{place?.area ?? 'your place'}</span>
          {needs.$studio && <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[#8A4B08]">Menu card · {needs.$studio.sections?.reduce((n, s) => n + s.items.length, 0)} dishes</span>}
          {needs.$refs?.length > 0 && <span className="rounded-full bg-[#F4F1F8] px-2 py-0.5 text-[#2E1A4F]">{needs.$refs.length} reference {needs.$refs.length === 1 ? 'photo' : 'photos'}</span>}
        </p>
        {onNote && (
          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-black text-[#1C1033]"><PenLine size={13} className="text-[#7C3AED]" />Anything the master must know <span className="font-bold text-[var(--ink-3)]">optional</span></span>
            <textarea value={needs.$instructions ?? ''} onChange={e => onNote(e.target.value.slice(0, 600))} rows={2} placeholder="A theme, a timing, an elderly guest, a surprise — it goes with the quotation" data-quote-note
              className="mt-1.5 w-full rounded-[14px] bg-[#FAF8FD] p-3 text-[13px] font-semibold shadow-[inset_0_0_0_1.5px_#EEE9F5] outline-none focus:shadow-[inset_0_0_0_2px_#7C3AED]" />
          </label>
        )}
      </div>

      {/* Terms — three lines, plain. */}
      <ul className="space-y-1.5 px-4 pb-4 pt-3 text-[11px] font-semibold leading-snug text-[var(--ink-2)]" data-quote-terms>
        <li className="flex items-start gap-1.5"><BadgeCheck size={13} className="mt-px shrink-0 text-[#7C3AED]" />The master you choose confirms an exact price for your date; it replaces this estimate on your checkout.</li>
        <li className="flex items-start gap-1.5"><Lock size={13} className="mt-px shrink-0 text-[#7C3AED]" />Nothing is paid now. You pay only after a master accepts, and the money is held until the event is delivered.</li>
        <li className="flex items-start gap-1.5"><ShieldCheck size={13} className="mt-px shrink-0 text-[#7C3AED]" />Every master is verified by Sambramo. Your number is shared only after you pay.</li>
      </ul>
    </article>
  )
}
