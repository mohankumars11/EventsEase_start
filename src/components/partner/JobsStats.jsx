import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, CalendarCheck, MessageSquare, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'

/** Compact live counts for the Partner Jobs home; zeroes remain visible. */
export default function JobsStats({ vendorId, onOpen }) {
  const [n, setN] = useState({ offers: 0, accepted: 0, confirmed: 0, messages: 0 })
  const read = useCallback(async () => {
    if (!vendorId) return
    const today = new Date().toISOString().slice(0, 10)
    const [offers, jobs, msgs] = await Promise.all([
      supabase.from('partner_offer_feed').select('offer_id', { count: 'exact', head: true }).eq('vendor_id', vendorId).eq('status', 'OFFERED').gt('expires_at', new Date().toISOString()),
      supabase.from('partner_jobs').select('line_id, status, is_funded, paid_at, event_date').gte('event_date', today),
      supabase.from('partner_messages').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId).eq('sender', 'operator').is('read_at', null),
    ])
    const live = (jobs.data ?? []).filter(j => !['cancelled', 'expired'].includes(j.status))
    setN({
      offers: offers.count ?? 0,
      accepted: live.filter(j => !j.is_funded && !j.paid_at).length,
      confirmed: live.filter(j => j.is_funded || j.paid_at).length,
      messages: msgs.error ? 0 : (msgs.count ?? 0),
    })
  }, [vendorId])
  useEffect(() => { read() }, [read])
  useLivePoll(read, 20_000, [read])

  const tiles = [
    { id: 'offers', icon: Bell, label: 'New jobs', value: n.offers, tone: 'violet' },
    { id: 'accepted', icon: CheckCheck, label: 'Accepted', value: n.accepted, tone: 'green' },
    { id: 'confirmed', icon: CalendarCheck, label: 'Confirmed', value: n.confirmed, tone: 'blue' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', value: n.messages, tone: 'rose' },
  ]
  const styles = {
    violet: { card: 'border-violet-200', icon: 'bg-violet-50 text-violet-700' },
    green: { card: 'border-emerald-200', icon: 'bg-emerald-50 text-emerald-700' },
    blue: { card: 'border-sky-200', icon: 'bg-sky-50 text-sky-700' },
    rose: { card: 'border-rose-200', icon: 'bg-rose-50 text-rose-700' },
  }

  return (
    <section aria-label="Job activity" className="bg-white pb-3 pt-1">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {tiles.map(t => {
          const Icon = t.icon
          const palette = styles[t.tone]
          return (
            <button key={t.id} type="button" onClick={() => onOpen?.(t.id)} aria-label={`${t.value} ${t.label}`}
              className={`group relative flex h-[70px] min-w-0 flex-col justify-between overflow-hidden rounded-[15px] border bg-white p-1.5 text-left shadow-[0_2px_8px_rgba(25,15,50,.035)] transition active:scale-[0.98] sm:h-[76px] sm:rounded-[17px] sm:p-2 ${palette.card}`}>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${palette.icon}`}><Icon size={16} strokeWidth={2.25} /></span>
                <span className="text-[22px] font-black leading-none tracking-[-0.045em] tabular-nums text-[#17152B] sm:text-[24px]">{t.value}</span>
              </span>
              <span className="flex min-w-0 items-center justify-between gap-0.5 pl-0.5">
                <span className="truncate text-[9.5px] font-bold leading-tight text-[#39354D] sm:text-[11px]">{t.label}</span>
                <ChevronRight size={13} className="shrink-0 text-[#817A98]" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
