import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays, MapPin, Phone, User, IndianRupee, Loader2, Check,
  CircleDollarSign, PartyPopper, Lock, TriangleAlert, ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

/**
 * Everything that happens after a master taps Accept.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE JOB USED TO VANISH
 * ══════════════════════════════════════════════════════════════════════
 *
 * The offer inbox lists `dispatch_offers` where status = 'OFFERED'. So
 * the instant a master accepted, the job disappeared from their screen
 * entirely — no date, no area, no customer, no way to say it was done.
 * A decorator who had just committed their Saturday had nothing on their
 * phone to show for it, which reads exactly like the tap failed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FIVE STATES, AND EACH ONE SAYS WHAT TO DO NEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 *   accepted    the customer has not paid. DO NOT buy anything yet.
 *   paid        confirmed. Here is their name and number. Call them.
 *   in_progress the day is here.
 *   delivered   done. Money moves 24 hours after the event.
 *   settled     paid out.
 *
 * The second line of each is the point. A status word on its own —
 * "accepted", "paid" — tells a master what happened and not what it
 * means for them. The costly confusion is the first one: a master who
 * buys flowers on the strength of an acceptance that never gets funded
 * is out of pocket for a booking that was never real, and that master
 * does not answer the next notification.
 *
 * So `accepted` says, in as many words, do not spend money yet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CUSTOMER'S NUMBER IS NOT IN THIS COMPONENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * It is fetched, per job, on a tap, from `booking_contact()` — which
 * refuses until that line is paid (migration 068). Holding it in the
 * list would mean shipping every customer's phone number to every
 * master's browser and hiding it in CSS.
 */

const STEPS = ['accepted', 'paid', 'in_progress', 'delivered', 'settled']

const STATE = {
  accepted: {
    label: 'Waiting for payment',
    tone: 'amber',
    icon: CircleDollarSign,
    lede: 'The customer is paying now. You are not confirmed until that goes through.',
    // The most important sentence on the partner side.
    warn: 'Do not buy anything for this job yet.',
  },
  paid: {
    label: 'Confirmed and paid',
    tone: 'forest',
    icon: Check,
    lede: 'The money is held with Sambramo. Call the customer to agree the details.',
  },
  in_progress: {
    label: 'Happening today',
    tone: 'forest',
    icon: PartyPopper,
    lede: 'Mark it done when you finish and your payout starts.',
  },
  delivered: {
    label: 'Done',
    tone: 'ink',
    icon: Check,
    lede: 'Your payout is released 24 hours after the event, once nothing is disputed.',
  },
  settled: {
    label: 'Paid out',
    tone: 'ink',
    icon: Check,
    lede: 'This one is closed.',
  },
}

const TONE = {
  amber:  { chip: 'bg-amber-100 text-amber-900',   ring: 'ring-amber-200',   bar: 'bg-amber-400'   },
  forest: { chip: 'bg-forest-100 text-forest-800', ring: 'ring-forest-200',  bar: 'bg-forest-500'  },
  ink:    { chip: 'bg-ink/[0.07] text-ink-soft',   ring: 'ring-ink/[0.08]',  bar: 'bg-ink/40'      },
}

