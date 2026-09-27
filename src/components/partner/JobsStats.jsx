import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, CalendarCheck, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'

/**
 * Four numbers across the top of the operations home.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY ONE OF THEM IS A COUNT OF ROWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design shows 6 / 2 / 1 / 4. Those are placeholders, and
 * the temptation with a tile row is to keep the shape and fill it with
 * whatever is nearest to hand. A dashboard number that nobody can trace
 * to a row is worse than an empty space, because a partner who taps
 * "1 Confirmed" and finds two bookings stops believing the other three.
 *
 * So:
 *
 *   New jobs    offers open right now — OFFERED and not yet expired
 *   Accepted    won, waiting on the customer to pay
 *   Confirmed   funded, still ahead of them
 *   Messages    replies from Sambramo they have not read
 *
 * "Responded" from the design is not here. It counts a thing that has
 * already happened and needs nothing done about it, and a tile that
 * never asks anything of anybody is a tile occupying a quarter of the
 * most valuable strip in the app. Accepted-awaiting-payment does need
 * watching, so it takes the slot.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A ZERO IS SHOWN, NOT HIDDEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Unlike the attention rows below, which vanish at zero because they are
 * a to-do list. This is a scoreboard: four tiles that rearrange
 * themselves as counts change would be unreadable, and "0 new jobs" is
 * an answer a partner opens the app to get.
 */
export default function JobsStats({ vendorId, onOpen }) {
  const [n, setN] = useState({ offers: 0, accepted: 0, confirmed: 0, messages: 0 })

  const read = useCallback(async () => {
    if (!vendorId) return
    const today = new Date().toISOString().slice(0, 10)

    /* head:true with count:'exact' asks the server for the number and
       sends back no rows at all — four counts for roughly the bytes of
       one, on a screen that polls. */
    const [offers, jobs, msgs] = await Promise.all([
      supabase.from('partner_offer_feed')
        .select('offer_id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId).eq('status', 'OFFERED')
        .gt('expires_at', new Date().toISOString()),
      supabase.from('partner_jobs')
        .select('line_id, status, is_funded, paid_at, event_date')
        .gte('event_date', today),
      /* Absent until 125 is applied, which is why this one is allowed to
         fail quietly rather than blanking the row. */
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
    { id: 'offers',    icon: Bell,          label: 'New jobs',  value: n.offers,
      tone: n.offers ? 'bg-saffron-400/15 text-saffron-800' : 'bg-ink/[0.04] text-ink-mute' },
    { id: 'accepted',  icon: CheckCheck,    label: 'Accepted',  value: n.accepted,
      tone: 'bg-plum-50 text-plum-700' },
    { id: 'confirmed', icon: CalendarCheck, label: 'Confirmed', value: n.confirmed,
      tone: 'bg-forest-50 text-forest-700' },
    { id: 'messages',  icon: MessageSquare, label: 'Messages',  value: n.messages,
      tone: n.messages ? 'bg-plum-50 text-plum-700' : 'bg-ink/[0.04] text-ink-mute' },
  ]

  return (
    <div className="-mt-5 grid grid-cols-4 gap-2 rounded-t-[28px] bg-white px-2 pt-5 pb-2 shadow-[0_-8px_28px_rgba(0,0,0,.06)] sm:gap-3 sm:px-3">
      {tiles.map((t, index) => {
        const Icon = t.icon
        const palette = [
          'bg-[#E7C8FF] text-[#090014] ring-[#D6A8FF]',
          'bg-[#D2F7DF] text-[#090014] ring-[#B9EBCB]',
          'bg-[#D4EDFF] text-[#0B1D4D] ring-[#B7DEFF]',
          'bg-[#FFD4E2] text-[#360014] ring-[#FFB8CE]',
        ][index]
        return (
          <button key={t.id} type="button" onClick={() => onOpen?.(t.id)} className={`group relative flex min-h-[132px] min-w-0 flex-col items-start justify-between overflow-hidden rounded-[22px] p-3 text-left shadow-[0_8px_20px_rgba(0,0,0,.08)] ring-1 transition active:scale-[0.985] sm:min-h-[185px] sm:rounded-[28px] sm:p-5 ${palette}`}>
            <span className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-[15px] bg-white/70 text-current shadow-sm sm:h-16 sm:w-16 sm:rounded-[20px]"><Icon size={26} strokeWidth={2.2} className="sm:h-9 sm:w-9" /></span>
            <span className="relative mt-2 text-[31px] font-black leading-none tracking-[-0.05em] tabular-nums text-current sm:text-[48px]">{t.value}</span>
            <span className="relative flex w-full items-end justify-between gap-1"><span className="min-w-0 text-[10.5px] font-black leading-[1.05] tracking-[-0.02em] sm:text-[19px]">{t.label}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/35 text-current sm:h-12 sm:w-12"><span className="text-xl leading-none sm:text-3xl">›</span></span></span>
          </button>
        )
      })}
    </div>
  )
}
