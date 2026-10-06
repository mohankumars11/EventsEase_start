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
    <div className="bg-white pb-3 pt-2">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t, index) => {
          const Icon = t.icon
          const tones = [
            'bg-plum-50 text-plum-800 ring-plum-100',
            'bg-amber-50 text-amber-900 ring-amber-100',
            'bg-blue-50 text-blue-900 ring-blue-100',
            'bg-forest-50 text-forest-900 ring-forest-100',
          ]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen?.(t.id)}
              className={`relative flex min-h-[86px] items-center gap-3 overflow-hidden rounded-[18px] p-3.5 text-left ring-1 shadow-[0_5px_18px_rgba(42,8,92,0.05)] transition active:scale-[0.99] ${tones[index]}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-white/70">
                <Icon size={19} strokeWidth={2.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[24px] font-black leading-none tracking-[-0.04em] tabular-nums">{t.value}</span>
                <span className="mt-1 block truncate text-[11.5px] font-extrabold opacity-80">{t.label}</span>
              </span>
              <span className="ml-auto text-[20px] opacity-45" aria-hidden="true">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
