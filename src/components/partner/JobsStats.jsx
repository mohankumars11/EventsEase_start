import { useCallback, useEffect, useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardCheck,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'

/**
 * Compact Jobs-tab action cards.
 *
 * Counts and click destinations are unchanged. This is presentation only:
 * each destination is now a clearly tappable, compact card with a familiar
 * icon, strong label and restrained colour system.
 */
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
    {
      id: 'offers',
      icon: BriefcaseBusiness,
      label: 'New jobs',
      value: n.offers,
      iconTone: 'bg-violet-100 text-violet-700',
      cardTone: 'border-violet-100 bg-violet-50/70',
      accent: 'bg-violet-600',
    },
    {
      id: 'accepted',
      icon: ClipboardCheck,
      label: 'Accepted',
      value: n.accepted,
      iconTone: 'bg-emerald-100 text-emerald-700',
      cardTone: 'border-emerald-100 bg-emerald-50/70',
      accent: 'bg-emerald-600',
    },
    {
      id: 'confirmed',
      icon: CalendarCheck2,
      label: 'Confirmed',
      value: n.confirmed,
      iconTone: 'bg-sky-100 text-sky-700',
      cardTone: 'border-sky-100 bg-sky-50/70',
      accent: 'bg-sky-600',
    },
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'Messages',
      value: n.messages,
      iconTone: 'bg-fuchsia-100 text-fuchsia-700',
      cardTone: 'border-fuchsia-100 bg-fuchsia-50/70',
      accent: 'bg-fuchsia-600',
    },
  ]

  return (
    <section aria-label="Jobs overview" className="-mt-4 grid grid-cols-2 gap-2.5 rounded-[24px] bg-white p-2.5 shadow-[0_8px_26px_rgba(42,8,92,0.08)] xs:grid-cols-4">
      {tiles.map(t => {
        const Icon = t.icon
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen?.(t.id)}
            aria-label={`${t.label}: ${t.value}`}
            className={`group relative min-w-0 overflow-hidden rounded-[18px] border px-3 py-3 text-left transition duration-150 active:scale-[0.98] active:shadow-inner ${t.cardTone}`}
          >
            <span className={`absolute left-0 top-0 h-1 w-full ${t.accent}`} aria-hidden="true" />

            <span className="flex items-start justify-between gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.iconTone}`}>
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-600 ring-1 ring-black/[0.04] transition-transform group-hover:translate-x-0.5">
                <ChevronRight size={15} strokeWidth={2.5} />
              </span>
            </span>

            <span className="mt-3 block text-[22px] font-black leading-none tracking-tight text-[#21113d] tabular-nums">
              {t.value}
            </span>
            <span className="mt-1 block truncate text-[11.5px] font-extrabold text-slate-700">
              {t.label}
            </span>
            <span className="mt-1 block text-[9px] font-semibold text-slate-500">
              Tap to open
            </span>
          </button>
        )
      })}
    </section>
  )
}
