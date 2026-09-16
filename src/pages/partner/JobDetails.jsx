import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Utensils, Navigation,
  MessageSquare, Loader2, Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { setupSpec } from '../../data/instantSetups'
import { requirementsFor, moneyFor, contactReleased } from '../../lib/jobDetail'
import { iconForTrade } from '../../components/vendor/TradeGrid'
import JobTimeline from '../../components/partner/JobTimeline'
import LiveTracking from '../../components/partner/LiveTracking'

/**
 * One job, in full.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCREEN AND NOT A TALLER CARD
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything here used to live inside an expandable card on the Jobs
 * list. That was fine while a job was a date and a price. It stopped
 * being fine when a job acquired a timeline, a requirements list, a
 * money breakdown and a live trip: a card that expands to two thousand
 * pixels inside a scrolling list is a card nobody can navigate, and the
 * partner loses their place in the list every time they close it.
 *
 * A route also means a notification can point AT a job — "your booking
 * on the 27th moved" going somewhere specific rather than dropping
 * somebody on a list to find it themselves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PRICE IS THE WHOLE PRICE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Customer price, commission with its rate named, and what reaches the
 * account — with TCS and TDS shown, which the reference design omits.
 * They are statutory, they come out before the money lands, and a
 * partner shown a figure that does not arrive is the exact complaint
 * `instantPricing.js` exists to prevent.
 */
