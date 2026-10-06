import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, CalendarCheck, MessageSquare, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'

export default function JobsStats({ vendorId, onOpen }) {
  const [n, setN] = useState({ offers: 0, accepted: 0, confirmed: 0, messages: 0 })

  const read = useCallback(async () => {
    if (!vendorId) return
    const today = new Date().toISOString().slice(0, 10)
    const [offers, jobs, msgs] = await Promise.all([
      supabase.from('partner_offer_feed')
        .select('offer_id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId).eq('status', 'OFFERED')
        .gt('expires_at', new Date().toISOString()),
      supabase.from('partner_jobs')
        .select('line_id, status, is_funded, paid_at, event_date')
        .gte('event_date', today),
      supabase.from('partner_messages')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId).eq('sender', 'operator').is('read_at', null),
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
    { id: 'offers', icon: Bell, label: 'New jobs', value: n.offers, iconTone: 'bg-amber-50 text-amber-700', valueTone: 'text-ink' },
    { id: 'accepted', icon: CheckCheck, label: 'Accepted', value: n.accepted, iconTone: 'bg-plum-50 text-plum-700', valueTone: 'text-ink' },
    { id: 'confirmed', icon: CalendarCheck, label: 'Confirmed', value: n.confirmed, iconTone: 'bg-forest-50 text-forest-700', valueTone: 'text-ink' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', value: n.messages, iconTone: 'bg-plum-50 text-plum-700', valueTone: 'text-ink' },
  ]

  return (
    <section className="partner-v2-kpi-row -mx-1 px-1 py-2">
      {tiles.map(t => {
        const Icon = t.icon
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen?.(t.id)}
            className="partner-v2-kpi flex flex-col text-left transition active:scale-[0.99]"
          >
            <span className={'flex h-8 w-8 items-center justify-center rounded-xl ' + t.iconTone}>
              <Icon size={16} strokeWidth={2.5} />
            </span>
            <span className={'mt-2 text-[22px] font-black leading-none tracking-[-0.05em] ' + t.valueTone}>{t.value}</span>
            <span className="mt-1 flex min-w-0 items-center gap-1 text-[10px] font-extrabold text-ink-mute">
              <span className="truncate">{t.label}</span><ChevronRight size={12} className="shrink-0" />
            </span>
          </button>
        )
      })}
    </section>
  )
}