export default function MyJobs({ vendorId }) {
  const [jobs, setJobs] = useState(null)
  const [missing, setMissing] = useState(false)

  const read = useCallback(async () => {
    const { data, error } = await supabase
      .from('partner_jobs')
      .select('*')
      .order('event_date', { ascending: true })

    // Migration 080 not applied yet. Said plainly rather than shown as a
    // crash — migrations here are pasted by hand, so this is a normal
    // state between a deploy and somebody opening the SQL editor.
    if (error && /does not exist|schema cache/i.test(error.message)) { setMissing(true); setJobs([]); return }
    setJobs(data ?? [])
  }, [])

  useEffect(() => {
    read()
    /* Realtime, with a poll under it.
     *
     * The state a master is waiting on — `accepted` becoming `paid` — is
     * written by the Razorpay webhook, on a server, with nothing in this
     * browser involved. Without this, a master stares at "Waiting for
     * payment" long after the customer has paid. */
    const ch = supabase
      .channel(`partner-jobs-${vendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_lines' }, read)
      .subscribe()
    const floor = setInterval(read, 20_000)
    return () => { clearInterval(floor); supabase.removeChannel(ch) }
  }, [read, vendorId])

  if (jobs === null) {
    return (
      <div className="flex items-center gap-2 rounded-[22px] bg-white p-4 text-[13px] text-ink-mute ring-1 ring-ink/[0.06]">
        <Loader2 size={15} className="animate-spin" /> Loading your jobs…
      </div>
    )
  }

  if (missing) {
    return (
      <div className="rounded-[22px] bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-[14px] font-extrabold text-amber-900">Your jobs list is not switched on yet</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/80">
          Migration 080 has not been applied to the database. Jobs you accept
          are safe — they are recorded — but they cannot be listed here until
          it is.
        </p>
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="rounded-[22px] bg-white p-5 text-center ring-1 ring-ink/[0.06]">
        <p className="text-[14px] font-extrabold text-ink">No jobs yet</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
          Jobs you accept appear here with the date, the area and what you earn.
        </p>
      </div>
    )
  }

  const live = jobs.filter(j => j.status !== 'settled')
  const past = jobs.filter(j => j.status === 'settled')

  return (
    <div className="space-y-3">
      {live.map(j => <JobCard key={j.line_id} job={j} onChange={read} />)}

      {past.length > 0 && (
        <>
          <p className="pt-3 type-overline text-ink-mute">Finished</p>
          {past.map(j => <JobCard key={j.line_id} job={j} onChange={read} />)}
        </>
      )}
    </div>
  )
}

function JobCard({ job, onChange }) {
  const meta = STATE[job.status] ?? STATE.accepted
  const tone = TONE[meta.tone]
  const Icon = meta.icon

  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(false)
  const [marking, setMarking] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [why, setWhy] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [problem, setProblem] = useState(null)

  const paid = ['paid', 'in_progress', 'delivered', 'settled'].includes(job.status)
  const step = Math.max(0, STEPS.indexOf(job.status))
  const eventDay = new Date(job.event_date + 'T00:00:00')
  const isToday = new Date().toDateString() === eventDay.toDateString()

  async function revealContact() {
    setLoadingContact(true); setProblem(null)
    const { data, error } = await supabase.rpc('booking_contact', { p_line_id: job.line_id })
    setLoadingContact(false)
    if (error) { setProblem(error.message); return }
    if (!data?.ok) { setProblem(data?.scan ?? 'Not available yet'); return }
    setContact(data.customer)
  }

  /**
   * A master pulling out of a job they accepted.
   *
   * ══════════════════════════════════════════════════════════════════
   * THE FRICTION IS THE FEATURE
   * ══════════════════════════════════════════════════════════════════
   *
   * This is the most damaging thing that can happen to a customer in
   * this product: they find out when nobody arrives. A one-tap cancel
   * makes it the easy option on a morning when a better job came along.
   *
   * So a reason is REQUIRED, at least a sentence, enforced in the
   * database (migration 081) and not merely in this form. It is stored,
   * and it is what an operator reads when deciding whether this master
   * keeps getting dispatched. That is the deterrent — not a fee, which
   * a master would simply price into the next quote.
   *
   * The customer is refunded in FULL. No ladder: they did nothing
   * wrong, and a partial refund for somebody else's cancellation is how
   * a marketplace loses a customer permanently.
   */
  async function cancelJob() {
    setCancelling(true); setProblem(null)
    const { data, error } = await supabase.rpc('partner_cancel_line', {
      p_line_id: job.line_id, p_reason: why.trim(),
    })
    setCancelling(false)
    if (error) { setProblem(error.message); return }
    if (!data?.ok) { setProblem(data?.scan ?? 'Could not cancel this job'); return }
    setCancelOpen(false); setWhy('')
    onChange?.()
  }

  async function markDone() {
    setMarking(true); setProblem(null)
    const { data, error } = await supabase.rpc('mark_line_delivered', { p_line_id: job.line_id })
    setMarking(false)
    if (error) { setProblem(error.message); return }
    if (!data?.ok) { setProblem(data?.scan ?? 'Could not mark this done'); return }
    onChange?.()
  }

  return (
    <article className={`rounded-[22px] bg-white p-4 ring-1 ${tone.ring}`}>
      {/* ── The ladder. Five segments, filled to where this job is ──
          A master should be able to see how far along a job is without
          reading a word, from across a shop counter. */}
      <div className="flex gap-1" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? tone.bar : 'bg-ink/[0.07]'}`} />
        ))}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15.5px] font-extrabold leading-tight text-ink">
            {job.service_name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12.5} className="text-ink-mute" />
              {eventDay.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              {isToday && <span className="ml-1 rounded-full bg-forest-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-forest-800">Today</span>}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12.5} className="text-ink-mute" />
              {job.area_label ?? job.city}
              {job.distance_m != null && <span className="text-ink-mute/80">· {(job.distance_m / 1000).toFixed(1)} km</span>}
            </span>
          </p>
        </div>

        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone.chip}`}>
          <Icon size={12} />
          {meta.label}
        </span>
      </div>

      {/* What it means, not what it is called. */}
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{meta.lede}</p>

      {meta.warn && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-extrabold leading-snug text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          {meta.warn}
        </p>
      )}

      {/* ── Earnings. Theirs, after the fee, never the customer's total ── */}
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-sunk/[0.05] px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-soft">
          <IndianRupee size={13} className="text-ink-mute" /> You earn
        </span>
        <span className="text-[15px] font-extrabold tabular-nums text-ink">
          {formatINR(Math.round(job.partner_amount_paise / 100))}
        </span>
      </div>

      {job.customer_note && (
        <p className="mt-2.5 rounded-2xl bg-plum-50/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-extrabold text-ink">They asked: </span>{job.customer_note}
        </p>
      )}

      {/* ── The customer, once and only once they have paid ──────────── */}
      {paid ? (
        contact ? (
          <div className="mt-3 rounded-2xl bg-forest-50 p-3.5 ring-1 ring-forest-200/70">
            <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-ink">
              <User size={14} className="text-forest-700" />{contact.name ?? 'Customer'}
            </p>
            {contact.phone && (
              <a href={`tel:${contact.phone}`}
                 className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-forest-600 py-2.5 text-[14px] font-extrabold text-white">
                <Phone size={15} /> Call {contact.phone}
              </a>
            )}
            {contact.address && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-extrabold text-ink">Where: </span>{contact.address}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={revealContact}
            disabled={loadingContact}
            className="mt-3 flex w-full items-center justify-between rounded-2xl bg-forest-600 px-4 py-3 text-[14px] font-extrabold text-white disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              {loadingContact ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
              Get the customer's details
            </span>
            <ChevronRight size={16} />
          </button>
        )
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 text-[12px] font-semibold text-ink-mute">
          <Lock size={13} />
          Their name and number unlock the moment payment is through.
        </p>
      )}

      {/* ── The one transition a master can make ─────────────────────── */}
      {(job.status === 'paid' || job.status === 'in_progress') && (
        <button
          onClick={markDone}
          disabled={marking}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[14px] font-extrabold text-plum-950 disabled:opacity-60"
        >
          {marking && <Loader2 size={15} className="animate-spin" />}
          Mark this done
        </button>
      )}

      {job.status === 'delivered' && (
        <p className="mt-2.5 text-center text-[11.5px] font-semibold text-ink-mute">
          Payout releases 24 hours after the event.
        </p>
      )}

      {/* ── Pulling out ────────────────────────────────────────────
          Only while there is still a job to pull out of. Deliberately
          a plain text link and not a button: it is available, it is
          not offered. */}
      {['accepted', 'paid', 'in_progress'].includes(job.status) && (
        cancelOpen ? (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
            <p className="text-[13px] font-extrabold text-amber-900">
              Cannot do this job any more?
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-amber-900/85">
              The customer is refunded in full and told straight away. Tell them
              why — this is read by Sambramo and it affects the jobs you are
              offered next.
            </p>
            <textarea
              value={why}
              onChange={e => setWhy(e.target.value)}
              rows={2}
              placeholder="My van broke down and I cannot reach Koramangala by 6pm…"
              className="mt-2 w-full resize-none rounded-xl bg-white p-2.5 text-[12.5px] text-ink outline-none ring-1 ring-amber-200 focus:ring-amber-400"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={cancelJob}
                disabled={cancelling || why.trim().length < 10}
                className="flex items-center gap-1.5 rounded-2xl bg-amber-600 px-3.5 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-50"
              >
                {cancelling && <Loader2 size={13} className="animate-spin" />}
                Cancel this job
              </button>
              <button
                onClick={() => { setCancelOpen(false); setWhy('') }}
                className="rounded-2xl px-3 py-2 text-[12.5px] font-bold text-ink-mute"
              >
                Keep it
              </button>
            </div>
            {why.trim().length > 0 && why.trim().length < 10 && (
              <p className="mt-1.5 text-[11.5px] font-semibold text-amber-800">
                A few more words — the customer will read this.
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setCancelOpen(true)}
            className="mt-2.5 w-full py-1.5 text-[11.5px] font-bold text-ink-mute underline-offset-2 hover:underline"
          >
            I can no longer do this job
          </button>
        )
      )}

      {problem && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] font-bold leading-snug text-amber-800">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />{problem}
        </p>
      )}
    </article>
  )
}