export default function JobDetails() {
  const { lineId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [claim, setClaim] = useState(null)
  const [payout, setPayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const read = useCallback(async () => {
    if (!lineId) return
    const { data, error } = await supabase
      .from('partner_jobs').select('*').eq('line_id', lineId).maybeSingle()

    if (error || !data) { setMissing(true); setLoading(false); return }
    setJob(data)

    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('payout_claims')
        .select('status, requested_at, settled_at').eq('line_id', lineId).maybeSingle(),
      supabase.from('vendor_payout_details')
        .select('pan').eq('vendor_id', data.vendor_id).maybeSingle(),
    ])
    setClaim(c ?? null)
    setPayout(p ?? null)
    setLoading(false)
  }, [lineId])

  useEffect(() => { read() }, [read])

  if (loading) {
    return (
      <div className="native-screen flex items-center justify-center bg-white">
        <Loader2 size={20} className="animate-spin text-ink-mute" />
      </div>
    )
  }

  if (missing || !job) {
    return (
      <div className="native-screen flex flex-col bg-white">
        <Header onBack={() => navigate(-1)} title="Job" />
        <p className="px-5 py-10 text-center text-[13.5px] text-ink-mute">
          That job is not here. It may have been cancelled, or it may belong to
          another account.
        </p>
      </div>
    )
  }

  const Icon = iconForTrade(job.trade)
  const spec = job.service_id
    ? setupSpec(job.trade === 'Catering & Food' ? 'catering' : 'decor', job.service_id)
    : null
  const reqs = requirementsFor(job, spec)
  const money = moneyFor(job, { hasPan: !!payout?.pan })
  const released = contactReleased(job)
  const r = p => formatINR(Math.round(p / 100))

  const day = job.event_date
    ? new Date(`${job.event_date}T00:00:00`).toLocaleDateString('en-IN',
        { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="native-screen flex flex-col bg-page">
      <Header onBack={() => navigate(-1)} title="Job details" />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-8">
        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-950 text-white">
              <Icon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-extrabold leading-tight text-ink">
                {job.occasion_name ?? job.service_name}
              </h1>
              <p className="mt-0.5 text-[12.5px] font-semibold text-ink-mute">{job.trade}</p>
            </div>
          </div>

          <dl className="mt-3.5 space-y-2">
            {day && <Row icon={Calendar} value={day} />}
            {job.time_note && <Row icon={Clock} value={job.time_note} />}
            <Row icon={MapPin} value={[job.area_label, job.city].filter(Boolean).join(', ') || 'Location with the customer'} />
            {job.guest_count && <Row icon={Users} value={`${job.guest_count} guests`} />}
            {job.distance_m != null && (
              <Row icon={Navigation} value={`${(job.distance_m / 1000).toFixed(1)} km from you`} />
            )}
          </dl>
        </section>

        {/* Renders nothing unless 127 is applied and the job is close
            enough for travelling to it to mean anything. */}
        {['accepted', 'paid', 'in_progress'].includes(job.status) && (
          <LiveTracking job={job} onDone={read} />
        )}

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
            Pricing
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold text-ink-mute">
            Set by Sambramo when the customer booked. It does not change.
          </p>

          <dl className="mt-3 space-y-1.5 text-[12.5px]">
            {money.itemised ? (
              <>
                <Money label="The customer paid" value={r(money.customerPaise)} />
                <Money label="Sambramo's fee"
                       note={`${Math.round(money.commissionRate * 100)}% commission`}
                       value={`− ${r(money.commissionPaise)}`} />
              </>
            ) : (
              <Money label="Your share of the job" value={r(money.sharePaise)} />
            )}
            <Money label="TCS (GST)" note="deposited for you" value={`− ${r(money.tcsPaise)}`} />
            <Money label="TDS"
                   note={money.tdsWaived ? 'waived — PAN on file' : 'deposited for you'}
                   value={money.tdsPaise ? `− ${r(money.tdsPaise)}` : r(0)} />
          </dl>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-forest-50 px-3.5 py-3 ring-1 ring-forest-200">
            <span className="text-[13px] font-extrabold text-forest-900">Reaches your account</span>
            <span className="font-serif text-[19px] font-extrabold tabular-nums text-forest-900">
              {r(money.netPaise)}
            </span>
          </div>
        </section>

        {reqs.length > 0 && (
          <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
            <p className="text-[12px] font-extrabold uppercase tracking-wider text-ink-mute">
              What the customer asked for
            </p>
            <ul className="mt-2 space-y-1.5">
              {reqs.map(q => (
                <li key={q.id} className="flex items-start gap-2 text-[13px] leading-snug text-ink-soft">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                  <span className={q.theirWords ? 'italic' : ''}>{q.text}</span>
                </li>
              ))}
            </ul>
            {job.spec_mode === 'discuss' && (
              <p className="mt-2.5 flex items-start gap-2 rounded-[14px] bg-plum-50 px-3 py-2.5 text-[11.5px] leading-snug text-plum-900">
                <Utensils size={12} className="mt-0.5 shrink-0" />
                <span>The detail — colours, exact dishes, the theme — is agreed on
                your first call with the customer. The price above is already fixed.</span>
              </p>
            )}
          </section>
        )}

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <JobTimeline job={job} claim={claim} />
        </section>

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          {released ? (
            <p className="text-[12.5px] leading-snug text-ink-soft">
              The customer&apos;s name and number are on the Jobs tab for this
              booking, released now that payment is through.
            </p>
          ) : (
            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-mute">
              <Lock size={13} className="mt-0.5 shrink-0" />
              <span>Their name and number unlock the moment payment is through.</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard/vendor?tab=account')}
            className="mt-2.5 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-white text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"
          >
            <MessageSquare size={14} /> Message Sambramo about this job
          </button>
        </section>
      </div>
    </div>
  )
}

function Header({ onBack, title }) {
  return (
    <header className="safe-top flex items-center gap-2 bg-plum-950 px-3 pb-3 pt-3 text-white">
      <button type="button" onClick={onBack} aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <ArrowLeft size={19} />
      </button>
      <h1 className="text-[16px] font-extrabold">{title}</h1>
    </header>
  )
}

function Row({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="shrink-0 text-ink-mute" />
      <span className="min-w-0 text-[13px] font-semibold text-ink-soft">{value}</span>
    </div>
  )
}

function Money({ label, note, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">
        {label}
        {note && <span className="ml-1 text-ink-mute">· {note}</span>}
      </dt>
      <dd className="shrink-0 font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  )
}
