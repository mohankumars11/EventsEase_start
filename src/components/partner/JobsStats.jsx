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
    <div className="mx-0 bg-white px-5 pb-7 pt-2 sm:px-6">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {tiles.map((t, index) => {
          const Icon = t.icon
          const palettes = [
            'bg-[#E8CCFF] text-[#16002E] ring-[#D4A8FF]',
            'bg-[#D8F6E2] text-[#071C12] ring-[#B9E8C9]',
            'bg-[#D8EEFF] text-[#071B45] ring-[#B8DDFF]',
            'bg-[#FFD9E7] text-[#350016] ring-[#FFBBD0]',
          ]
          const iconTones = [
            'bg-[#F7EFFF] text-[#16002E]',
            'bg-[#F2FFF6] text-[#071C12]',
            'bg-[#F2F9FF] text-[#071B45]',
            'bg-[#FFF2F7] text-[#350016]',
          ]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen?.(t.id)}
              className={`group relative flex h-[164px] min-w-0 flex-col overflow-hidden rounded-[20px] p-3.5 text-left shadow-[0_6px_16px_rgba(0,0,0,.08)] ring-1 transition active:scale-[0.99] sm:h-[185px] sm:rounded-[26px] sm:p-5 ${palettes[index]}`}
            >
              <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/25 blur-xl" />
              <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] shadow-sm sm:h-14 sm:w-14 sm:rounded-[18px] ${iconTones[index]}`}>
                <Icon size={25} strokeWidth={2.4} />
              </span>

              <span className="relative mt-auto text-[34px] font-black leading-none tracking-[-0.06em] tabular-nums sm:text-[46px]">
                {t.value}
              </span>

              <span className="relative mt-1 min-w-0 pr-10 text-[14px] font-black leading-tight sm:pr-12 sm:text-[18px]">
                {t.label}
              </span>
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/45 sm:bottom-4 sm:right-4 sm:h-11 sm:w-11">
                <span className="text-[25px] leading-none sm:text-3xl">›</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
