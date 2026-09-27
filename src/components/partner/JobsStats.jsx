import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, CalendarCheck, MessageSquare } from 'lucide-react'
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
    { id: 'offers', icon: Bell, label: 'New jobs', value: n.offers },
    { id: 'accepted', icon: CheckCheck, label: 'Accepted', value: n.accepted },
    { id: 'confirmed', icon: CalendarCheck, label: 'Confirmed', value: n.confirmed },
    { id: 'messages', icon: MessageSquare, label: 'Messages', value: n.messages },
  ]

  const palettes = [
    'bg-[#E6C8FF] text-[#16002E] ring-[#D4A8FF]',
    'bg-[#D4F6DF] text-[#071C12] ring-[#B9E8C9]',
    'bg-[#D5EDFF] text-[#071B45] ring-[#B8DDFF]',
    'bg-[#FFD6E4] text-[#350016] ring-[#FFBBD0]',
  ]

  return (
    <div className="-mt-5 grid grid-cols-4 gap-2 rounded-t-[28px] bg-white px-2 pb-3 pt-6 shadow-[0_-8px_28px_rgba(0,0,0,.06)] sm:gap-3 sm:px-3">
      {tiles.map((t, index) => {
        const Icon = t.icon
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen?.(t.id)}
            className={`group relative flex min-w-0 min-h-[145px] flex-col items-start justify-between overflow-hidden rounded-[22px] p-3 text-left shadow-[0_8px_20px_rgba(0,0,0,.08)] ring-1 transition active:scale-[0.985] sm:min-h-[185px] sm:rounded-[28px] sm:p-5 ${palettes[index]}`}
          >
            <span className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/25 blur-xl" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-[15px] bg-white/70 shadow-sm sm:h-16 sm:w-16 sm:rounded-[20px]">
              <Icon size={25} strokeWidth={2.2} />
            </span>
            <span className="relative mt-2 text-[31px] font-black leading-none tracking-[-0.05em] tabular-nums sm:text-[48px]">{t.value}</span>
            <span className="relative flex w-full items-end justify-between gap-1">
              <span className="min-w-0 text-[10.5px] font-black leading-[1.05] sm:text-[18px]">{t.label}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/40 sm:h-12 sm:w-12">
                <span className="text-xl leading-none sm:text-3xl">›</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
