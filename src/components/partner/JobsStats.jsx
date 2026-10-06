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
    <div className="partner-content pb-1 pt-1">
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(t => {
          const Icon = t.icon
          const activeTone = t.id === 'offers' && t.value > 0
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen?.(t.id)}
              className={`partner-card min-h-[78px] p-3 text-left transition active:scale-[0.985] ${activeTone ? 'ring-2 ring-saffron-300' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${activeTone ? 'bg-saffron-100 text-saffron-800' : 'bg-plum-50 text-plum-700'}`}>
                  <Icon size={17} strokeWidth={2.4} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[22px] font-black leading-none tracking-[-0.04em] text-ink">{t.value}</span>
                  <span className="mt-1 block text-[11px] font-extrabold text-ink-mute">{t.label}</span>
                </span>
                <span className="ml-auto text-[18px] font-bold text-ink-faint">›</span>
              </div>
            </button>
          )
        })}
      </div>>
    </div>
  )
}
