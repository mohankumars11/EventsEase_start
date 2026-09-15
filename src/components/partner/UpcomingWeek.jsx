import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { iconForTrade } from '../vendor/TradeGrid'

/**
 * What is coming, on the screen a partner opens in the morning.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEVEN DAYS, NOT EVERYTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The Calendar tab already answers "what does my month look like". This
 * answers the different question a partner has while standing in their
 * kitchen: what have I got on, and is any of it today.
 *
 * A full list here would duplicate the Calendar badly — no month view,
 * no conflict warnings — and push the offers that expire in
 * forty-five seconds below the fold. Seven days, three rows, and a way
 * through to the rest.
 *
 * Every row goes to the job, not to a modal: from here a partner is
 * usually heading somewhere, and the next thing they want is the
 * address and the Start trip button.
 */
export default function UpcomingWeek({ onSeeAll }) {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState(null)

  const read = useCallback(async () => {
    const today = new Date()
    const end = new Date(today.getTime() + 7 * 86400000)
    const key = d => d.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('partner_jobs')
      .select('line_id, service_name, occasion_name, trade, status, event_date, time_note, area_label, guest_count, is_funded')
      .gte('event_date', key(today))
      .lte('event_date', key(end))
      .order('event_date', { ascending: true })

    setJobs((data ?? []).filter(j => !['cancelled', 'expired'].includes(j.status)))
  }, [])

  useEffect(() => { read() }, [read])

  /* Nothing at all rather than an empty-state card. A partner with no
     bookings this week already knows; a box telling them so takes the
     space where an offer should appear. */
  if (!jobs?.length) return null

  const dayLabel = iso => {
    const d = new Date(`${iso}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.round((d - today) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-ink">Upcoming this week</h2>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll}
                  className="flex items-center gap-0.5 text-[12.5px] font-extrabold text-plum-700">
            Calendar <ChevronRight size={14} />
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {jobs.slice(0, 3).map(j => {
          const Icon = iconForTrade(j.trade)
          const today = dayLabel(j.event_date) === 'Today'
          return (
            <li key={j.line_id}>
              <button
                type="button"
                onClick={() => navigate(`/partner/jobs/${j.line_id}`)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ${
                  today ? 'bg-forest-50 ring-forest-200' : 'bg-white ring-ink/[0.07]'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  today ? 'bg-forest-600 text-white' : 'bg-ink/[0.05] text-ink-soft'}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold leading-tight text-ink">
                    {j.occasion_name ?? j.service_name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-ink-mute">
                    {dayLabel(j.event_date)}
                    {j.time_note ? ` · ${j.time_note}` : ''}
                    {j.area_label ? ` · ${j.area_label}` : ''}
                  </span>
                </span>
                {!j.is_funded && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-amber-800">
                    Unpaid
                  </span>
                )}
                <ChevronRight size={15} className="shrink-0 text-ink-mute" />
              </button>
            </li>
          )
        })}
      </ul>

      {jobs.length > 3 && (
        <button type="button" onClick={onSeeAll}
                className="mt-2 flex min-h-[38px] w-full items-center justify-center gap-1.5 text-[12px] font-extrabold text-ink-mute">
          <CalendarDays size={13} /> {jobs.length - 3} more this week
        </button>
      )}
    </section>
  )
}
