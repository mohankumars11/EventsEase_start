import { useCallback, useEffect, useRef, useState } from 'react'
import PartnerEmptyState from '../partner/PartnerEmptyState'
import { apiUrl } from '../../lib/api'
import { Camera, Check, Clock, MapPin, X, Inbox, Sparkles, Timer, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { OFFER_CARD } from '../../config/instantBooking'
import { partnerDeductions } from '../../lib/instantPricing'
import { setupSpec } from '../../data/instantSetups'

/**
 * A job, and forty-five seconds to answer it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHO IS LOOKING AT THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A decorator in a van. One hand. Possibly at a traffic light. They will
 * give this card about five seconds, and the decision they are making is
 * "can I do this, and is it worth my Saturday".
 *
 * So the card is four facts in the order that decision is actually made:
 * trade, when, how far, what it pays. Everything else is below the fold
 * or absent.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE NUMBER IS WHAT REACHES THEIR BANK
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not the job value, and not the value less commission. TCS and TDS are
 * collected by the platform on the master's behalf (see config/legal.js)
 * and they are a THIRD slice — a master shown "You earn ₹10,540" who
 * receives ₹10,416 will conclude they were short-changed, and they will
 * be right to ask.
 *
 * The arithmetic is one tap away and almost nobody will open it. That is
 * fine: what matters is that the headline is true and the breakdown
 * exists for whoever wants it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS DELIBERATELY NOT HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * No customer name, no phone number, no street address. The feed this
 * reads (`partner_offer_feed`, migration 068) does not carry them — the
 * masking is a property of the view, not of this component, so a leak
 * would need a schema change rather than a forgotten prop.
 *
 * "Koramangala 5th Block · 1.2 km" is enough to judge the travel. A flat
 * number is not, and it is exactly what would let somebody turn up and
 * hand over a card. Details unlock when the customer pays.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "CONFIRMED ONCE PAID", SAID OUT LOUD
 * ══════════════════════════════════════════════════════════════════════
 *
 * Accepting does not move money. A master who clears a Saturday on an
 * unfunded acceptance and finds out later does not answer the next
 * notification — and supply is the scarce side of this marketplace. So
 * the card says so on its face rather than in a help page.
 */

function useSeconds(iso) {
  const [n, setN] = useState(() => left(iso))
  useEffect(() => {
    const t = setInterval(() => setN(left(iso)), 250)
    return () => clearInterval(t)
  }, [iso])
  return n
}
const left = iso => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))

function Breakdown({ share, hasPan }) {
  /* ── The share, not the quote ──────────────────────────────────────
     `dispatch_offers.partner_amount_paise` is what migration 084 copied
     off `booking_lines` — the customer's price with the platform fee
     ALREADY removed. This card put it through `partnerEarnings`, which
     takes a gross, so the fee came off twice and the top line called the
     result "Job value". `partnerDeductions` takes a share and only
     applies the two statutory slices, which is what is left to apply. */
  const d = partnerDeductions(share, { hasPan })
  const e = {
    lines: [
      { id: 'share', label: 'Your share of the job', paise: d.sharePaise, sign: '+' },
      { id: 'tcs',   label: 'TCS (GST)', paise: -d.tcsPaise, sign: '-', note: 'deposited for you' },
      { id: 'tds',   label: 'TDS',       paise: -d.tdsPaise, sign: '-',
        note: d.tdsApplies ? 'deposited for you' : 'waived — PAN on file' },
      { id: 'net',   label: 'To your account', paise: d.netPaise, sign: '=' },
    ],
  }
  return (
    <dl className="mt-3 space-y-1.5 rounded-[16px] bg-surface-sunk/[0.05] p-3 text-[12px]">
      {e.lines.map(l => (
        <div key={l.id} className="flex justify-between gap-3">
          <dt className={l.id === 'net' ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}>
            {l.label}
            {l.note && <span className="ml-1 font-medium text-ink-mute">· {l.note}</span>}
          </dt>
          <dd className={`tabular-nums ${l.id === 'net' ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}>
            {l.sign === '-' ? '−' : ''}{formatINR(Math.round(Math.abs(l.paise) / 100))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function OfferCard({ offer, onAnswer, busy, hasPan }) {
  const secs = useSeconds(offer.expires_at)
  const [open, setOpen] = useState(false)
  const spec = offer.service_id ? setupSpec('decor', 'standard') : null
  const net = partnerDeductions(offer.partner_amount_paise, { hasPan }).netPaise

  const urgent = secs <= 15

  return (
    <li className="rounded-[22px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-ink/[0.06]">
      <div className="flex items-center justify-between">
        <span className="type-overline text-saffron-700">New job</span>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${
            urgent ? 'bg-rose-100 text-rose-700' : 'bg-ink/[0.05] text-ink-soft'
          }`}
        >
          <Clock size={11} />
          {OFFER_CARD.urgent(secs)}
        </span>
      </div>

      <p className="mt-1.5 font-serif text-[20px] font-extrabold leading-tight text-ink">
        {offer.service_name}
      </p>

      <p className="mt-1 text-[12.5px] font-bold text-ink-soft">
        {new Date(offer.event_date).toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short',
        })}
        {offer.time_note && <> · {offer.time_note}</>}
        {offer.guest_count && <> · ~{offer.guest_count} guests</>}
      </p>

      {/* Area only. The view carries no street address. */}
      <p className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-ink-mute">
        <MapPin size={12} />
        {offer.area_label}
        {offer.distance_m != null && <> · {(offer.distance_m / 1000).toFixed(1)} km away</>}
      </p>

      {offer.customer_note && (
        <p className="mt-2 rounded-[14px] bg-surface-sunk/[0.05] p-2.5 text-[12.5px] leading-snug text-ink-soft">
          “{offer.customer_note}”
        </p>
      )}

      {offer.reference_photo_url && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-mute">
          <Camera size={12} /> Customer added a reference photo
        </p>
      )}

      {/* What "standard setup" means, on the master's side too — the same
          list the customer agreed to, so a dispute has one document. */}
      {offer.spec_mode === 'discuss' && spec && (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[11.5px] font-extrabold text-ink-soft">
            What is included
          </summary>
          <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
            {spec.includes.map(x => <li key={x}>+ {x}</li>)}
            {spec.excludes.map(x => <li key={x} className="text-ink-mute">− {x}</li>)}
          </ul>
        </details>
      )}

      <div className="mt-3.5 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">
            {OFFER_CARD.earn}
          </p>
          <p className="font-serif text-[26px] font-extrabold leading-none text-ink">
            {formatINR(Math.round(net / 100))}
          </p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-[11.5px] font-extrabold text-ink-mute underline underline-offset-2"
        >
          {open ? 'Hide' : 'Breakdown'}
        </button>
      </div>

      {open && <Breakdown share={offer.partner_amount_paise} hasPan={hasPan} />}

      <p className="mt-2 text-[11px] font-semibold text-ink-mute">
        {OFFER_CARD.provisional}
      </p>

      {/* Equal weight. Making Accept shout and Pass whisper would be the
          `interface_interference` pattern in config/legal.js. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={() => onAnswer(offer.offer_id, 'decline')}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink/[0.06] py-3 text-[14px] font-extrabold text-ink-soft transition active:scale-[0.99] disabled:opacity-40"
        >
          <X size={15} /> {OFFER_CARD.decline}
        </button>
        <button
          disabled={busy || secs === 0}
          onClick={() => onAnswer(offer.offer_id, 'accept')}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-forest-600 py-3 text-[14px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          <Check size={15} /> {OFFER_CARD.accept}
        </button>
      </div>
    </li>
  )
}

export default function OfferInbox({ vendorId, onOpenCalendar = null }) {
  const [offers, setOffers] = useState([])
  /* ── Whether TDS applies to this partner ───────────────────────────
     s.194-O waives it for a below-threshold individual with a PAN on
     file, and that is most of this supply base. Read from
     `partner_readiness`, which is security_invoker and exposes only the
     boolean — the PAN itself never comes to the client. Defaults to
     false, so a partner whose payout account is not filled in yet sees
     the lower figure and is surprised in their own favour. */
  const [hasPan, setHasPan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)
  const poll = useRef(null)

  const read = useCallback(async () => {
    if (!vendorId) return
    const { data } = await supabase
      .from('partner_offer_feed')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('status', 'OFFERED')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at')
    setOffers(data ?? [])
  }, [vendorId])

  useEffect(() => {
    let alive = true
    if (!vendorId) return
    supabase.from('partner_readiness')
      .select('pan_added').eq('vendor_id', vendorId).maybeSingle()
      .then(({ data }) => { if (alive) setHasPan(!!data?.pan_added) })
    return () => { alive = false }
  }, [vendorId])

  useEffect(() => {
    read()
    poll.current = setInterval(read, 2000)
    const channel = supabase
      .channel(`partner-${vendorId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_offers', filter: `vendor_id=eq.${vendorId}` },
        read)
      .subscribe()
    /* A push that landed while this screen was open.

       PushRouter turns a foreground notification into this event rather
       than navigating -- pulling somebody off the job they are reading
       because a second one arrived is worse than the two-second wait.
       The poll would catch it anyway; this just makes the row appear at
       the same moment the phone buzzes. */
    const onPush = () => read()
    window.addEventListener('sambramo:push', onPush)

    return () => {
      clearInterval(poll.current)
      supabase.removeChannel(channel)
      window.removeEventListener('sambramo:push', onPush)
    }
  }, [vendorId, read])

  async function answer(offerId, action) {
    setBusy(true)
    const fn = action === 'accept' ? 'accept_offer' : 'decline_offer'
    const args = action === 'accept' ? { p_offer_id: offerId } : { p_offer_id: offerId, p_reason: null }
    const { data, error } = await supabase.rpc(fn, args)
    setBusy(false)

    if (error) { setFlash('Something went wrong — try again'); return }

    // "Somebody else just took it" is the MAJORITY outcome with five
    // masters on every offer, not an error. It gets a calm sentence, not
    // a red banner.
    /* The customer is told, from here, after the database has decided.
     *
     * Not from a trigger: an HTTP call inside the transaction would hold
     * a row lock on the line while FCM answers, and a failed send would
     * roll back an acceptance that had already been won. The accept must
     * stand whether or not anybody can be told about it.
     *
     * Not awaited, and errors are swallowed on purpose. A master who
     * accepted a job must never see a spinner or a failure because a
     * notification did not go out — their booking is real either way,
     * and the customer's own board is subscribed to Realtime regardless.
     * This is the channel that reaches somebody who closed the app. */
    if (data?.ok && action === 'accept') {
      fetch(apiUrl('/api/notify-customer'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lineId: data.line_id ?? data.lineId, event: 'accepted' }),
      }).catch(() => {})
    }

    if (!data?.ok) {
      setFlash({
        taken:   'That one just went to another master',
        expired: 'That one timed out',
        lost:    'That one just went to another master',
      }[data?.reason] ?? 'That job is no longer available')
    } else if (action === 'accept') {
      setFlash('Accepted — confirmed once the customer pays')
    }
    read()
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-plum-800 via-plum-700 to-plum-500 p-5 text-white shadow-[0_18px_45px_rgba(61,20,111,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/70">
              <Sparkles size={13} /> Partner workspace
            </div>
            <h2 className="mt-2 text-[25px] font-black leading-[1.05] tracking-[-0.03em]">
              Work that fits your calendar.
            </h2>
            <p className="mt-2 max-w-[34rem] text-[12.5px] leading-relaxed text-white/80">
              Review live opportunities, see exactly what you earn, and respond before the window closes.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-right backdrop-blur">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/60">Live offers</p>
            <p className="mt-0.5 text-[24px] font-black tabular-nums">{offers.length}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
            <Timer size={14} className="text-white/75" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">Response</p>
            <p className="mt-0.5 text-[12px] font-extrabold">45 sec</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
            <CalendarDays size={14} className="text-white/75" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">Matching</p>
            <p className="mt-0.5 text-[12px] font-extrabold">Date + area</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
            <Check size={14} className="text-white/75" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">Your choice</p>
            <p className="mt-0.5 text-[12px] font-extrabold">Accept / Pass</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-[20px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">Now</p>
          <p className="mt-1 text-[13px] font-extrabold text-ink">New opportunities</p>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">Only matching work reaches this inbox.</p>
        </div>
        <div className="rounded-[20px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">Next</p>
          <p className="mt-1 text-[13px] font-extrabold text-ink">Your accepted jobs</p>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">Confirmed work stays visible below.</p>
        </div>
        <button type="button" onClick={onOpenCalendar}
          className="rounded-[20px] bg-plum-50 p-3.5 text-left ring-1 ring-plum-200/70 transition active:scale-[0.99]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Improve matching</p>
          <p className="mt-1 text-[13px] font-extrabold text-plum-900">Keep your calendar current →</p>
          <p className="mt-0.5 text-[11.5px] text-plum-800/70">Tell us where you are free.</p>
        </button>
      </div>

      {flash && (
        <p className="rounded-[16px] bg-surface-sunk/[0.06] p-3 text-center text-[12.5px] font-bold text-ink-soft">
          {typeof flash === 'string' ? flash : String(flash)}
        </p>
      )}

      {offers.length === 0 ? (
        <PartnerEmptyState
          data-empty="offers"
          icon={Inbox}
          title="No new opportunities yet"
          message="When a customer's date, service and area match yours, the request lands here for you to accept or decline."
          ctaLabel="Open my calendar"
          onCta={onOpenCalendar}
          footnote="We can only offer you days your calendar has spoken for. Where it says nothing, you are not in the running."
        />
      ) : (
        <ul className="space-y-3">
          {offers.map(o => (
            <OfferCard key={o.offer_id} offer={o} onAnswer={answer} busy={busy} hasPan={hasPan} />
          ))}
        </ul>
      )}
    </div>
  )
}